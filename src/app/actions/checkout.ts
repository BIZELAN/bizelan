'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import {
  amountCovers,
  fulfillOrder,
  loadSellable,
  ownsSellable,
  validateCoupon,
  type SellableType,
} from '@/lib/orders'
import { softpay, verifyPayment } from '@/lib/saspay'
import { isKnownNetwork, normalizePhone } from '@/lib/saspay-networks'
import { splitName } from '@/lib/names'
import { sendPendingTransferNotice, notifyAdminNewOrder } from '@/lib/email'
import type { Order, SiteSettings } from '@/lib/types'

export interface CheckoutState {
  ok: boolean
  message?: string
  /** Renseigné quand la commande attend un paiement en ligne. */
  order?: { id: string; reference: string; totalCents: number }
  /**
   * Paiement poussé sur le téléphone du client : la page reste ouverte
   * pendant qu'il compose son code, et le tunnel interroge le statut.
   */
  push?: { paymentId: string; instructions: string | null }
  /**
   * Certains réseaux imposent leur page. Un même réseau peut basculer d'un
   * mode à l'autre sans préavis selon le routage : les deux sont traités.
   */
  checkoutUrl?: string
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

/** Nature de l'offre commandée. `courseSlug` reste accepté pour compatibilité. */
function readTarget(formData: FormData): { type: SellableType; slug: string } {
  const type = field(formData, 'itemType') === 'product' ? 'product' : 'course'
  const slug = field(formData, 'slug') || field(formData, 'courseSlug')
  return { type, slug }
}

function checkoutPath(type: SellableType, slug: string) {
  return type === 'product' ? `/commande/produit/${slug}` : `/commande/${slug}`
}

function ownedPath(type: SellableType, slug: string) {
  return type === 'product' ? `/compte/produits#${slug}` : `/compte/formations/${slug}`
}

/** Vérifie un code promo sans créer de commande (retour immédiat à l'écran). */
export async function checkCoupon(
  _prev: { valid: boolean; message: string; discountCents: number } | null,
  formData: FormData,
): Promise<{ valid: boolean; message: string; discountCents: number }> {
  const code = field(formData, 'code')
  if (!code) return { valid: false, message: '', discountCents: 0 }

  const { type, slug } = readTarget(formData)
  const item = await loadSellable(type, slug)
  if (!item) return { valid: false, message: 'Cette offre n’est plus disponible.', discountCents: 0 }

  // Le sous-total est relu en base : celui qu'envoyait le navigateur pouvait
  // être modifié, et la remise affichée ne correspondait plus à celle appliquée.
  const result = await validateCoupon(code, item, item.priceCents)

  return {
    valid: result.valid,
    message: result.valid
      ? `Code appliqué : -${result.discountCents.toLocaleString('fr-FR')} FCFA`
      : (result.reason ?? 'Code invalide.'),
    discountCents: result.discountCents,
  }
}

/**
 * Crée la commande puis oriente selon le montant et le moyen de paiement :
 *  · total nul (offre gratuite, code à 100 %) → accès ouvert immédiatement ;
 *  · SasPay → demande de validation poussée sur le téléphone du client, qui
 *    ne quitte pas le site ;
 *  · dépôt / virement → la commande attend la validation de l'administration.
 *
 * L'appel à SasPay part d'ICI, côté serveur : la clé `sk_live_…` autorise à
 * encaisser ET à virer des fonds, elle ne doit jamais atteindre le navigateur.
 */
export async function createOrder(
  _prev: CheckoutState | null,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await getCurrentUser()
  const { type, slug } = readTarget(formData)
  const method = field(formData, 'method') === 'bank_transfer' ? 'bank_transfer' : 'saspay'
  const couponCode = field(formData, 'coupon')

  if (!user) {
    redirect(`/connexion?suivant=${encodeURIComponent(checkoutPath(type, slug))}`)
  }

  const item = await loadSellable(type, slug)
  if (!item) {
    return {
      ok: false,
      message:
        type === 'product'
          ? 'Ce produit n’est plus disponible.'
          : 'Cette formation n’est plus disponible.',
    }
  }

  // Déjà acquis : inutile de repayer.
  if (await ownsSellable(user.id, item)) {
    redirect(ownedPath(type, item.slug))
  }

  // Complet ou délai écoulé : refusé ici même si la page a été laissée
  // ouverte, ou l'adresse du tunnel saisie directement.
  if (item.unavailableReason) return { ok: false, message: item.unavailableReason }

  const supabase = createAdminClient()

  const { data: settings } = await supabase
    .from('site_settings')
    .select('bank_transfer_instructions, payments_online_enabled, payments_transfer_enabled')
    .eq('id', 1)
    .maybeSingle<
      Pick<
        SiteSettings,
        'bank_transfer_instructions' | 'payments_online_enabled' | 'payments_transfer_enabled'
      >
    >()

  const subtotal = item.priceCents
  const check = couponCode ? await validateCoupon(couponCode, item, subtotal) : null
  const discount = check?.valid ? check.discountCents : 0
  const total = Math.max(0, subtotal - discount)
  const isFree = total === 0

  // Le moyen choisi doit être ouvert : un formulaire modifié à la main ne doit
  // pas permettre un dépôt que l'administration a désactivé.
  if (!isFree) {
    if (method === 'saspay' && settings && settings.payments_online_enabled === false) {
      return { ok: false, message: 'Le paiement Mobile Money est momentanément indisponible.' }
    }
    if (method === 'bank_transfer' && settings && settings.payments_transfer_enabled === false) {
      return { ok: false, message: 'Le paiement par dépôt est momentanément indisponible.' }
    }
  }

  const customerName = field(formData, 'name') || user.profile.full_name || user.email
  const customerPhone = field(formData, 'phone') || user.profile.phone || null

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      customer_name: customerName.slice(0, 200),
      customer_email: user.email,
      customer_phone: customerPhone ? customerPhone.slice(0, 40) : null,
      subtotal_cents: subtotal,
      discount_cents: discount,
      total_cents: total,
      currency: item.currency,
      coupon_id: check?.valid ? (check.coupon?.id ?? null) : null,
      coupon_code: check?.valid ? (check.coupon?.code ?? null) : null,
      status: isFree ? 'pending' : method === 'bank_transfer' ? 'awaiting_payment' : 'pending',
      payment_method: isFree ? 'free' : method,
    })
    .select('*')
    .single<Order>()

  if (error || !order) {
    console.error('[commande] création échouée :', error?.message)
    return { ok: false, message: 'La commande n’a pas pu être créée. Merci de réessayer.' }
  }

  // La ligne porte le montant NET réellement encaissé : c'est sur elle que
  // reposent les statistiques de ventes (`v_course_sales`, `v_product_sales`)
  // et l'historique existant. Le prix de catalogue se retrouve à l'affichage
  // en ajoutant la remise, portée par la commande.
  const { error: itemError } = await supabase.from('order_items').insert({
    order_id: order.id,
    item_type: item.type,
    course_id: item.type === 'course' ? item.id : null,
    product_id: item.type === 'product' ? item.id : null,
    title_snapshot: item.title,
    unit_price_cents: total,
    quantity: 1,
  })

  if (itemError) {
    // Sans ligne, la livraison n'ouvrirait aucun accès : on s'arrête ici
    // plutôt que d'encaisser pour rien.
    console.error('[commande] ligne de commande échouée :', itemError.message)
    await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id)
    return { ok: false, message: 'La commande n’a pas pu être créée. Merci de réessayer.' }
  }

  // Le téléphone renseigné ici sert aussi pour les relances.
  if (customerPhone && !user.profile.phone) {
    await supabase.from('bz_profiles').update({ phone: customerPhone }).eq('id', user.id)
  }

  /* ---------- Gratuit ---------------------------------------------------- */
  if (isFree) {
    const done = await fulfillOrder(order.id, { method: 'free' })
    if (!done.ok) {
      return { ok: false, message: 'L’accès n’a pas pu être ouvert. Merci de réessayer.' }
    }
    revalidatePath('/compte', 'layout')
    redirect(`/commande/confirmation/${order.reference}`)
  }

  /* ---------- Dépôt / virement ------------------------------------------ */
  if (method === 'bank_transfer') {
    await Promise.all([
      sendPendingTransferNotice({
        to: user.email,
        customerName,
        reference: order.reference,
        total,
        instructions: settings?.bank_transfer_instructions ?? null,
      }),
      notifyAdminNewOrder({
        reference: order.reference,
        customerName,
        customerEmail: user.email,
        total,
        method: 'bank_transfer',
        status: 'en attente de validation',
      }),
    ])

    revalidatePath('/compte/commandes')
    redirect(`/commande/confirmation/${order.reference}`)
  }

  /* ---------- Paiement SasPay ------------------------------------------- */
  const network = field(formData, 'network')
  if (!isKnownNetwork(network)) {
    await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id)
    return { ok: false, message: 'Choisissez votre opérateur mobile money.' }
  }

  const phone = normalizePhone(customerPhone ?? '')
  if (!phone) {
    await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id)
    return {
      ok: false,
      message: 'Numéro invalide. Saisissez vos dix chiffres, par exemple 01 97 50 50 50.',
    }
  }

  const { firstName, lastName } = splitName(customerName)

  const outcome = await softpay({
    // Nos montants sont en unités entières de franc CFA : la devise n'a pas
    // de sous-unité, et `total_cents` porte en réalité des francs.
    amount: total,
    currency: item.currency,
    network,
    email: user.email,
    firstName,
    lastName,
    phone,
    description: item.title.slice(0, 120),
    metadata: { order_id: order.id, order_reference: order.reference },
    // L'identifiant de commande sert de clé : un double envoi du formulaire,
    // ou un délai réseau suivi d'une reprise, ne peut pas débiter deux fois.
    idempotencyKey: order.id,
  })

  if (outcome.kind === 'error') {
    await supabase
      .from('orders')
      .update({ status: 'failed', admin_note: outcome.message.slice(0, 500) })
      .eq('id', order.id)
    return { ok: false, message: outcome.message }
  }

  // L'identifiant de paiement est enregistré AVANT toute confirmation : c'est
  // lui qui reliera le webhook à cette commande.
  const { error: linkError } = await supabase
    .from('orders')
    .update({ saspay_payment_id: outcome.paymentId, saspay_network: network })
    .eq('id', order.id)

  if (linkError) {
    console.error('[commande] appariement du paiement échoué :', linkError.message)
    return {
      ok: false,
      message: 'La commande n’a pas pu être reliée au paiement. Contactez-nous avant de réessayer.',
    }
  }

  const base = {
    ok: true as const,
    order: { id: order.id, reference: order.reference, totalCents: total },
  }

  return outcome.kind === 'redirect'
    ? { ...base, checkoutUrl: outcome.checkoutUrl }
    : { ...base, push: { paymentId: outcome.paymentId, instructions: outcome.instructions } }
}

/**
 * Relit l'état du paiement auprès de SasPay et ouvre l'accès s'il est réglé.
 *
 * Appelée en boucle par le tunnel pendant que le client compose son code.
 * Rien de ce que rapporte le navigateur n'est cru : l'état est relu avec la
 * clé serveur. Ce n'est PAS le canal de livraison principal — le webhook
 * l'est, parce qu'il survit à un onglet fermé.
 */
export async function confirmSaspayPayment(
  orderId: string,
): Promise<{ ok: boolean; pending?: boolean; message: string; reference?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: 'Vous devez être connecté.' }

  const supabase = createAdminClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, reference, total_cents, status, saspay_payment_id')
    .eq('id', orderId)
    .maybeSingle<
      Pick<Order, 'id' | 'user_id' | 'reference' | 'total_cents' | 'status' | 'saspay_payment_id'>
    >()

  // Une commande ne se consulte que par son titulaire : l'identifiant circule
  // dans le navigateur, il ne doit pas suffire à interroger celle d'un autre.
  if (!order || order.user_id !== user.id) return { ok: false, message: 'Commande introuvable.' }

  // Le webhook a pu arriver avant : c'est le cas normal quand tout va vite.
  if (order.status === 'paid') {
    return { ok: true, message: 'Paiement confirmé.', reference: order.reference }
  }
  if (!order.saspay_payment_id) {
    return {
      ok: false,
      message: 'Aucun paiement n’a été lancé pour cette commande.',
      reference: order.reference,
    }
  }

  const result = await verifyPayment(order.saspay_payment_id)

  if (!result.ok) {
    return {
      ok: false,
      pending: true,
      message:
        'Nous n’avons pas pu joindre le service de paiement pour vérifier. ' +
        'Si le montant a été débité, l’accès s’ouvrira dès la confirmation reçue.',
      reference: order.reference,
    }
  }

  if (result.status === 'SUCCESS') {
    if (!amountCovers(result.amount, order.total_cents)) {
      await flagAmountMismatch(order.id, result.amount, order.total_cents)
      return {
        ok: false,
        message:
          'Le montant reçu ne correspond pas à la commande. Notre équipe vérifie et revient vers vous.',
        reference: order.reference,
      }
    }

    const done = await fulfillOrder(order.id, {
      transactionId: order.saspay_payment_id,
      method: 'saspay',
    })
    if (!done.ok) {
      return {
        ok: false,
        message: 'Le paiement est confirmé mais l’accès n’a pas pu être ouvert. Contactez-nous.',
        reference: order.reference,
      }
    }
    revalidatePath('/compte', 'layout')
    return { ok: true, message: 'Paiement confirmé.', reference: order.reference }
  }

  if (result.status === 'FAILED' || result.status === 'CANCELLED') {
    await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id).neq('status', 'paid')
    return {
      ok: false,
      message: 'Le paiement n’a pas abouti. Vérifiez votre solde et le code saisi, puis réessayez.',
      reference: order.reference,
    }
  }

  // PENDING : le client n'a pas encore validé sur son téléphone.
  return {
    ok: false,
    pending: true,
    message: 'En attente de votre validation sur le téléphone.',
    reference: order.reference,
  }
}

/**
 * Consigne un encaissement inférieur au montant dû, sans ouvrir l'accès.
 * La commande reste « en cours » : l'administration tranche.
 */
async function flagAmountMismatch(orderId: string, received: unknown, due: number) {
  const supabase = createAdminClient()
  const note = `Montant reçu (${String(received)}) inférieur au montant dû (${due}). Accès non ouvert : à vérifier.`
  console.error('[saspay]', orderId, note)
  await supabase.from('orders').update({ admin_note: note }).eq('id', orderId)
  await supabase.from('activity_log').insert({
    action: 'order.amount_mismatch',
    entity: 'order',
    entity_id: orderId,
    metadata: { received, due },
  })
}
