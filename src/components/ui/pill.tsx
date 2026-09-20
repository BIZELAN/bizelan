import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Pastille à rayon plein — étiquette, statut, filtre.
 *
 * Sur fond sombre les aplats saturés écrasent le texte : chaque ton est donc
 * un fond translucide de sa propre couleur, avec le texte dans une teinte
 * claire de la même famille. L'anneau interne suffit à détacher la forme.
 */
type Tone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-700/70 text-onDark-md ring-surface-600',
  brand: 'bg-brand-400/12 text-brand-300 ring-brand-400/30',
  accent: 'bg-accent-400/12 text-accent-300 ring-accent-400/30',
  success: 'bg-emerald-400/12 text-emerald-300 ring-emerald-400/30',
  warning: 'bg-amber-400/12 text-amber-300 ring-amber-400/30',
  danger: 'bg-red-400/12 text-red-300 ring-red-400/30',
}

const SIZES = {
  sm: 'px-2.5 py-0.5 text-[0.75rem]',
  md: 'px-3.5 py-1 text-meta',
  lg: 'px-4 py-1.5 text-body',
} as const

export function Pill({
  tone = 'neutral',
  size = 'md',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; size?: keyof typeof SIZES }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill font-medium ring-1 ring-inset',
        TONES[tone],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
}

/** Variante cliquable, pour les filtres de catalogue. */
export function PillButton({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-body font-medium ring-1 ring-inset transition-colors',
        active
          ? 'bg-brand-400 text-surface-950 ring-brand-400'
          : 'bg-surface-800 text-onDark-md ring-surface-700 hover:bg-surface-700 hover:text-onDark-hi',
        className,
      )}
      {...props}
    />
  )
}
