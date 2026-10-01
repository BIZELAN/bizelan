import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Étiquette de statut — composant unique du système.
 *
 * Remplace l'ancien couple `Badge` / `Pill`, qui remplissaient le même rôle
 * avec deux échelles de tons presque identiques.
 *
 * Chaque ton est un fond doux surmonté d'un texte de la même famille, jamais
 * un aplat saturé : une étiquette signale un état, elle ne doit pas capter
 * l'œil plus que le contenu qu'elle qualifie.
 */
export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-pill font-medium ring-1 ring-inset',
  {
    variants: {
      tone: {
        neutral: 'bg-canvas-subtle text-fg-muted ring-line',
        primary: 'bg-primary-subtle text-primary-text ring-primary-text/25',
        accent: 'bg-secondary-subtle text-secondary-text ring-secondary-text/25',
        success: 'bg-success-subtle text-success ring-success/25',
        warning: 'bg-warning-subtle text-warning ring-warning/25',
        danger: 'bg-danger-subtle text-danger ring-danger/25',
        info: 'bg-info-subtle text-info ring-info/25',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  },
)

type Tone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ tone, size, className, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
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
  saspay: 'Mobile Money',
  // Anciens prestataires, conservés : les commandes déjà encaissées les portent.
  chariow: 'Paiement en ligne (ancien prestataire)',
  kkiapay: 'Mobile Money (ancien prestataire)',
  bank_transfer: 'Dépôt / virement',
  manual: 'Ajout manuel',
  free: 'Gratuit',
}

/** Rôles des comptes, en français — `admin` ou `editor` n'ont rien à faire à l'écran. */
export const ROLE_LABELS: Record<string, { label: string; tone: Tone }> = {
  client: { label: 'Client', tone: 'neutral' },
  editor: { label: 'Éditeur', tone: 'primary' },
  admin: { label: 'Administrateur', tone: 'accent' },
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
