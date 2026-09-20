'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, hasCourseAccess } from '@/lib/auth'

export interface LearningResult {
  ok: boolean
  message?: string
}

/** Marque une leçon terminée (ou non) pour l'utilisateur connecté. */
export async function setLessonCompleted(
  lessonId: string,
  courseId: string,
  courseSlug: string,
  completed: boolean,
): Promise<LearningResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: 'Vous devez être connecté.' }

  const allowed = await hasCourseAccess(user.id, courseId)
  if (!allowed) return { ok: false, message: 'Vous n’avez pas accès à cette formation.' }

  const supabase = await createClient()
  const { error } = await supabase.from('lesson_progress').upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      course_id: courseId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: 'user_id,lesson_id' },
  )

  if (error) {
    console.error('[progression] échec :', error.message)
    return { ok: false, message: 'Impossible d’enregistrer votre progression.' }
  }

  revalidatePath(`/compte/formations/${courseSlug}`, 'layout')
  revalidatePath('/compte')
  return { ok: true }
}

/** Mémorise la position de lecture pour reprendre la vidéo au bon endroit. */
export async function saveVideoPosition(
  lessonId: string,
  courseId: string,
  seconds: number,
): Promise<LearningResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false }

  const supabase = await createClient()
  const { error } = await supabase.from('lesson_progress').upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      course_id: courseId,
      last_position_seconds: Math.max(0, Math.round(seconds)),
    },
    { onConflict: 'user_id,lesson_id' },
  )

  return { ok: !error }
}

/** Dépôt d'un avis par un inscrit (soumis à modération). */
export async function submitReview(
  _prev: LearningResult | null,
  formData: FormData,
): Promise<LearningResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: 'Vous devez être connecté.' }

  const courseId = String(formData.get('courseId') ?? '')
  const rating = Number(formData.get('rating') ?? 0)
  const comment = String(formData.get('comment') ?? '').trim()

  if (!courseId || rating < 1 || rating > 5) {
    return { ok: false, message: 'Merci de choisir une note entre 1 et 5.' }
  }

  const allowed = await hasCourseAccess(user.id, courseId)
  if (!allowed) return { ok: false, message: 'Vous n’avez pas accès à cette formation.' }

  const supabase = await createClient()
  const { error } = await supabase.from('reviews').insert({
    course_id: courseId,
    user_id: user.id,
    author_name: user.profile.full_name ?? 'Participant',
    author_role: user.profile.activity ?? null,
    rating,
    comment: comment || null,
    status: 'pending',
  })

  if (error) {
    console.error('[avis] échec :', error.message)
    return { ok: false, message: 'Impossible d’enregistrer votre avis pour le moment.' }
  }

  return { ok: true, message: 'Merci ! Votre avis sera publié après relecture.' }
}
