'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, Star } from 'lucide-react'

import { saveReview, type ReviewResult } from '@/app/actions/reviews'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import type { Review, ReviewTargetType } from '@/lib/types'

const RATING_WORDS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent']

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? 'Envoi…' : editing ? 'Mettre à jour mon avis' : 'Publier mon avis'}
    </Button>
  )
}

/**
 * Dépôt ou modification d'un avis — sur une formation, un produit ou le
 * cabinet. Publié après relecture par l'équipe.
 */
export function ReviewForm({
  targetType = 'course',
  targetId = null,
  courseId,
  initial = null,
  defaultName = '',
  defaultRole = '',
}: {
  targetType?: ReviewTargetType
  targetId?: string | null
  /** Forme historique, conservée pour les pages qui l'emploient encore. */
  courseId?: string
  initial?: Review | null
  defaultName?: string
  defaultRole?: string
}) {
  const [state, action] = useActionState<ReviewResult | null, FormData>(saveReview, null)
  const [rating, setRating] = useState(initial?.rating ?? 5)
  const [hover, setHover] = useState(0)
  const shown = hover || rating

  if (state?.ok) {
    return (
      <Alert tone="success" title="Merci pour votre retour">
        {state.message}
      </Alert>
    )
  }

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}

      <input type="hidden" name="targetType" value={courseId ? 'course' : targetType} />
      <input type="hidden" name="targetId" value={courseId ?? targetId ?? ''} />
      <input type="hidden" name="rating" value={rating} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-fg">Votre note</legend>
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHover(value)}
                aria-label={`${value} étoile${value > 1 ? 's' : ''}`}
                aria-pressed={rating === value}
                className="rounded p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'h-8 w-8',
                    value <= shown ? 'fill-accent-400 text-accent-400' : 'fill-line-strong text-fg-subtle',
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>
          <span className="text-sm font-medium text-fg-muted">{RATING_WORDS[shown]}</span>
        </div>
      </fieldset>

      <Field
        label="Votre retour"
        htmlFor={`review-comment-${targetType}-${targetId ?? courseId ?? 'site'}`}
        help="Qu’avez-vous apprécié ? Qu’est-ce qui a changé pour vous ? Votre avis aide les prochains clients."
      >
        <Textarea
          id={`review-comment-${targetType}-${targetId ?? courseId ?? 'site'}`}
          name="comment"
          rows={4}
          minLength={10}
          maxLength={2000}
          required
          defaultValue={initial?.comment ?? ''}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom affiché" help="Votre prénom suffit si vous préférez.">
          <Input name="authorName" maxLength={80} defaultValue={initial?.author_name ?? defaultName} />
        </Field>
        <Field label="Activité ou fonction" help="Facultatif — ex. « Agricultrice, Parakou ».">
          <Input name="authorRole" maxLength={120} defaultValue={initial?.author_role ?? defaultRole} />
        </Field>
      </div>

      <Submit editing={Boolean(initial)} />
    </form>
  )
}
