'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Check, Loader2, Send } from 'lucide-react'

import { subscribeNewsletter, type ActionResult } from '@/app/actions/public'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="S’inscrire"
      className="shrink-0 rounded-control bg-brand-500 px-3.5 py-2.5 text-white transition-colors hover:bg-brand-400 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Send className="h-4 w-4" aria-hidden />
      )}
    </button>
  )
}

export function NewsletterForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(subscribeNewsletter, null)

  if (state?.ok) {
    return (
      <p className="flex items-center gap-2 text-sm text-brand-400">
        <Check className="h-4 w-4 shrink-0" aria-hidden />
        {state.message}
      </p>
    )
  }

  return (
    <form action={action}>
      <input type="hidden" name="source" value="footer" />
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="votre@email.com"
          aria-label="Votre adresse e-mail"
          className="min-w-0 flex-1 rounded-control border border-surface-600 bg-surface-950 px-3.5 py-2.5 text-body text-onDark-hi placeholder:text-onDark-lo focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        <Submit />
      </div>
      {state && !state.ok && <p className="mt-2 text-xs text-red-400">{state.message}</p>}
    </form>
  )
}
