import { Flame, Lock } from 'lucide-react'

import { Countdown } from '@/components/ui/countdown'
import type { OfferState } from '@/lib/scarcity'
import { cn } from '@/lib/utils'

/**
 * Bandeau d'urgence d'une offre, dans l'encart d'achat : compte à rebours en
 * direct et quantité restante. Quand l'offre n'est plus achetable (complet,
 * délai écoulé), il le dit à la place du bouton.
 */
export function OfferUrgency({ state, className }: { state: OfferState; className?: string }) {
  if (!state.purchasable) {
    return (
      <div className={cn('flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-subtle p-3.5 text-sm', className)}>
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
        <p className="font-medium text-fg">{state.unavailableReason}</p>
      </div>
    )
  }

  const lowStock = state.stockRemaining !== null && state.stockRemaining > 0
  if (!state.countdownEndsAt && !lowStock) return null

  return (
    <div className={cn('space-y-3 rounded-md border border-warning/40 bg-warning-subtle p-4', className)}>
      {state.countdownEndsAt && (
        <Countdown endsAt={state.countdownEndsAt} label={state.countdownLabel} size="sm" expiredText={null} />
      )}
      {lowStock && (
        <p className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-fg">
          <Flame className="h-4 w-4 text-warning" aria-hidden />
          Plus que {state.stockRemaining} {state.stockLabel}
        </p>
      )}
    </div>
  )
}
