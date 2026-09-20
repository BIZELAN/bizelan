'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdminNewLead } from '@/lib/email'

export interface ActionResult {
  ok: boolean
  message: string
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Message de contact du site public. */
export async function submitContactMessage(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // Pot de miel : les robots remplissent ce champ, pas les humains.
  if (field(formData, 'website')) {
    return { ok: true, message: 'Merci, votre message a bien été envoyé.' }
  }

  const name = field(formData, 'name')
  const email = field(formData, 'email')
  const message = field(formData, 'message')

  if (!name || !email || !message) {
    return { ok: false, message: 'Merci de renseigner votre nom, votre e-mail et votre message.' }
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: 'Cette adresse e-mail ne semble pas valide.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('contact_messages').insert({
    name,
    email,
    phone: field(formData, 'phone') || null,
    subject: field(formData, 'subject') || null,
    message,
  })

  if (error) {
    console.error('[contact] insertion échouée :', error.message)
    return { ok: false, message: "L'envoi a échoué. Merci de réessayer dans un instant." }
  }

  await notifyAdminNewLead({
    kind: 'contact',
    name,
    email,
    phone: field(formData, 'phone') || null,
    message,
  })

  return { ok: true, message: 'Merci, votre message a bien été envoyé. Nous revenons vers vous rapidement.' }
}

/** Demande de devis pour un service. */
export async function submitQuoteRequest(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (field(formData, 'website')) {
    return { ok: true, message: 'Merci, votre demande a bien été transmise.' }
  }

  const name = field(formData, 'name')
  const email = field(formData, 'email')

  if (!name || !email) {
    return { ok: false, message: 'Merci de renseigner au minimum votre nom et votre e-mail.' }
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: 'Cette adresse e-mail ne semble pas valide.' }
  }

  const serviceId = field(formData, 'serviceId') || null
  const supabase = createAdminClient()

  const { error } = await supabase.from('quote_requests').insert({
    service_id: serviceId,
    name,
    email,
    phone: field(formData, 'phone') || null,
    company: field(formData, 'company') || null,
    budget: field(formData, 'budget') || null,
    message: field(formData, 'message') || null,
  })

  if (error) {
    console.error('[devis] insertion échouée :', error.message)
    return { ok: false, message: "L'envoi a échoué. Merci de réessayer dans un instant." }
  }

  await notifyAdminNewLead({
    kind: 'devis',
    name,
    email,
    phone: field(formData, 'phone') || null,
    message: field(formData, 'message') || null,
    service: field(formData, 'serviceName') || null,
  })

  return {
    ok: true,
    message: 'Merci, votre demande est transmise. Nous vous recontactons sous 48 h ouvrées.',
  }
}

/** Inscription à la newsletter. */
export async function subscribeNewsletter(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = field(formData, 'email')
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: 'Cette adresse e-mail ne semble pas valide.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert(
      { email, name: field(formData, 'name') || null, source: field(formData, 'source') || 'site', unsubscribed: false },
      { onConflict: 'email' },
    )

  if (error) {
    console.error('[newsletter] échec :', error.message)
    return { ok: false, message: "L'inscription a échoué. Merci de réessayer." }
  }

  return { ok: true, message: 'Merci, vous êtes inscrit.' }
}
