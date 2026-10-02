'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { CERTIFICATE_REFUSALS, parseCertificateTemplate } from '@/lib/certificate'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface CertificateResult {
  ok: boolean
  message?: string
}

/**
 * Demande de certificat par l'apprenant, en fin de parcours.
 *
 * Toute la vérification est faite EN BASE (`bz_request_certificate`) : être
 * inscrit, avoir terminé, avoir rempli les conditions de visionnage et de
 * questionnaires, formation certifiante. Le serveur ne fait que transmettre
 * le nom à imprimer, avec la session de l'apprenant.
 */
export async function requestCertificate(
  _prev: CertificateResult | null,
  formData: FormData,
): Promise<CertificateResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: CERTIFICATE_REFUSALS.auth }

  const courseId = String(formData.get('courseId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(courseId)) return { ok: false, message: 'Formation introuvable.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('bz_request_certificate', { p_course: courseId, p_name: name })

  if (error) {
    console.error('[certificat] demande impossible :', error.message)
    return {
      ok: false,
      message: /bz_request_certificate/.test(error.message)
        ? 'Le service des certificats n’est pas encore activé. Prévenez l’équipe (migration 0015).'
        : 'Votre demande n’a pas pu aboutir. Réessayez dans un instant.',
    }
  }

  const result = data as { ok: boolean; code?: string; reason?: string } | null
  if (!result?.ok || !result.code) {
    return { ok: false, message: CERTIFICATE_REFUSALS[result?.reason ?? ''] ?? 'Demande refusée.' }
  }

  // Le nom choisi complète le profil s'il était vide : c'est souvent la
  // première fois que l'apprenant l'écrit en entier.
  if (!user.profile.full_name) {
    await supabase.from('bz_profiles').update({ full_name: name }).eq('id', user.id)
  }

  revalidatePath('/compte/certificats')
  revalidatePath('/compte')
  redirect(`/compte/certificat/${result.code}?nouveau=1`)
}

/** Enregistre le modèle de certificat (administration). */
export async function saveCertificateTemplate(
  _prev: CertificateResult | null,
  formData: FormData,
): Promise<CertificateResult> {
  const user = await requireAdmin()

  let raw: unknown = {}
  try {
    raw = JSON.parse(String(formData.get('template') ?? '{}'))
  } catch {
    return { ok: false, message: 'Modèle illisible.' }
  }
  const template = parseCertificateTemplate(raw)

  const supabase = createAdminClient()
  const { error } = await supabase.from('site_settings').update({ certificate: template }).eq('id', 1)
  if (error) {
    return {
      ok: false,
      message: /certificate/.test(error.message)
        ? 'La colonne du modèle n’existe pas encore : appliquez la migration 0015 sur la base.'
        : 'Enregistrement impossible.',
    }
  }

  await logActivity(user.id, 'certificate.template_updated', 'site_settings', null)
  revalidatePath('/admin/certificats')
  revalidatePath('/compte/certificat', 'layout')
  return { ok: true, message: 'Modèle de certificat enregistré.' }
}
