import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

/** Utilisateur connecté + profil, ou null. */
export async function getCurrentUser(): Promise<{
  id: string
  email: string
  profile: Profile
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('bz_profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile) return null

  return { id: user.id, email: user.email ?? profile.email, profile }
}

/** Exige une session ; redirige vers la connexion sinon. */
export async function requireUser(nextPath = '/compte') {
  const user = await getCurrentUser()
  if (!user) redirect(`/connexion?suivant=${encodeURIComponent(nextPath)}`)
  return user
}

/** Exige un rôle admin ou éditeur. */
export async function requireAdmin(nextPath = '/admin') {
  const user = await getCurrentUser()
  if (!user) redirect(`/connexion?suivant=${encodeURIComponent(nextPath)}`)
  if (!['admin', 'editor'].includes(user.profile.role)) {
    redirect('/compte?erreur=acces-refuse')
  }
  return user
}

/** Vrai si l'utilisateur a accès à la formation (inscription active). */
export async function hasCourseAccess(userId: string, courseId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('enrollments')
    .select('id, state')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .in('state', ['active', 'completed'])
    .maybeSingle()

  return Boolean(data)
}
