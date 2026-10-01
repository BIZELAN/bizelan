import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmation, notifyAdminNewOrder } from '@/lib/email'
import { payablePrice } from '@/lib/utils'
import type { Coupon, Order, OrderItem } from '@/lib/types'

/**
 * Logique métier des commandes, partagée par le tunnel d'achat, le webhook
 * SasPay et les actions d'administration.
 *
 * Une commande porte des lignes de deux natures vendables : une FORMATION
 * (ouvre une inscription) ou un PRODUIT digital (ouvre un achat donnant accès
 * aux fichiers). Tout ce qui suit traite les deux de la même façon.
 */

export type SellableType = 'course' | 'product'

export interface Sellable {
  type: SellableType
  id: string
  slug: string
  title: string
  /** Montant dû avant remise : 0 pour une offre gratuite. */
  priceCents: number
  currency: string
}

/** Offre publiée et achetable, ou `null`. */
export async function loadSellable(type: SellableType, slug: string): Promise<Sellable | null> {
  if (!slug) return null
  const supabase = createAdminClient()
  const table = type === 'course' ? 'courses' : 'products'

  const { data } = await supabase
    .from(table)
    .select('id, slug, title, pricing, price_cents, currency')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle<{
      id: string
      slug: string
      title: string
      pricing: string | null
      price_cents: number | null
      currency: string | null
    }>()

  if (!data) return null
  return {
    type,
    id: data.id,
    slug: data.slug,
    title: data.title,
    priceCents: payablePrice(data),
    currency: data.currency || 'XOF',
  }
}

/** L'utilisateur possède-t-il déjà cette offre ? */
export async function ownsSellable(userId: string, item: Pick<Sellable, 'type' | 'id'>) {
  const supabase = createAdminClient()
  if (item.type === 'course') {
    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', item.id)
      .in('state', ['active', 'completed'])
      .maybeSingle()
    return Boolean(data)
  }
  const { data } = await supabase
    .from('product_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', item.id)
    .eq('state', 'active')
    .maybeSingle()
  return Boolean(data)
}

/* ------------------------------------------------------------------ */
/* Codes promo                                                         */
/* ------------------------------------------------------------------ */

export interface CouponCheck {
  valid: boolean
  reason?: string
  coupon?: Coupon
  discountCents: number
}

/**
 * Vérifie un code promo pour une offre donnée et calcule la remise.
 *
 * Un code vise une formation, un produit, ou — quand les deux sont vides —
 * tout le catalogue.
 */
export async function validateCoupon(
  code: string,
  target: { type: SellableType; id: string },
  subtotalCents: number,
): Promise<CouponCheck> {
  const clean = code.trim()
  if (!clean) return { valid: false, discountCents: 0 }

  const supabase = createAdminClient()
  // `ilike` sans joker revient à une égalité insensible à la casse ; les
  // caractères `%` et `_` d'une saisie sont neutralisés pour qu'ils ne
  // deviennent pas des jokers.
  const { data } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', clean.replace(/[%_\\]/g, (c) => `\\${c}`))
    .maybeSingle<Coupon>()

  if (!data || !data.active) {
    return { valid: false, reason: 'Ce code promo n’existe pas ou n’est plus actif.', discountCents: 0 }
  }

  const now = new Date()
  if (data.starts_at && new Date(data.starts_at) > now) {
    return { valid: false, reason: 'Ce code promo n’est pas encore actif.', discountCents: 0 }
  }
  if (data.ends_at && new Date(data.ends_at) < now) {
    return { valid: false, reason: 'Ce code promo a expiré.', discountCents: 0 }
  }
  if (data.max_redemptions !== null && data.redemptions >= data.max_redemptions) {
    return { valid: false, reason: 'Ce code promo a atteint sa limite d’utilisation.', discountCents: 0 }
  }

  const scopedToCourse = Boolean(data.course_id)
  const scopedToProduct = Boolean(data.product_id)
  const matches =
    (!scopedToCourse && !scopedToProduct) ||
    (target.type === 'course' && data.course_id === target.id) ||
    (target.type === 'product' && data.product_id === target.id)

  if (!matches) {
    return {
      valid: false,
      reason:
        target.type === 'course'
          ? 'Ce code promo ne s’applique pas à cette formation.'
          : 'Ce code promo ne s’applique pas à ce produit.',
      discountCents: 0,
    }
  }

  if (subtotalCents <= 0) {
    return { valid: false, reason: 'Cette offre est déjà gratuite.', discountCents: 0 }
  }

  const value = Math.max(0, data.discount_value)
  const discount =
    data.discount_type === 'percent'
      ? Math.round((subtotalCents * Math.min(100, value)) / 100)
      : value

  return {
    valid: true,
    coupon: data,
    discountCents: Math.min(discount, subtotalCents),
  }
}

/* ------------------------------------------------------------------ */
/* Montant encaissé                                                    */
/* ------------------------------------------------------------------ */

/**
 * Le montant rapporté par la passerelle couvre-t-il le montant dû ?
 *
 * Un montant absent n'est pas un refus : certaines réponses ne le portent
 * pas, et la commande a été créée par nous avec le bon montant. Un montant
 * présent et INFÉRIEUR, en revanche, ne doit jamais ouvrir l'accès — c'est
 * la parade à un paiement dont le montant aurait été altéré en route.
 */
export function amountCovers(received: number | string | null | undefined, dueCents: number) {
  if (received === null || received === undefined || received === '') return true
  const value = Number(received)
  if (!Number.isFinite(value)) return true
  // Tolérance d'un franc pour les arrondis de la représentation décimale.
  return Math.round(value) + 1 >= dueCents
}

/* ------------------------------------------------------------------ */
/* Livraison                                                           */
/* ------------------------------------------------------------------ */

type FulfillMethod = 'saspay' | 'chariow' | 'kkiapay' | 'manual' | 'bank_transfer' | 'free'

/**
 * Passe une commande au statut « payée », ouvre les accès et envoie la
 * confirmation. Idempotente : rejouer le webhook n'ouvre pas deux fois
 * l'accès et n'envoie pas deux e-mails.
 */
export async function fulfillOrder(
  orderId: string,
  options?: {
    /** Identifiant chez le prestataire qui a encaissé. */
    transactionId?: string
    method?: FulfillMethod
    validatedBy?: string
  },
): Promise<{ ok: boolean; alreadyPaid?: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', orderId)
    .maybeSingle<Order & { items: OrderItem[] }>()

  if (!order) return { ok: false, error: 'Commande introuvable.' }
  if (order.status === 'paid') return { ok: true, alreadyPaid: true }

  // Les accès sont ouverts AVANT que la commande ne passe à « payée ».
  //
  // L'ordre inverse rendait un échec irrécupérable : la commande déjà marquée
  // payée, la relance du webhook ressortait aussitôt par le garde-fou
  // `alreadyPaid` et l'accès n'était jamais ouvert. Les écritures ci-dessous
  // sont des `upsert` : les rejouer est sans risque de double accès.
  const items = order.items ?? []
  const courseItems = items.filter((i) => i.item_type === 'course' && i.course_id)
  const productItems = items.filter((i) => i.item_type === 'product' && i.product_id)
  const source = options?.method === 'free' ? 'free' : 'purchase'

  if (order.user_id && courseItems.length) {
    // Un parcours déjà TERMINÉ n'est pas rétrogradé en « actif » : on ne
    // rouvre que ce qui n'existe pas ou a été retiré.
    const { data: existing } = await supabase
      .from('enrollments')
      .select('course_id, state')
      .eq('user_id', order.user_id)
      .in(
        'course_id',
        courseItems.map((i) => i.course_id!),
      )
    const completed = new Set(
      (existing ?? []).filter((e) => e.state === 'completed').map((e) => e.course_id as string),
    )
    const rows = courseItems
      .filter((item) => !completed.has(item.course_id!))
      .map((item) => ({
        user_id: order.user_id!,
        course_id: item.course_id!,
        order_id: order.id,
        state: 'active' as const,
        source,
      }))

    const { error } = rows.length
      ? await supabase.from('enrollments').upsert(rows, { onConflict: 'user_id,course_id' })
      : { error: null }
    // Échec bloquant : la commande reste en attente et le webhook rejouera.
    if (error) {
      console.error('[commande] ouverture d’accès (formation) échouée :', error.message)
      return { ok: false, error: error.message }
    }
  }

  if (order.user_id && productItems.length) {
    const { error } = await supabase.from('product_purchases').upsert(
      productItems.map((item) => ({
        user_id: order.user_id!,
        product_id: item.product_id!,
        order_id: order.id,
        state: 'active' as const,
        source,
      })),
      { onConflict: 'user_id,product_id' },
    )
    if (error) {
      console.error('[commande] ouverture d’accès (produit) échouée :', error.message)
      return { ok: false, error: error.message }
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      // La colonne dépend du prestataire. Les anciennes restent : les
      // commandes déjà encaissées les portent, et les effacer ferait perdre
      // la trace de paiements bien réels.
      ...(options?.transactionId ? transactionColumn(options) : {}),
      ...(options?.method ? { payment_method: options.method } : {}),
      ...(options?.validatedBy ? { validated_by: options.validatedBy } : {}),
    })
    .eq('id', orderId)
    .neq('status', 'paid') // garde-fou contre une double exécution concurrente
    .select('id')

  if (updateError) {
    console.error('[commande] mise à jour échouée :', updateError.message)
    return { ok: false, error: updateError.message }
  }

  // Une exécution concurrente est passée juste avant : elle a déjà compté le
  // code promo et envoyé les e-mails.
  if (!updated || updated.length === 0) return { ok: true, alreadyPaid: true }

  if (order.coupon_id) {
    const { error } = await supabase.rpc('bz_redeem_coupon', { p_coupon: order.coupon_id })
    if (error) console.error('[commande] compteur du code promo :', error.message)
  }

  const method = options?.method ?? order.payment_method
  await Promise.all([
    sendOrderConfirmation({
      to: order.customer_email,
      customerName: order.customer_name,
      reference: order.reference,
      items: items.map((i) => ({ title: i.title_snapshot, price: i.unit_price_cents })),
      total: order.total_cents,
      hasCourses: courseItems.length > 0,
      hasProducts: productItems.length > 0,
    }),
    // Une commande gratuite n'appelle aucune action : on épargne la boîte de
    // réception de l'administration.
    method === 'free'
      ? Promise.resolve(false)
      : notifyAdminNewOrder({
          reference: order.reference,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          total: order.total_cents,
          method,
          status: 'payée',
        }),
  ])

  await supabase.from('activity_log').insert({
    actor_id: options?.validatedBy ?? null,
    action: 'order.fulfilled',
    entity: 'order',
    entity_id: order.id,
    metadata: { reference: order.reference, method },
  })

  return { ok: true }
}

/** Colonne où loger l'identifiant du prestataire qui a encaissé. */
function transactionColumn(options: {
  transactionId?: string
  method?: FulfillMethod
}): Record<string, string | undefined> {
  if (options.method === 'saspay') return { saspay_payment_id: options.transactionId }
  if (options.method === 'chariow') return { chariow_sale_id: options.transactionId }
  if (options.method === 'kkiapay') return { kkiapay_transaction_id: options.transactionId }
  // Dépôt, virement, gratuit : la référence libre suffit.
  return { payment_reference: options.transactionId }
}

/** Retire les accès liés à une commande (remboursement, annulation). */
export async function revokeOrderAccess(orderId: string, newStatus: 'refunded' | 'cancelled') {
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, items:order_items(course_id, product_id, item_type)')
    .eq('id', orderId)
    .maybeSingle<{
      id: string
      user_id: string | null
      items: { course_id: string | null; product_id: string | null; item_type: string }[]
    }>()

  if (!order) return { ok: false, error: 'Commande introuvable.' }

  const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  if (error) return { ok: false, error: error.message }

  const courseIds = (order.items ?? [])
    .filter((i) => i.item_type === 'course' && i.course_id)
    .map((i) => i.course_id!)
  const productIds = (order.items ?? [])
    .filter((i) => i.item_type === 'product' && i.product_id)
    .map((i) => i.product_id!)

  if (order.user_id && courseIds.length) {
    await supabase
      .from('enrollments')
      .update({ state: 'revoked' })
      .eq('user_id', order.user_id)
      .in('course_id', courseIds)
  }
  if (order.user_id && productIds.length) {
    await supabase
      .from('product_purchases')
      .update({ state: 'revoked' })
      .eq('user_id', order.user_id)
      .in('product_id', productIds)
  }

  return { ok: true }
}
