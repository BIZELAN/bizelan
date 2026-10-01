'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, NotebookPen } from 'lucide-react'

import { saveLessonNote } from '@/app/actions/learning'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

/**
 * Bloc-notes personnel, à côté de la vidéo.
 *
 * Enregistrement automatique : une seconde après la dernière frappe, et à la
 * sortie du champ. L'apprenant ne doit jamais se demander s'il a « bien
 * enregistré » — ni perdre ses notes en passant à la leçon suivante.
 */
export function LessonNotes({
  lessonId,
  courseId,
  initialBody,
}: {
  lessonId: string
  courseId: string
  initialBody: string
}) {
  const [body, setBody] = useState(initialBody)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const saved = useRef(initialBody)
  const timer = useRef<number | null>(null)

  async function save(value: string) {
    if (value === saved.current) {
      setStatus((s) => (s === 'dirty' ? 'saved' : s))
      return
    }
    setStatus('saving')
    const result = await saveLessonNote(lessonId, courseId, value)
    if (result.ok) {
      saved.current = value
      setStatus('saved')
      setMessage(null)
    } else {
      setStatus('error')
      setMessage(result.message ?? 'Enregistrement impossible.')
    }
  }

  function onChange(value: string) {
    setBody(value)
    setStatus('dirty')
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void save(value), 1000)
  }

  // Quitter la page avec une saisie en attente : on l'envoie quand même.
  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (status === 'dirty' || status === 'saving') {
        event.preventDefault()
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [status])

  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
          <NotebookPen className="h-[1.125rem] w-[1.125rem] text-primary-text" aria-hidden />
          Mes notes
        </h2>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs',
            status === 'error' ? 'text-danger' : 'text-fg-subtle',
          )}
          aria-live="polite"
        >
          {status === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {status === 'saved' && <Check className="h-3.5 w-3.5 text-success" aria-hidden />}
          {status === 'saving'
            ? 'Enregistrement…'
            : status === 'saved'
              ? 'Enregistré'
              : status === 'dirty'
                ? 'Modifications en cours'
                : status === 'error'
                  ? message
                  : 'Visibles par vous seul'}
        </span>
      </div>

      <label htmlFor={`note-${lessonId}`} className="sr-only">
        Mes notes sur cette leçon
      </label>
      <textarea
        id={`note-${lessonId}`}
        value={body}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (timer.current) window.clearTimeout(timer.current)
          void save(body)
        }}
        rows={6}
        maxLength={20000}
        placeholder="Idées clés, chiffres à retenir, questions à poser… Tout s’enregistre automatiquement."
        className="w-full resize-y rounded-md border border-line-strong bg-canvas px-3.5 py-3 text-base leading-relaxed text-fg placeholder:text-fg-subtle focus:border-primary-text focus:outline-none focus:ring-1 focus:ring-primary-text"
      />
    </section>
  )
}
