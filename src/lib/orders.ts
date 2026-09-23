import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmation, notifyAdminNewOrder } from '@/lib/email'
import type { Coupon, Order, OrderItem } from '@/lib/types'

/**
 * Logique métier des commandes, partagée par le tunnel d'achat,
 * le webhook KkiaPay et les actions d'administration.
 */

export interface CouponCheck {
  valid: boolean
  reason?: string
  coupon?: Coupon
  discountCents: number
}

/** Vérifie un code promo et calcule la remise correspondante. */
export async function validateCoupon(
  code: string,
  courseId: string,
  subtotalCents: number,
): Promise<CouponCheck> {
  if (!code) return { valid: false, discountCents: 0 }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code.trim())
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
  if (data.course_id && data.course_id !== courseId) {
    return { valid: false, reason: 'Ce code promo ne s’applique pas à cette formation.', discountCents: 0 }
  }

  const discount =
    data.discount_type === 'percent'
      ? Math.round((subtotalCents * data.discount_value) / 100)
      : data.discount_value

  return {
    valid: true,
    coupon: data,
    discountCents: Math.min(Math.max(0, discount), subtotalCents),
  }
}

/**
 * Passe une commande au statut « payée », ouvre les accès et envoie
 * la confirmation. Opération idempotente : rejouer le webhook plusieurs
 * fois n'ouvre pas deux fois l'accès et n'envoie pas deux e-mails.
 */
export async function fulfillOrder(
  orderId: string,
  options?: {
    /** Identifiant chez le prestataire : vente Chariow ou transaction KkiaPay. */
    transactionId?: string
    method?: 'chariow' | 'kkiapay' | 'manual' | 'bank_transfer'
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

  // Les accès sont ouverts AVANT que la commande ne passe à « payé ».
  //
  // L'ordre inverse rendait un échec irrécupérable : la commande était déjà
  // marquée payée, donc la relance du webhook ressortait aussitôt par le
  // garde-fou `alreadyPaid` ci-dessus et l'accès n'était jamais ouvert — le
  // client avait payé pour rien, sans trace d'erreur. L'upsert étant
  // idempotent, le rejouer est sans risque de double accès.
  const courseItems = (order.items ?? []).filter((i) => i.item_type === 'course' && i.course_id)

  if (order.user_id && courseItems.length) {
    const rows = courseItems.map((item) => ({
      user_id: order.user_id!,
      course_id: item.course_id!,
      order_id: order.id,
      state: 'active' as const,
      source: 'purchase',
    }))

    const { error: enrollError } = await supabase
      .from('enrollments')
      .upsert(rows, { onConflict: 'user_id,course_id', ignoreDuplicates: true })

    // Échec bloquant : la commande reste « en attente » et KkiaPay rejouera.
    if (enrollError) {
      console.error('[commande] ouverture d’accès échouée :', enrollError.message)
      return { ok: false, error: enrollError.message }
    }
  }

  const paidAt = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: paidAt,
      // La colonne dépend du prestataire : `kkiapay_transaction_id` reste
      // celle de l'historique, les ventes Chariow ont la leur.
      ...(options?.transactionId
        ? options.method === 'chariow'
          ? { chariow_sale_id: options.transactionId }
          : { kkiapay_transaction_id: options.transactionId }
        : {}),
      ...(options?.method ? { payment_method: options.method } : {}),
      ...(options?.validatedBy ? { validated_by: options.validatedBy } : {}),
    })
    .eq('id', orderId)
    .neq('status', 'paid') // garde-fou contre une double exécution concurrente

  if (updateError) {
    console.error('[commande] mise à jour échouée :', updateError.message)
    return { ok: false, error: updateError.message }
  }

  // Incrément du compteur du code promo
  if (order.coupon_id) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('redemptions')
      .eq('id', order.coupon_id)
      .maybeSingle<{ redemptions: number }>()

    if (coupon) {
      await supabase
        .from('coupons')
        .update({ redemptions: coupon.redemptions + 1 })
        .eq('id', order.coupon_id)
    }
  }

  await Promise.all([
    sendOrderConfirmation({
      to: order.customer_email,
      customerName: order.customer_name,
      reference: order.reference,
      items: (order.items ?? []).map((i) => ({ title: i.title_snapshot, price: i.unit_price_cents })),
      total: order.total_cents,
    }),
    notifyAdminNewOrder({
      reference: order.reference,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      total: order.total_cents,
      method: options?.method ?? order.payment_method,
      status: 'payée',
    }),
  ])

  await supabase.from('activity_log').insert({
    actor_id: options?.validatedBy ?? null,
    action: 'order.fulfilled',
    entity: 'order',
    entity_id: order.id,
    metadata: { reference: order.reference, method: options?.method ?? order.payment_method },
  })

  return { ok: true }
}

/** Retire les accès liés à une commande (remboursement, erreur). */
export async function revokeOrderAccess(orderId: string, newStatus: 'refunded' | 'cancelled') {
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, items:order_items(course_id, item_type)')
    .eq('id', orderId)
    .maybeSingle<{ id: string; user_id: string | null; items: { course_id: string | null; item_type: string }[] }>()

  if (!order) return { ok: false, error: 'Commande introuvable.' }

  await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)

  const courseIds = (order.items ?? [])
    .filter((i) => i.item_type === 'course' && i.course_id)
    .map((i) => i.course_id!)

  if (order.user_id && courseIds.length) {
    await supabase
      .from('enrollments')
      .update({ state: 'revoked' })
      .eq('user_id', order.user_id)
      .in('course_id', courseIds)
  }

  return { ok: true }
}
