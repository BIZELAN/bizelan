'use client'

import { useActionState, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'

import { saveQuiz, type QuizActionResult } from '@/app/actions/quiz'
import { ActionFeedback, SaveButton } from '@/components/admin/form-bits'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { cn } from '@/lib/utils'

/**
 * Rédaction d'un questionnaire.
 *
 * Tout part en une seule fois, sérialisé dans un champ caché : un
 * questionnaire à moitié enregistré — dont les bonnes réponses manqueraient —
 * noterait faux sans prévenir.
 *
 * La contrainte qui compte est rappelée à l'écran : une question sans bonne
 * réponse cochée est impossible à réussir, et bloquerait l'apprenant sans lui
 * dire pourquoi. Le serveur la refuse aussi — ce contrôle-ci n'est là que pour
 * éviter l'aller-retour.
 */

export interface QuizDraft {
  title: string
  intro: string
  isActive: boolean
  passPercent: number
  maxAttempts: number
  questions: QuestionDraft[]
}

interface QuestionDraft {
  prompt: string
  explanation: string
  choices: { label: string; correct: boolean }[]
}

const BLANK_QUESTION: QuestionDraft = {
  prompt: '',
  explanation: '',
  choices: [
    { label: '', correct: true },
    { label: '', correct: false },
  ],
}

export function QuizEditor({
  lessonId,
  courseId,
  lessonTitle,
  initial,
}: {
  lessonId: string
  courseId: string
  lessonTitle: string
  initial: QuizDraft | null
}) {
  const [state, action] = useActionState<QuizActionResult | null, FormData>(saveQuiz, null)
  const [quiz, setQuiz] = useState<QuizDraft>(
    initial ?? {
      title: 'Vérifiez vos acquis',
      intro: '',
      isActive: false,
      passPercent: 70,
      maxAttempts: 0,
      questions: [structuredClone(BLANK_QUESTION)],
    },
  )

  const set = (patch: Partial<QuizDraft>) => setQuiz((q) => ({ ...q, ...patch }))

  const setQuestion = (index: number, patch: Partial<QuestionDraft>) =>
    setQuiz((q) => ({
      ...q,
      questions: q.questions.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))

  const moveQuestion = (index: number, direction: -1 | 1) =>
    setQuiz((q) => {
      const next = [...q.questions]
      const target = index + direction
      if (target < 0 || target >= next.length) return q
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...q, questions: next }
    })

  const orphans = quiz.questions
    .map((question, index) => (question.choices.some((c) => c.correct) ? null : index + 1))
    .filter((n): n is number => n !== null)

  return (
    <form action={action} className="space-y-5">
      <ActionFeedback state={state} />
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="quiz" value={JSON.stringify(quiz)} />

      {quiz.isActive && orphans.length > 0 && (
        <Alert tone="warning">
          {orphans.length === 1
            ? `La question ${orphans[0]} n’a aucune bonne réponse cochée`
            : `Les questions ${orphans.join(', ')} n’ont aucune bonne réponse cochée`}{' '}
          : elle{orphans.length > 1 ? 's' : ''} serai{orphans.length > 1 ? 'ent' : 't'} impossible
          {orphans.length > 1 ? 's' : ''} à réussir, et retiendrai
          {orphans.length > 1 ? 'ent' : 't'} le certificat sans que l’apprenant comprenne pourquoi.
        </Alert>
      )}

      <div className="rounded-lg border border-line bg-surface p-5">
        <p className="mb-4 text-sm text-fg-subtle">
          Questionnaire de la leçon <strong className="text-fg">{lessonTitle}</strong>
        </p>

        <div className="space-y-5">
          <Field label="Titre" htmlFor="quiz-title">
            <Input
              id="quiz-title"
              value={quiz.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </Field>

          <Field label="Introduction" htmlFor="quiz-intro" help="Affichée au-dessus des questions.">
            <Textarea
              id="quiz-intro"
              rows={2}
              value={quiz.intro}
              onChange={(e) => set({ intro: e.target.value })}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Score minimum"
              htmlFor="quiz-pass"
              help="Part de bonnes réponses exigée, en pourcentage."
            >
              <Input
                id="quiz-pass"
                type="number"
                min={1}
                max={100}
                value={quiz.passPercent}
                onChange={(e) => set({ passPercent: Number(e.target.value) })}
              />
            </Field>

            <Field
              label="Tentatives autorisées"
              htmlFor="quiz-attempts"
              help="0 pour un nombre illimité."
            >
              <Input
                id="quiz-attempts"
                type="number"
                min={0}
                value={quiz.maxAttempts}
                onChange={(e) => set({ maxAttempts: Number(e.target.value) })}
              />
            </Field>
          </div>

          <Checkbox
            name="is_active_display"
            checked={quiz.isActive}
            onChange={(e) => set({ isActive: e.target.checked })}
            label="Proposer ce questionnaire à l’apprenant"
          />
        </div>
      </div>

      {quiz.questions.map((question, index) => (
        <div key={index} className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-semibold text-fg">Question {index + 1}</span>
            <div className="ml-auto flex items-center gap-1">
              <IconButton
                onClick={() => moveQuestion(index, -1)}
                disabled={index === 0}
                label="Monter"
              >
                <ChevronUp className="h-4 w-4" aria-hidden />
              </IconButton>
              <IconButton
                onClick={() => moveQuestion(index, 1)}
                disabled={index === quiz.questions.length - 1}
                label="Descendre"
              >
                <ChevronDown className="h-4 w-4" aria-hidden />
              </IconButton>
              <IconButton
                onClick={() =>
                  setQuiz((q) => ({
                    ...q,
                    questions: q.questions.filter((_, i) => i !== index),
                  }))
                }
                label="Supprimer la question"
                danger
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Énoncé" htmlFor={`prompt-${index}`}>
              <Textarea
                id={`prompt-${index}`}
                rows={2}
                value={question.prompt}
                onChange={(e) => setQuestion(index, { prompt: e.target.value })}
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-fg">Réponses</p>
              {/* Plusieurs bonnes réponses sont possibles : la correction
                  exige l'ensemble EXACT, ce qui empêche de tout cocher. */}
              <p className="mb-3 text-xs text-fg-subtle">
                Cochez toutes les bonnes réponses. L’apprenant doit les trouver toutes, et
                seulement celles-là.
              </p>

              <div className="space-y-2">
                {question.choices.map((choice, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQuestion(index, {
                          choices: question.choices.map((c, i) =>
                            i === ci ? { ...c, correct: !c.correct } : c,
                          ),
                        })
                      }
                      aria-pressed={choice.correct}
                      aria-label={choice.correct ? 'Bonne réponse' : 'Marquer comme bonne réponse'}
                      className={cn(
                        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors duration-fast',
                        choice.correct
                          ? 'border-success bg-success-subtle text-success'
                          : 'border-line-control text-fg-subtle hover:bg-canvas-subtle',
                      )}
                    >
                      <Check className="h-4 w-4" aria-hidden />
                    </button>

                    <Input
                      value={choice.label}
                      onChange={(e) =>
                        setQuestion(index, {
                          choices: question.choices.map((c, i) =>
                            i === ci ? { ...c, label: e.target.value } : c,
                          ),
                        })
                      }
                      placeholder={`Réponse ${ci + 1}`}
                      aria-label={`Réponse ${ci + 1} de la question ${index + 1}`}
                    />

                    <IconButton
                      onClick={() =>
                        setQuestion(index, {
                          choices: question.choices.filter((_, i) => i !== ci),
                        })
                      }
                      disabled={question.choices.length <= 2}
                      label="Retirer cette réponse"
                      danger
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </IconButton>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() =>
                  setQuestion(index, {
                    choices: [...question.choices, { label: '', correct: false }],
                  })
                }
              >
                <Plus className="h-4 w-4" aria-hidden />
                Ajouter une réponse
              </Button>
            </div>

            <Field
              label="Explication"
              htmlFor={`explanation-${index}`}
              help="Affichée APRÈS correction. C’est ce qui fait qu’une erreur serve à quelque chose."
            >
              <Textarea
                id={`explanation-${index}`}
                rows={2}
                value={question.explanation}
                onChange={(e) => setQuestion(index, { explanation: e.target.value })}
              />
            </Field>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setQuiz((q) => ({ ...q, questions: [...q.questions, structuredClone(BLANK_QUESTION)] }))
        }
      >
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter une question
      </Button>

      <div className="sticky bottom-0 -mx-1 border-t border-line bg-canvas/95 px-1 py-4 backdrop-blur">
        <SaveButton label="Enregistrer le questionnaire" />
      </div>
    </form>
  )
}

function IconButton({
  onClick,
  label,
  disabled,
  danger,
  children,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors duration-fast',
        'disabled:pointer-events-none disabled:opacity-40',
        danger
          ? 'text-fg-subtle hover:bg-danger-subtle hover:text-danger'
          : 'text-fg-subtle hover:bg-canvas-subtle hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
