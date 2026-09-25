'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin, getCurrentUser, hasCourseAccess } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { QuizResult } from '@/lib/types'

/**
 * Questionnaires à choix multiples.
 *
 * L'écriture passe par la clé de service — c'est de l'administration. La
 * CORRECTION, elle, passe par la session de l'apprenant et la fonction
 * `bz_grade_quiz` : elle est la seule voie qui lise `is_correct`, colonne dont
 * le droit de lecture a été retiré au rôle `authenticated`. Corriger ici, en
 * TypeScript, obligerait à exposer les bonnes réponses au navigateur et
 * viderait le questionnaire de son sens.
 */

export interface QuizActionResult {
  ok: boolean
  message?: string
}

/* ------------------------------------------------------------------ */
/* Administration                                                      */
/* ------------------------------------------------------------------ */

function str(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function int(formData: FormData, name: string, fallback: number): number {
  const value = Number(formData.get(name))
  return Number.isFinite(value) ? value : fallback
}

/**
 * Enregistre un questionnaire entier — réglages, questions et choix.
 *
 * Tout part d'un seul coup plutôt que question par question : un questionnaire
 * à moitié enregistré, dont les bonnes réponses manqueraient, noterait faux
 * sans prévenir. Les anciennes questions sont supprimées puis réinsérées ; la
 * cascade emporte leurs choix.
 */
export async function saveQuiz(
  _prev: QuizActionResult | null,
  formData: FormData,
): Promise<QuizActionResult> {
  await requireAdmin()
  const supabase = createAdminClient()

  const lessonId = str(formData, 'lesson_id')
  const courseId = str(formData, 'course_id')
  if (!lessonId) return { ok: false, message: 'Leçon inconnue.' }

  let payload: {
    title: string
    intro: string
    isActive: boolean
    passPercent: number
    maxAttempts: number
    questions: { prompt: string; explanation: string; choices: { label: string; correct: boolean }[] }[]
  }

  try {
    payload = JSON.parse(str(formData, 'quiz'))
  } catch {
    return { ok: false, message: 'Questionnaire illisible.' }
  }

  const questions = (payload.questions ?? [])
    .map((q) => ({
      prompt: (q.prompt ?? '').trim(),
      explanation: (q.explanation ?? '').trim(),
      choices: (q.choices ?? [])
        .map((c) => ({ label: (c.label ?? '').trim(), correct: Boolean(c.correct) }))
        .filter((c) => c.label),
    }))
    .filter((q) => q.prompt && q.choices.length >= 2)

  // Un questionnaire actif doit pouvoir être réussi. Une question sans bonne
  // réponse est impossible à valider : l'apprenant resterait bloqué sans
  // comprendre pourquoi, et le certificat avec lui.
  if (payload.isActive) {
    if (questions.length === 0) {
      return {
        ok: false,
        message: 'Un questionnaire actif doit comporter au moins une question complète.',
      }
    }
    const orphan = questions.findIndex((q) => !q.choices.some((c) => c.correct))
    if (orphan >= 0) {
      return {
        ok: false,
        message: `La question ${orphan + 1} n’a aucune bonne réponse cochée : elle serait impossible à réussir.`,
      }
    }
  }

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .upsert(
      {
        lesson_id: lessonId,
        title: payload.title?.trim() || 'Vérifiez vos acquis',
        intro: payload.intro?.trim() || null,
        is_active: Boolean(payload.isActive),
        pass_percent: Math.min(100, Math.max(1, payload.passPercent || 70)),
        max_attempts: Math.max(0, payload.maxAttempts || 0),
      },
      { onConflict: 'lesson_id' },
    )
    .select('id')
    .single<{ id: string }>()

  if (error || !quiz) {
    console.error('[quiz] enregistrement échoué :', error?.message)
    return { ok: false, message: 'Le questionnaire n’a pas pu être enregistré.' }
  }

  // Remplacement intégral : plus simple et plus sûr qu'un rapprochement
  // question par question, dont une erreur laisserait des choix orphelins.
  await supabase.from('quiz_questions').delete().eq('quiz_id', quiz.id)

  for (const [index, question] of questions.entries()) {
    const { data: row, error: qError } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: quiz.id,
        prompt: question.prompt,
        explanation: question.explanation || null,
        position: index,
      })
      .select('id')
      .single<{ id: string }>()

    if (qError || !row) {
      console.error('[quiz] question échouée :', qError?.message)
      return { ok: false, message: 'Une question n’a pas pu être enregistrée.' }
    }

    const { error: cError } = await supabase.from('quiz_choices').insert(
      question.choices.map((choice, position) => ({
        question_id: row.id,
        label: choice.label,
        is_correct: choice.correct,
        position,
      })),
    )

    if (cError) {
      console.error('[quiz] réponses échouées :', cError.message)
      return { ok: false, message: 'Les réponses n’ont pas pu être enregistrées.' }
    }
  }

  if (courseId) revalidatePath(`/admin/formations/${courseId}/questionnaires`)
  revalidatePath('/compte', 'layout')
  return { ok: true, message: 'Questionnaire enregistré.' }
}

export async function deleteQuiz(lessonId: string, courseId: string): Promise<QuizActionResult> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('quizzes').delete().eq('lesson_id', lessonId)
  if (error) return { ok: false, message: 'Le questionnaire n’a pas pu être supprimé.' }

  revalidatePath(`/admin/formations/${courseId}/questionnaires`)
  revalidatePath('/compte', 'layout')
  return { ok: true, message: 'Questionnaire supprimé.' }
}

/* ------------------------------------------------------------------ */
/* Passage par l'apprenant                                             */
/* ------------------------------------------------------------------ */

/**
 * Corrige une tentative.
 *
 * L'appel part avec la session de l'apprenant, et non la clé de service :
 * `bz_grade_quiz` s'appuie sur `auth.uid()` pour vérifier l'inscription,
 * compter les tentatives et enregistrer le résultat au bon nom.
 */
export async function submitQuiz(
  quizId: string,
  answers: Record<string, string[]>,
  courseId: string,
  courseSlug: string,
): Promise<{ ok: boolean; message?: string; result?: QuizResult }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: 'Vous devez être connecté.' }

  const allowed = await hasCourseAccess(user.id, courseId)
  if (!allowed) return { ok: false, message: 'Vous n’avez pas accès à cette formation.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('bz_grade_quiz', {
    p_quiz: quizId,
    p_answers: answers,
  })

  if (error) {
    console.error('[quiz] correction impossible :', error.message)
    // Le message de la base est explicite — tentatives épuisées, questionnaire
    // inactif — et vaut mieux qu'une formule générique.
    return { ok: false, message: error.message || 'La correction a échoué.' }
  }

  // Le certificat peut dépendre de cette réussite : la page d'espace membre
  // doit être relue.
  revalidatePath(`/compte/formations/${courseSlug}`, 'layout')

  return { ok: true, result: data as QuizResult }
}
