'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Star } from 'lucide-react'

import { submitReview, type LearningResult } from '@/app/actions/learning'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { cn } from '@/lib/utils'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Envoi…' : 'Envoyer mon avis'}
    </Button>
  )
}

/** Dépôt d'un avis par un inscrit — publié après relecture par l'admin. */
export function ReviewForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState<LearningResult | null, FormData>(submitReview, null)
  const [rating, setRating] = useState(5)

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

      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="rating" value={rating} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-fg">Votre note</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} étoile${value > 1 ? 's' : ''}`}
              aria-pressed={rating === value}
              className="rounded p-1 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  'h-7 w-7',
                  value <= rating ? 'fill-accent-400 text-accent-400' : 'fill-ink-200 text-fg-subtle',
                )}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </fieldset>

      <Field
        label="Votre retour"
        htmlFor="review-comment"
        help="Qu’est-ce qui vous a été le plus utile ? Votre avis aide les prochains participants."
      >
        <Textarea id="review-comment" name="comment" rows={4} />
      </Field>

      <Submit />
    </form>
  )
}
