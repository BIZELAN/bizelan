'use client'

import { useState, useTransition } from 'react'
import { Check, CircleHelp, Loader2, RotateCcw, X } from 'lucide-react'

import { submitQuiz } from '@/app/actions/quiz'
import { Button } from '@/components/ui/button'
import { Alert, ProgressBar } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import type { QuizResult } from '@/lib/types'

/**
 * Questionnaire de fin de leçon.
 *
 * Les bonnes réponses ne sont PAS dans cette page : le composant ne reçoit que
 * les énoncés et les libellés. La correction part au serveur, qui est le seul
 * à pouvoir lire `is_correct` — le droit de lecture a été retiré au rôle des
 * utilisateurs connectés. Corriger ici obligerait à livrer les réponses avec
 * la question, et le questionnaire n'évaluerait plus rien.
 *
 * Une question est juste quand l'ensemble coché correspond EXACTEMENT à
 * l'ensemble attendu. D'où les cases à cocher plutôt que des boutons radio :
 * plusieurs réponses peuvent être bonnes, et tout cocher ne fait pas gagner.
 */

export interface QuizView {
  id: string
  title: string
  intro: string | null
  passPercent: number
  maxAttempts: number
  attemptsUsed: number
  /** Réussi lors d'une tentative précédente. */
  alreadyPassed: boolean
  questions: {
    id: string
    prompt: string
    choices: { id: string; label: string }[]
  }[]
}

export function LessonQuiz({
  quiz,
  courseId,
  courseSlug,
}: {
  quiz: QuizView
  courseId: string
  courseSlug: string
}) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Compteur tenu ici : la valeur reçue du serveur ne bouge pas tant que la
  // page n'est pas rechargée, et après deux essais le composant annonçait
  // encore « tentative 2 sur 3 ».
  const [attemptsUsed, setAttemptsUsed] = useState(quiz.attemptsUsed)
  const [passedOnce, setPassedOnce] = useState(quiz.alreadyPassed)

  const exhausted = quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts
  const unanswered = quiz.questions.filter((q) => !(answers[q.id]?.length > 0)).length

  const toggle = (questionId: string, choiceId: string) =>
    setAnswers((current) => {
      const chosen = current[questionId] ?? []
      return {
        ...current,
        [questionId]: chosen.includes(choiceId)
          ? chosen.filter((id) => id !== choiceId)
          : [...chosen, choiceId],
      }
    })

  function send() {
    setError(null)
    startTransition(async () => {
      const response = await submitQuiz(quiz.id, answers, courseId, courseSlug)
      if (!response.ok || !response.result) {
        setError(response.message ?? 'La correction a échoué.')
        return
      }
      setResult(response.result)
      setAttemptsUsed((n) => n + 1)
      if (response.result.passed) setPassedOnce(true)
    })
  }

  function retry() {
    setAnswers({})
    setResult(null)
    setError(null)
  }

  /* ---------- Après correction ----------------------------------------- */
  if (result) {
    return (
      <section className="overflow-hidden rounded-lg border border-line bg-surface">
        <header
          className={cn(
            'border-b p-6',
            result.passed ? 'border-success/30 bg-success-subtle' : 'border-warning/30 bg-warning-subtle',
          )}
        >
          <p className={cn('text-lg font-semibold', result.passed ? 'text-success' : 'text-warning')}>
            {result.passed ? 'Questionnaire réussi' : 'Pas encore'}
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            {result.correct} bonne{result.correct > 1 ? 's' : ''} réponse
            {result.correct > 1 ? 's' : ''} sur {result.total} — {result.score_percent} %
            {!result.passed && ` (${result.pass_percent} % attendus)`}
          </p>
          <div className="mt-3 max-w-xs">
            <ProgressBar value={result.score_percent} />
          </div>
        </header>

        <ol className="divide-y divide-line">
          {quiz.questions.map((question, index) => {
            const detail = result.detail.find((d) => d.question_id === question.id)
            const correct = detail?.correct ?? false
            const expected = new Set(detail?.expected ?? [])
            const given = new Set(answers[question.id] ?? [])

            return (
              <li key={question.id} className="p-6">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      correct ? 'bg-success text-success-fg' : 'bg-danger text-danger-fg',
                    )}
                  >
                    {correct ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <X className="h-3.5 w-3.5" aria-hidden />
                    )}
                    <span className="sr-only">{correct ? 'Juste' : 'Faux'}</span>
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-fg">
                      {index + 1}. {question.prompt}
                    </p>

                    <ul className="mt-3 space-y-1.5">
                      {question.choices.map((choice) => {
                        const wasExpected = expected.has(choice.id)
                        const wasGiven = given.has(choice.id)
                        return (
                          <li
                            key={choice.id}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                              wasExpected && 'bg-success-subtle text-success',
                              !wasExpected && wasGiven && 'bg-danger-subtle text-danger',
                              !wasExpected && !wasGiven && 'text-fg-subtle',
                            )}
                          >
                            {wasExpected ? (
                              <Check className="h-4 w-4 shrink-0" aria-hidden />
                            ) : wasGiven ? (
                              <X className="h-4 w-4 shrink-0" aria-hidden />
                            ) : (
                              <span className="h-4 w-4 shrink-0" aria-hidden />
                            )}
                            <span>{choice.label}</span>
                            {wasExpected && !wasGiven && (
                              <span className="ml-auto text-xs">attendue</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>

                    {/* L'explication n'apparaît qu'ici : c'est ce qui fait
                        qu'une erreur serve à quelque chose. */}
                    {detail?.explanation && (
                      <p className="mt-3 rounded-md bg-canvas-subtle px-4 py-3 text-sm leading-relaxed text-fg-muted">
                        {detail.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        {!result.passed && (
          <footer className="border-t border-line p-6">
            {exhausted ? (
              <Alert tone="warning">
                Vous avez utilisé toutes vos tentatives. Contactez-nous si vous pensez qu’il s’agit
                d’une erreur.
              </Alert>
            ) : (
              <Button type="button" onClick={retry} variant="outline">
                <RotateCcw className="h-4 w-4" aria-hidden />
                Réessayer
              </Button>
            )}
          </footer>
        )}
      </section>
    )
  }

  /* ---------- Avant correction ------------------------------------------ */
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <header className="border-b border-line p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-fg">
          <CircleHelp className="h-[1.125rem] w-[1.125rem] shrink-0 text-primary-text" aria-hidden />
          {quiz.title}
        </h2>
        {quiz.intro && <p className="mt-2 text-sm leading-relaxed text-fg-muted">{quiz.intro}</p>}
        <p className="mt-2 text-xs text-fg-subtle">
          {quiz.questions.length} question{quiz.questions.length > 1 ? 's' : ''} ·{' '}
          {quiz.passPercent} % de bonnes réponses attendues
          {quiz.maxAttempts > 0 &&
            !exhausted &&
            ` · tentative ${attemptsUsed + 1} sur ${quiz.maxAttempts}`}
        </p>
      </header>

      {passedOnce && !exhausted && (
        <div className="border-b border-line px-6 py-4">
          <Alert tone="success">
            Vous avez déjà réussi ce questionnaire. Vous pouvez le refaire pour vous entraîner.
          </Alert>
        </div>
      )}

      {exhausted ? (
        <div className="p-6">
          {/* Le serveur refuse toute tentative au-delà du plafond : proposer
              les questions après coup ne menait qu'à un message d'erreur. */}
          {passedOnce ? (
            <Alert tone="success">
              Questionnaire réussi. Vous avez utilisé toutes vos tentatives.
            </Alert>
          ) : (
            <Alert tone="warning">
              Vous avez utilisé vos {quiz.maxAttempts} tentatives. Contactez-nous si vous pensez
              qu’il s’agit d’une erreur.
            </Alert>
          )}
        </div>
      ) : (
        <>
          {error && (
            <div className="px-6 pt-6">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <ol className="divide-y divide-line">
            {quiz.questions.map((question, index) => (
              <li key={question.id} className="p-6">
                <fieldset>
                  <legend className="font-medium text-fg">
                    {index + 1}. {question.prompt}
                  </legend>

                  <div className="mt-3 space-y-2">
                    {question.choices.map((choice) => {
                      const chosen = answers[question.id]?.includes(choice.id) ?? false
                      return (
                        <label
                          key={choice.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-md border-2 px-4 py-3 text-sm',
                            'transition-colors duration-fast',
                            chosen
                              ? 'border-primary-text bg-primary-subtle text-primary-text'
                              : 'border-line hover:border-line-control hover:bg-canvas-subtle',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={chosen}
                            onChange={() => toggle(question.id, choice.id)}
                            className="h-4 w-4 shrink-0 rounded border-line-control"
                          />
                          <span>{choice.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>

          <footer className="flex flex-wrap items-center gap-3 border-t border-line p-6">
            <Button type="button" onClick={send} disabled={pending || unanswered > 0} size="lg">
              {pending && <Loader2 className="h-[1.125rem] w-[1.125rem] animate-spin" aria-hidden />}
              Valider mes réponses
            </Button>
            {/* Le bouton est désactivé tant qu'il manque une réponse : le dire
                vaut mieux que laisser deviner pourquoi il ne réagit pas. */}
            {unanswered > 0 && (
              <p className="text-sm text-fg-subtle">
                {unanswered} question{unanswered > 1 ? 's' : ''} sans réponse.
              </p>
            )}
          </footer>
        </>
      )}
    </section>
  )
}
