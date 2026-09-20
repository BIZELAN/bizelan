'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

export interface AuthState {
  ok: boolean
  message: string
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

/** Traduit les messages d'erreur Supabase en français. */
function translate(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.'
  if (m.includes('email not confirmed'))
    return 'Votre adresse e-mail n’est pas encore confirmée. Vérifiez votre boîte de réception.'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Un compte existe déjà avec cette adresse. Essayez de vous connecter.'
  if (m.includes('password should be at least'))
    return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Trop de tentatives. Merci de patienter quelques minutes.'
  return 'Une erreur est survenue. Merci de réessayer.'
}

export async function signIn(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = field(formData, 'email')
  const password = field(formData, 'password')
  const next = field(formData, 'next') || '/compte'

  if (!email || !password) {
    return { ok: false, message: 'Merci de renseigner votre e-mail et votre mot de passe.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { ok: false, message: translate(error.message) }

  revalidatePath('/', 'layout')
  redirect(next.startsWith('/') ? next : '/compte')
}

export async function signUp(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = field(formData, 'email')
  const password = field(formData, 'password')
  const fullName = field(formData, 'fullName')
  const phone = field(formData, 'phone')
  const next = field(formData, 'next') || '/compte'

  if (!email || !password || !fullName) {
    return { ok: false, message: 'Merci de renseigner votre nom, votre e-mail et un mot de passe.' }
  }
  if (password.length < 8) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) return { ok: false, message: translate(error.message) }

  // Session immédiate (confirmation d'e-mail désactivée dans Supabase)
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect(next.startsWith('/') ? next : '/compte')
  }

  return {
    ok: true,
    message:
      'Compte créé. Vérifiez votre boîte e-mail : un lien de confirmation vous a été envoyé.',
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function requestPasswordReset(
  _prev: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  const email = field(formData, 'email')
  if (!email) return { ok: false, message: 'Merci de renseigner votre adresse e-mail.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.siteUrl}/auth/callback?next=/compte/mot-de-passe`,
  })

  if (error) return { ok: false, message: translate(error.message) }

  // Réponse volontairement identique, que le compte existe ou non.
  return {
    ok: true,
    message:
      'Si un compte existe avec cette adresse, un lien de réinitialisation vient d’être envoyé.',
  }
}

export async function updatePassword(
  _prev: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  const password = field(formData, 'password')
  const confirm = field(formData, 'confirm')

  if (password.length < 8) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }
  if (password !== confirm) {
    return { ok: false, message: 'Les deux mots de passe ne correspondent pas.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { ok: false, message: translate(error.message) }

  return { ok: true, message: 'Votre mot de passe a bien été mis à jour.' }
}

export async function updateProfile(
  _prev: AuthState | null,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, message: 'Vous devez être connecté.' }

  const { error } = await supabase
    .from('bz_profiles')
    .update({
      full_name: field(formData, 'fullName') || null,
      phone: field(formData, 'phone') || null,
      city: field(formData, 'city') || null,
      activity: field(formData, 'activity') || null,
    })
    .eq('id', user.id)

  if (error) return { ok: false, message: 'La mise à jour a échoué. Merci de réessayer.' }

  revalidatePath('/compte')
  return { ok: true, message: 'Vos informations ont été enregistrées.' }
}
