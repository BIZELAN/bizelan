'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Mail, MessageCircle } from 'lucide-react'

import { markFollowedUp } from '@/app/actions/admin'
import { cn } from '@/lib/utils'

/**
 * Boutons de relance : ouvrent WhatsApp ou la messagerie avec un message
 * déjà rédigé, puis notent la relance au journal. L'envoi reste humain — il
 * part du téléphone de l'équipe, ce qui est la norme au Bénin et donne de
 * bien meilleurs taux de réponse qu'un e-mail automatique.
 */
export function FollowUpActions({
  kind,
  entityId,
  whatsappHref,
  mailHref,
  followedUpAt,
}: {
  kind: 'order' | 'learner' | 'review'
  entityId: string
  whatsappHref: string | null
  mailHref: string | null
  followedUpAt: string | null
}) {
  const [done, setDone] = useState(Boolean(followedUpAt))
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function note(channel: 'whatsapp' | 'email' | 'other') {
    startTransition(async () => {
      const result = await markFollowedUp(kind, entityId, channel)
      if (result.ok) {
        setDone(true)
        router.refresh()
      }
    })
  }

  const linkClass =
    'inline-flex h-8 items-center gap-1.5 rounded-md border border-line-control px-3 text-sm font-medium text-fg transition-colors duration-fast hover:bg-canvas-subtle'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => note('whatsapp')}
          className={linkClass}
        >
          <MessageCircle className="h-4 w-4 text-success" aria-hidden />
          WhatsApp
        </a>
      )}
      {mailHref && (
        <a href={mailHref} onClick={() => note('email')} className={linkClass}>
          <Mail className="h-4 w-4 text-fg-subtle" aria-hidden />
          E-mail
        </a>
      )}
      <button
        type="button"
        onClick={() => note('other')}
        disabled={pending || done}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors duration-fast',
          done ? 'text-success' : 'text-fg-subtle hover:bg-canvas-subtle hover:text-fg',
        )}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Check className="h-3.5 w-3.5" aria-hidden />
        )}
        {done ? 'Relancé' : 'Marquer relancé'}
      </button>
    </div>
  )
}
