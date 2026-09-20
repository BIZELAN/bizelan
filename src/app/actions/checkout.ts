'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { validateCoupon } from '@/lib/orders'
import { sendPendingTransferNotice, notifyAdminNewOrder } from '@/lib/email'
import type { Course, Order, SiteSettings } from '@/lib/types'

export interface CheckoutState {
  ok: boolean
  message?: string
  /** Renseigné quand la commande attend un paiement Mobile Money. */
  order?: { id: string; reference: string; totalCents: number }
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
 *  · Mobile Money → la commande reste « pending », le widget KkiaPay s'ouvre
 *  · Dépôt / virement → la commande passe « awaiting_payment », validation manuelle
 */
export async function createOrder(
  _prev: CheckoutState | null,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await getCurrentUser()
  const courseSlug = field(formData, 'courseSlug')
  const method = field(formData, 'method') === 'bank_transfer' ? 'bank_transfer' : 'kkiapay'
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

  return {
    ok: true,
    order: { id: order.id, reference: order.reference, totalCents: total },
  }
}

/**
 * Vérifie une transaction KkiaPay après retour du widget.
 * Appelée depuis le navigateur, mais toute la vérification est serveur.
 */
export async function confirmKkiapayPayment(
  orderId: string,
  transactionId: string,
): Promise<{ ok: boolean; message: string; reference?: string }> {
  const { verifyTransaction } = await import('@/lib/kkiapay')
  const { fulfillOrder } = await import('@/lib/orders')

  const supabase = createAdminClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, reference, total_cents, status')
    .eq('id', orderId)
    .maybeSingle<Pick<Order, 'id' | 'reference' | 'total_cents' | 'status'>>()

  if (!order) return { ok: false, message: 'Commande introuvable.' }
  if (order.status === 'paid') {
    return { ok: true, message: 'Paiement déjà confirmé.', reference: order.reference }
  }

  const verification = await verifyTransaction(transactionId)

  if (!verification.ok) {
    return {
      ok: false,
      message:
        'Nous n’avons pas pu joindre KkiaPay pour vérifier le paiement. ' +
        'Si le montant a été débité, contactez-nous avec votre référence de commande.',
      reference: order.reference,
    }
  }

  if (!verification.successful) {
    await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id)
    return { ok: false, message: 'Le paiement n’a pas abouti.', reference: order.reference }
  }

  // Contrôle du montant : refus si le montant payé est inférieur au dû.
  if (verification.amount > 0 && verification.amount < order.total_cents) {
    await supabase
      .from('orders')
      .update({
        status: 'failed',
        admin_note: `Montant reçu (${verification.amount}) inférieur au montant dû (${order.total_cents}).`,
        kkiapay_transaction_id: transactionId,
      })
      .eq('id', order.id)

    return {
      ok: false,
      message: 'Le montant payé ne correspond pas au montant attendu. Contactez-nous.',
      reference: order.reference,
    }
  }

  const result = await fulfillOrder(order.id, { transactionId, method: 'kkiapay' })
  if (!result.ok) {
    return { ok: false, message: 'Le paiement est confirmé mais l’accès n’a pas pu être ouvert. Contactez-nous.', reference: order.reference }
  }

  revalidatePath('/compte', 'layout')
  return { ok: true, message: 'Paiement confirmé.', reference: order.reference }
}
