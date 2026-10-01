'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

/**
 * Enregistre la position de lecture ET le temps réellement visionné.
 *
 * Les deux sont distincts, et c'est tout l'enjeu : `position` est l'endroit où
 * se trouve la tête de lecture — la faire glisser jusqu'à la fin ne prouve
 * rien. `watchedDelta` est le temps de lecture effectivement écoulé depuis le
 * dernier envoi, mesuré côté client en n'additionnant que de petits pas.
 *
 * L'écriture passe par `bz_record_watch_time` et non par un `upsert` direct :
 * la colonne `watched_seconds` a été retirée des droits d'écriture du rôle
 * `authenticated`, sans quoi n'importe quel apprenant pourrait la fixer
 * lui-même avec la clé anon, qui est publique par conception. La fonction
 * revérifie l'accès au cours, borne l'incrément, et l'ajoute au cumul.
 */
export async function saveVideoPosition(
  lessonId: string,
  courseId: string,
  seconds: number,
  watchedDelta = 0,
): Promise<LearningResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false }

  const supabase = await createClient()
  const { error } = await supabase.rpc('bz_record_watch_time', {
    p_lesson: lessonId,
    p_course: courseId,
    p_seconds: Math.max(0, Math.round(watchedDelta)),
    p_position: Math.max(0, Math.round(seconds)),
  })

  if (error) console.error('[visionnage] échec :', error.message)
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

  // Écriture par la clé de service APRÈS le contrôle d'accès ci-dessus : la
  // politique d'insertion directe est retirée par 0014. Le statut est imposé
  // ici, jamais choisi par le client.
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()
  if (existing) {
    return { ok: false, message: 'Vous avez déjà donné votre avis sur cette formation. Merci !' }
  }

  const { error } = await supabase.from('reviews').insert({
    course_id: courseId,
    user_id: user.id,
    author_name: user.profile.full_name ?? 'Participant',
    author_role: user.profile.activity ?? null,
    rating: Math.round(rating),
    comment: comment.slice(0, 2000) || null,
    status: 'pending',
    featured: false,
  })

  if (error) {
    console.error('[avis] échec :', error.message)
    return { ok: false, message: 'Impossible d’enregistrer votre avis pour le moment.' }
  }

  return { ok: true, message: 'Merci ! Votre avis sera publié après relecture.' }
}

/**
 * Enregistre la note personnelle d'un apprenant sur une leçon.
 *
 * Écrite avec la session de l'apprenant : la politique RLS `lesson_notes_own`
 * vérifie qu'il est bien inscrit au parcours. Une note vide est supprimée
 * plutôt que conservée, pour que l'icône « notes » du programme ne signale
 * que ce qui existe vraiment.
 */
export async function saveLessonNote(
  lessonId: string,
  courseId: string,
  body: string,
): Promise<LearningResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: 'Vous devez être connecté.' }

  const text = body.slice(0, 20000)
  const supabase = await createClient()

  const { error } = text.trim()
    ? await supabase.from('lesson_notes').upsert(
        { user_id: user.id, lesson_id: lessonId, course_id: courseId, body: text },
        { onConflict: 'user_id,lesson_id' },
      )
    : await supabase.from('lesson_notes').delete().eq('user_id', user.id).eq('lesson_id', lessonId)

  if (error) {
    console.error('[notes] échec :', error.message)
    return { ok: false, message: 'Votre note n’a pas pu être enregistrée.' }
  }
  return { ok: true }
}
