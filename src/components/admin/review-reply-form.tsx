'use client'

import { useActionState } from 'react'

import { replyToReview, type AdminResult } from '@/app/actions/admin'
import { ActionFeedback, SaveButton } from '@/components/admin/form-bits'
import { Textarea } from '@/components/ui/field'

/**
 * Réponse publique de l'équipe sous un avis. Répondre aux avis — y compris
 * aux plus mitigés — inspire davantage confiance que leur absence.
 */
export function ReviewReplyForm({ id, initial }: { id: string; initial: string | null }) {
  const [state, action] = useActionState<AdminResult | null, FormData>(replyToReview.bind(null, id), null)

  return (
    <details className="mt-3" open={Boolean(initial)}>
      <summary className="cursor-pointer text-sm font-medium text-primary-text hover:underline">
        {initial ? 'Réponse de l’équipe' : 'Répondre publiquement'}
      </summary>
      <form action={action} className="mt-3 space-y-2">
        <ActionFeedback state={state} />
        <Textarea
          name="admin_reply"
          rows={3}
          maxLength={2000}
          defaultValue={initial ?? ''}
          placeholder="Merci pour votre retour…"
        />
        <SaveButton label="Enregistrer la réponse" />
      </form>
    </details>
  )
}
