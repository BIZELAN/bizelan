import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CircleHelp } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { QuizList } from '@/components/admin/quiz-list'
import { Alert, EmptyState } from '@/components/ui/misc'
import type { Course } from '@/lib/types'

export const metadata: Metadata = { title: 'Questionnaires' }
export const dynamic = 'force-dynamic'

/** Leçon du parcours, accompagnée de son questionnaire s'il existe. */
export interface LessonWithQuiz {
  id: string
  title: string
  moduleTitle: string
  quiz: {
    id: string
    title: string
    intro: string | null
    is_active: boolean
    pass_percent: number
    max_attempts: number
    questions: {
      id: string
      prompt: string
      explanation: string | null
      position: number
      choices: { id: string; label: string; is_correct: boolean; position: number }[]
    }[]
  } | null
}

export default async function QuizzesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .maybeSingle<Course>()
  if (!course) notFound()

  // `is_correct` n'est lisible qu'avec la clé de service : c'est bien elle qui
  // sert ici, et cette page ne s'ouvre qu'à l'administration.
  const { data: modules } = await supabase
    .from('course_modules')
    .select(
      `id, title, position,
       lessons (
         id, title, position,
         quizzes ( id, title, intro, is_active, pass_percent, max_attempts,
           quiz_questions ( id, prompt, explanation, position,
             quiz_choices ( id, label, is_correct, position ) ) ) )`,
    )
    .eq('course_id', id)
    .order('position')

  /**
   * Forme exacte renvoyée par la requête imbriquée.
   *
   * Déclarée plutôt que devinée : Supabase rend les relations en tableaux, et
   * les manipuler en `Record<string, unknown>` fait perdre au compilateur ce
   * qu'il sait — jusqu'à laisser passer un tri sur un champ inexistant.
   */
  type RawChoice = { id: string; label: string; is_correct: boolean; position: number }
  type RawQuestion = {
    id: string
    prompt: string
    explanation: string | null
    position: number
    quiz_choices: RawChoice[] | null
  }
  type RawQuiz = {
    id: string
    title: string
    intro: string | null
    is_active: boolean
    pass_percent: number
    max_attempts: number
    quiz_questions: RawQuestion[] | null
  }
  type RawModule = {
    title: string
    position: number
    lessons: { id: string; title: string; position: number; quizzes: RawQuiz[] | null }[] | null
  }

  const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position

  const lessons: LessonWithQuiz[] = ((modules ?? []) as unknown as RawModule[]).flatMap((m) =>
    [...(m.lessons ?? [])].sort(byPosition).map((l) => {
      // `quizzes` est une relation : un tableau d'au plus un élément, puisque
      // `lesson_id` porte une contrainte d'unicité.
      const raw = l.quizzes?.[0] ?? null
      return {
        id: l.id,
        title: l.title,
        moduleTitle: m.title,
        quiz: raw
          ? {
              id: raw.id,
              title: raw.title,
              intro: raw.intro,
              is_active: raw.is_active,
              pass_percent: raw.pass_percent,
              max_attempts: raw.max_attempts,
              questions: [...(raw.quiz_questions ?? [])].sort(byPosition).map((q) => ({
                id: q.id,
                prompt: q.prompt,
                explanation: q.explanation,
                position: q.position,
                choices: [...(q.quiz_choices ?? [])].sort(byPosition),
              })),
            }
          : null,
      }
    }),
  )

  return (
    <>
      <PageHeader
        title="Questionnaires"
        description={course.title}
        backHref={`/admin/formations/${id}`}
        backLabel="Retour à la formation"
      />

      <Alert tone="info" className="mb-6">
        Un questionnaire par leçon, proposé à l’apprenant une fois activé. Les bonnes réponses ne
        sont jamais envoyées au navigateur : la correction se fait sur le serveur, ce qui empêche
        de les lire dans la page.
        {course.require_quiz_pass ? (
          <>
            {' '}
            Cette formation <strong>exige la réussite</strong> des questionnaires actifs pour
            délivrer le certificat.
          </>
        ) : (
          <>
            {' '}
            Pour conditionner le certificat à leur réussite, cochez l’option correspondante dans la
            fiche formation.
          </>
        )}
      </Alert>

      {lessons.length === 0 ? (
        <EmptyState
          icon={CircleHelp}
          title="Aucune leçon"
          description="Créez d’abord le programme : un questionnaire se rattache à une leçon."
        />
      ) : (
        <QuizList courseId={id} lessons={lessons} />
      )}
    </>
  )
}
