import type { Scarcity } from '@/lib/types'

/**
 * État de rareté d'une offre : compte à rebours et quantité restante.
 * Pur — utilisable côté serveur (contrôle d'achat) comme à l'affichage.
 */
export interface OfferState {
  /** Date de fin à afficher (ISO), si le compte à rebours est en cours. */
  countdownEndsAt: string | null
  countdownLabel: string
  /** Délai écoulé ET réglé pour fermer la vente. */
  closed: boolean
  /** Quantité suivie et tombée à zéro. */
  soldOut: boolean
  /** Quantité restante, `null` si illimitée. */
  stockRemaining: number | null
  stockLabel: string
  /** L'offre peut-elle être achetée maintenant ? */
  purchasable: boolean
  /** Message à afficher quand elle ne l'est pas. */
  unavailableReason: string | null
}

export function offerState(item: Scarcity | null | undefined, now = Date.now()): OfferState {
  const endsAt = item?.countdown_ends_at ?? null
  const endTime = endsAt ? new Date(endsAt).getTime() : NaN
  const hasCountdown = Number.isFinite(endTime)
  const expired = hasCountdown && endTime <= now
  const closed = expired && Boolean(item?.countdown_closes_sale)

  const stock = typeof item?.stock_remaining === 'number' ? item.stock_remaining : null
  const soldOut = stock !== null && stock <= 0

  return {
    countdownEndsAt: hasCountdown && !expired ? endsAt : null,
    countdownLabel: item?.countdown_label?.trim() || 'L’offre se termine dans',
    closed,
    soldOut,
    stockRemaining: stock,
    stockLabel: item?.stock_label?.trim() || 'places restantes',
    purchasable: !closed && !soldOut,
    unavailableReason: soldOut
      ? 'Victime de son succès : il n’y a plus de place disponible.'
      : closed
        ? 'Les inscriptions sont closes : le délai de cette offre est écoulé.'
        : null,
  }
}
