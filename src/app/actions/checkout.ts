'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { validateCoupon } from '@/lib/orders'
import { createCheckout, normalizePhone, splitName } from '@/lib/chariow'
import { env } from '@/lib/env'
import { sendPendingTransferNotice, notifyAdminNewOrder } from '@/lib/email'
import type { Course, Order, SiteSettings } from '@/lib/types'

export interface CheckoutState {
  ok: boolean
  message?: string
  /** Renseigné quand la commande attend un paiement en ligne. */
  order?: { id: string; reference: string; totalCents: number }
  /**
   * Page de paiement Chariow, à ouvrir dans une fenêtre secondaire.
   *
   * Elle ne peut pas être intégrée en iframe : le prestataire de Chariow
   * répond `Content-Security-Policy: frame-ancestors 'none'`, une protection
   * anti-détournement de clic. Une fenêtre secondaire est donc ce qui
   * s'approche le plus de « ne pas quitter le site » — la page du site reste
   * ouverte et reprend la main au retour.
   */
  checkoutUrl?: string
  /** Identifiant de la vente Chariow, pour interroger son état au retour. */
  saleId?: string
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
 *  · Chariow → ouverture d'une session de paiement, le client finalise sur la
 *    page sécurisée de Chariow, ouverte dans une fenêtre secondaire pour que
 *    notre page reste affichée derrière.
 *  · Dépôt / virement → la commande passe « awaiting_payment », validation
 *    manuelle par l'administration.
 *
 * La session Chariow est ouverte ICI, côté serveur : la clé `sk_…` donne accès
 * à la boutique entière et ne doit jamais atteindre le navigateur, qui ne
 * reçoit qu'une URL de paiement à usage unique.
 */
export async function createOrder(
  _prev: CheckoutState | null,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await getCurrentUser()
  const courseSlug = field(formData, 'courseSlug')
  const method = field(formData, 'method') === 'bank_transfer' ? 'bank_transfer' : 'chariow'
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

  /* ---------- Paiement Chariow --------------------------------------- */

  if (!course.chariow_product_id) {
    // Sans appariement, aucun paiement n'est possible : Chariow vend SES
    // produits. On le dit franchement plutôt que de laisser l'API répondre
    // « produit introuvable » au client.
    console.error('[commande] formation sans produit Chariow :', course.slug)
    await supabase
      .from('orders')
      .update({ status: 'failed', admin_note: 'Aucun produit Chariow apparié à cette formation.' })
      .eq('id', order.id)
    return {
      ok: false,
      message:
        'Le paiement en ligne n’est pas encore configuré pour cette formation. ' +
        'Choisissez le dépôt bancaire, ou contactez-nous.',
    }
  }

  const { firstName, lastName } = splitName(customerName)
  const phone = normalizePhone(customerPhone ?? '')

  if (!phone) {
    return {
      ok: false,
      message: 'Un numéro de téléphone est nécessaire pour le paiement en ligne.',
    }
  }

  const outcome = await createCheckout({
    productId: course.chariow_product_id,
    email: user.email,
    firstName,
    lastName,
    phoneNumber: phone,
    phoneCountry: 'BJ',
    redirectUrl: `${env.siteUrl}/commande/confirmation/${order.reference}`,
    // Le code promo est transmis à Chariow, qui applique SA remise : la nôtre
    // ne s'applique pas à un encaissement qu'il maîtrise.
    ...(check?.valid && check.coupon ? { discountCode: check.coupon.code } : {}),
    metadata: { order_id: order.id, order_reference: order.reference },
  })

  if (outcome.step === 'error') {
    await supabase
      .from('orders')
      .update({ status: 'failed', admin_note: outcome.message.slice(0, 500) })
      .eq('id', order.id)
    return { ok: false, message: outcome.message }
  }

  // Produit gratuit chez Chariow : rien à encaisser, l'accès s'ouvre aussitôt.
  if (outcome.step === 'completed' || outcome.step === 'already_purchased') {
    const { fulfillOrder } = await import('@/lib/orders')
    await supabase
      .from('orders')
      .update({ chariow_sale_id: outcome.saleId ?? null })
      .eq('id', order.id)
    await fulfillOrder(order.id, {
      transactionId: outcome.saleId ?? undefined,
      method: 'chariow',
    })
    revalidatePath('/compte', 'layout')
    redirect(`/commande/confirmation/${order.reference}`)
  }

  // L'identifiant de vente est enregistré MAINTENANT, avant tout paiement :
  // c'est lui qui reliera le webhook à cette commande. `custom_metadata` ne
  // peut pas y suffire — l'API ne le restitue pas sur la lecture d'une vente.
  const { error: linkError } = await supabase
    .from('orders')
    .update({ chariow_sale_id: outcome.saleId })
    .eq('id', order.id)

  if (linkError) {
    console.error('[commande] appariement de la vente échoué :', linkError.message)
    return {
      ok: false,
      message: 'La commande n’a pas pu être reliée au paiement. Merci de réessayer.',
    }
  }

  return {
    ok: true,
    order: { id: order.id, reference: order.reference, totalCents: total },
    checkoutUrl: outcome.checkoutUrl,
    saleId: outcome.saleId,
  }
}

/**
 * Interroge l'état d'une vente Chariow et ouvre l'accès si elle est réglée.
 *
 * Appelée depuis le navigateur quand la fenêtre de paiement se referme, mais
 * rien de ce que rapporte le navigateur n'est cru : l'état est relu auprès de
 * Chariow avec la clé serveur.
 *
 * Ce n'est PAS le canal principal de livraison — le webhook l'est, parce qu'il
 * survit à un client qui ferme son onglet. Cette fonction sert à ne pas faire
 * patienter quelqu'un dont le paiement est déjà passé.
 */
export async function confirmChariowPayment(
  orderId: string,
): Promise<{ ok: boolean; pending?: boolean; message: string; reference?: string }> {
  const { getSale } = await import('@/lib/chariow')
  const { fulfillOrder } = await import('@/lib/orders')

  const supabase = createAdminClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, reference, total_cents, status, chariow_sale_id')
    .eq('id', orderId)
    .maybeSingle<Pick<Order, 'id' | 'reference' | 'total_cents' | 'status' | 'chariow_sale_id'>>()

  if (!order) return { ok: false, message: 'Commande introuvable.' }

  // Le webhook a pu arriver avant le retour du client : c'est le cas normal.
  if (order.status === 'paid') {
    return { ok: true, message: 'Paiement confirmé.', reference: order.reference }
  }
  if (!order.chariow_sale_id) {
    return { ok: false, message: 'Aucun paiement n’a été ouvert pour cette commande.', reference: order.reference }
  }

  const sale = await getSale(order.chariow_sale_id)

  if (!sale.ok) {
    return {
      ok: false,
      pending: true,
      message:
        'Nous n’avons pas pu joindre Chariow pour vérifier le paiement. ' +
        'Si le montant a été débité, l’accès s’ouvrira dès la confirmation reçue.',
      reference: order.reference,
    }
  }

  if (sale.status === 'completed') {
    const result = await fulfillOrder(order.id, {
      transactionId: order.chariow_sale_id,
      method: 'chariow',
    })
    if (!result.ok) {
      return {
        ok: false,
        message: 'Le paiement est confirmé mais l’accès n’a pas pu être ouvert. Contactez-nous.',
        reference: order.reference,
      }
    }
    revalidatePath('/compte', 'layout')
    return { ok: true, message: 'Paiement confirmé.', reference: order.reference }
  }

  if (sale.status === 'failed') {
    await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id)
    return { ok: false, message: 'Le paiement n’a pas abouti.', reference: order.reference }
  }

  // `awaiting_payment` : le client a fermé la fenêtre sans aller au bout, ou
  // l'opérateur mobile n'a pas encore confirmé. La commande reste en attente.
  return {
    ok: false,
    pending: true,
    message: 'Le paiement n’est pas encore confirmé. Vous recevrez un e-mail dès qu’il le sera.',
    reference: order.reference,
  }
}
