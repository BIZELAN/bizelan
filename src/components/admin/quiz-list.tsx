'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

import { deleteQuiz } from '@/app/actions/quiz'
import { QuizEditor, type QuizDraft } from '@/components/admin/quiz-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LessonWithQuiz } from '@/app/admin/formations/[id]/questionnaires/page'

/**
 * Les leçons du parcours, chacune dépliable sur son questionnaire.
 *
 * Une liste plutôt qu'une page par leçon : on règle un parcours entier d'un
 * coup d'œil — où il y a un questionnaire, lequel est actif, combien de
 * questions — sans naviguer entre vingt écrans.
 */
export function QuizList({
  courseId,
  lessons,
}: {
  courseId: string
  lessons: LessonWithQuiz[]
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-3">
      {lessons.map((lesson) => {
        const open = openId === lesson.id
        const quiz = lesson.quiz
        const count = quiz?.questions.length ?? 0

        return (
          <div
            key={lesson.id}
            className={cn(
              'overflow-hidden rounded-lg border bg-surface transition-colors duration-fast',
              open ? 'border-primary-text' : 'border-line',
            )}
          >
            <div className="flex flex-wrap items-center gap-3 p-4">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : lesson.id)}
                aria-expanded={open}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                {open ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{lesson.title}</span>
                  <span className="block truncate text-xs text-fg-subtle">
                    {lesson.moduleTitle}
                  </span>
                </span>
              </button>

              {quiz ? (
                <>
                  <Badge tone={quiz.is_active ? 'success' : 'neutral'}>
                    {quiz.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                  <span className="text-xs tabular-nums text-fg-subtle">
                    {count} question{count > 1 ? 's' : ''} · {quiz.pass_percent} %
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Supprimer le questionnaire de « ${lesson.title} » ?\n\n` +
                            'Les tentatives déjà enregistrées disparaîtront avec lui.',
                        )
                      ) {
                        return
                      }
                      startTransition(async () => {
                        await deleteQuiz(lesson.id, courseId)
                        window.location.reload()
                      })
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Supprimer le questionnaire</span>
                  </Button>
                </>
              ) : (
                <Badge tone="neutral">Aucun questionnaire</Badge>
              )}
            </div>

            {open && (
              <div className="border-t border-line bg-canvas-subtle p-4">
                <QuizEditor
                  lessonId={lesson.id}
                  courseId={courseId}
                  lessonTitle={lesson.title}
                  initial={toDraft(quiz)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Traduit la forme stockée en la forme éditée. */
function toDraft(quiz: LessonWithQuiz['quiz']): QuizDraft | null {
  if (!quiz) return null
  return {
    title: quiz.title,
    intro: quiz.intro ?? '',
    isActive: quiz.is_active,
    passPercent: quiz.pass_percent,
    maxAttempts: quiz.max_attempts,
    questions: quiz.questions.map((q) => ({
      prompt: q.prompt,
      explanation: q.explanation ?? '',
      choices: q.choices.map((c) => ({ label: c.label, correct: c.is_correct })),
    })),
  }
}
