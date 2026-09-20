import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Étiquette de statut.
 *
 * Transposée sur fond sombre : un aplat pastel y deviendrait une tache
 * lumineuse. Chaque ton est donc un voile translucide de sa propre couleur,
 * avec le texte dans une teinte claire de la même famille — la couleur reste
 * lisible comme signal sans attirer l'œil plus que le contenu.
 */
type Tone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-700/70 text-onDark-md ring-surface-600',
  brand: 'bg-brand-400/12 text-brand-300 ring-brand-400/30',
  accent: 'bg-accent-400/12 text-accent-300 ring-accent-400/30',
  success: 'bg-emerald-400/12 text-emerald-300 ring-emerald-400/30',
  warning: 'bg-amber-400/12 text-amber-300 ring-amber-400/30',
  danger: 'bg-red-400/12 text-red-300 ring-red-400/30',
  info: 'bg-sky-400/12 text-sky-300 ring-sky-400/30',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}

/* --- Correspondances statut → apparence, réutilisées dans tout l'admin --- */

export const ORDER_STATUS_LABELS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'En cours', tone: 'neutral' },
  awaiting_payment: { label: 'En attente de paiement', tone: 'warning' },
  paid: { label: 'Payée', tone: 'success' },
  failed: { label: 'Échouée', tone: 'danger' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
  refunded: { label: 'Remboursée', tone: 'info' },
}

export const CONTENT_STATUS_LABELS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Brouillon', tone: 'warning' },
  published: { label: 'Publié', tone: 'success' },
  archived: { label: 'Archivé', tone: 'neutral' },
}

export const QUOTE_STATUS_LABELS: Record<string, { label: string; tone: Tone }> = {
  new: { label: 'Nouvelle', tone: 'info' },
  in_progress: { label: 'En cours', tone: 'warning' },
  won: { label: 'Gagnée', tone: 'success' },
  lost: { label: 'Perdue', tone: 'neutral' },
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  kkiapay: 'Mobile Money',
  bank_transfer: 'Dépôt / virement',
  manual: 'Ajout manuel',
  free: 'Gratuit',
}

export function StatusBadge({
  status,
  map,
}: {
  status: string
  map: Record<string, { label: string; tone: Tone }>
}) {
  const entry = map[status] ?? { label: status, tone: 'neutral' as Tone }
  return <Badge tone={entry.tone}>{entry.label}</Badge>
}
