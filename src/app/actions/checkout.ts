'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { validateCoupon } from '@/lib/orders'
import { softpay } from '@/lib/saspay'
import { isKnownNetwork, normalizePhone } from '@/lib/saspay-networks'
import { splitName } from '@/lib/names'
import { env } from '@/lib/env'
import { sendPendingTransferNotice, notifyAdminNewOrder } from '@/lib/email'
import type { Course, Order, SiteSettings } from '@/lib/types'

export interface CheckoutState {
  ok: boolean
  message?: string
  /** Renseigné quand la commande attend un paiement en ligne. */
  order?: { id: string; reference: string; totalCents: number }
  /**
   * Paiement poussé sur le téléphone du client.
   *
   * C'est le cas des trois réseaux béninois : la page reste ouverte pendant
   * qu'il compose son code, et le tunnel interroge le statut. C'est ce que
   * Chariow ne permettait pas — sa page de paiement refusait d'être intégrée.
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

/** Vérifie un code promo sans créer de commande (retour immédiat à l'écran). */
export async function checkCoupon(
  _prev: { valid: boolean; message: string; discountCents: number } | null,
  formData: FormData,
): Promise<{ valid: boolean; message: string; discountCents: number }> {
  const code = field(formData, 'code')
  const courseId = field(formData, 'courseId')
  const subtotal = Number(field(formData, 'subtotal') || 0)

  if (!code) return { valid: false, message: '', discountCents: 0 }

  const result = await validateCoupon(code, courseId, subtotal)

  return {
    valid: result.valid,
    message: result.valid
      ? `Code appliqué : -${result.discountCents.toLocaleString('fr-FR')} FCFA`
      : (result.reason ?? 'Code invalide.'),
    discountCents: result.discountCents,
  }
}

/**
 * Crée la commande puis oriente selon le moyen de paiement :
 *  · SasPay → une demande de validation est poussée sur le téléphone du
 *    client. La page reste ouverte pendant qu'il compose son code : c'est ce
 *    qui avait été demandé dès le départ, et que Chariow ne pouvait pas tenir.
 *  · Dépôt / virement → la commande passe « awaiting_payment », validation
 *    manuelle par l'administration.
 *
 * L'appel part d'ICI, côté serveur : la clé `sk_live_…` autorise à encaisser
 * ET à virer des fonds, elle ne doit jamais atteindre le navigateur.
 */
export async function createOrder(
  _prev: CheckoutState | null,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await getCurrentUser()
  const courseSlug = field(formData, 'courseSlug')
  const method = field(formData, 'method') === 'bank_transfer' ? 'bank_transfer' : 'saspay'
  const couponCode = field(formData, 'coupon')

  if (!user) {
    redirect(`/connexion?suivant=${encodeURIComponent(`/commande/${courseSlug}`)}`)
  }

  const supabase = createAdminClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', courseSlug)
    .eq('status', 'published')
    .maybeSingle<Course>()

  if (!course) {
    return { ok: false, message: 'Cette formation n’est plus disponible.' }
  }

  // Déjà inscrit : inutile de repayer
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .in('state', ['active', 'completed'])
    .maybeSingle()

  if (existing) {
    redirect(`/compte/formations/${course.slug}`)
  }

  const subtotal = course.price_cents
  const check = couponCode ? await validateCoupon(couponCode, course.id, subtotal) : null
  const discount = check?.valid ? check.discountCents : 0
  const total = Math.max(0, subtotal - discount)

  const customerName = field(formData, 'name') || user.profile.full_name || user.email
  const customerPhone = field(formData, 'phone') || user.profile.phone || null

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      customer_name: customerName,
      customer_email: user.email,
      customer_phone: customerPhone,
      subtotal_cents: subtotal,
      discount_cents: discount,
      total_cents: total,
      currency: course.currency,
      coupon_id: check?.valid ? (check.coupon?.id ?? null) : null,
      coupon_code: check?.valid ? (check.coupon?.code ?? null) : null,
      status: method === 'bank_transfer' ? 'awaiting_payment' : 'pending',
      payment_method: method,
    })
    .select('*')
    .single<Order>()

  if (error || !order) {
    console.error('[commande] création échouée :', error?.message)
    return { ok: false, message: 'La commande n’a pas pu être créée. Merci de réessayer.' }
  }

  const { error: itemError } = await supabase.from('order_items').insert({
    order_id: order.id,
    item_type: 'course',
    course_id: course.id,
    title_snapshot: course.title,
    unit_price_cents: total,
    quantity: 1,
  })

  if (itemError) {
    console.error('[commande] ligne de commande échouée :', itemError.message)
  }

  // Le téléphone renseigné ici sert aussi pour les relances
  if (customerPhone && !user.profile.phone) {
    await supabase.from('bz_profiles').update({ phone: customerPhone }).eq('id', user.id)
  }

  if (method === 'bank_transfer') {
    const { data: settings } = await supabase
      .from('site_settings')
      .select('bank_transfer_instructions')
      .eq('id', 1)
      .maybeSingle<Pick<SiteSettings, 'bank_transfer_instructions'>>()

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
        method: 'Dépôt / virement',
        status: 'en attente de validation',
      }),
    ])

    revalidatePath('/compte/commandes')
    redirect(`/commande/confirmation/${order.reference}`)
  }

  /* ---------- Paiement SasPay ----------------------------------------- */

  const network = field(formData, 'network')
  if (!isKnownNetwork(network)) {
    return { ok: false, message: 'Choisissez votre opérateur mobile money.' }
  }

  const phone = normalizePhone(customerPhone ?? '')
  if (!phone) {
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
    currency: course.currency,
    network,
    email: user.email,
    firstName,
    lastName,
    phone,
    description: course.title.slice(0, 120),
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
 * clé serveur, et la documentation insiste — « toujours l'état réel côté
 * gateway, jamais confiance dans un statut mémorisé ».
 *
 * Ce n'est PAS le canal de livraison principal : le webhook l'est, parce
 * qu'il survit à un client qui ferme son onglet. Celle-ci évite de faire
 * patienter quelqu'un dont le paiement vient d'aboutir.
 */
export async function confirmSaspayPayment(
  orderId: string,
): Promise<{ ok: boolean; pending?: boolean; message: string; reference?: string }> {
  const { verifyPayment } = await import('@/lib/saspay')
  const { fulfillOrder } = await import('@/lib/orders')

  const supabase = createAdminClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, reference, total_cents, status, saspay_payment_id')
    .eq('id', orderId)
    .maybeSingle<Pick<Order, 'id' | 'reference' | 'total_cents' | 'status' | 'saspay_payment_id'>>()

  if (!order) return { ok: false, message: 'Commande introuvable.' }

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
        'Nous n’avons pas pu joindre SasPay pour vérifier le paiement. ' +
        'Si le montant a été débité, l’accès s’ouvrira dès la confirmation reçue.',
      reference: order.reference,
    }
  }

  if (result.status === 'SUCCESS') {
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
    await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id)
    return {
      ok: false,
      message:
        'Le paiement n’a pas abouti. Vérifiez votre solde et le code saisi, puis réessayez.',
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
