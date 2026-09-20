import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Boutons du système sombre.
 *
 * Les variantes sont pensées pour un fond sombre, qui est celui de presque
 * tout le site. Deux variantes `*OnLight` restent disponibles pour les rares
 * zones claires — corps d'articles de blog, pages légales.
 *
 * Sur fond sombre, l'ocre et le vert clair sont si lumineux qu'un texte blanc
 * dessus passe sous le seuil de contraste : ces deux variantes portent donc un
 * texte sombre, ce qui donne au passage le contraste le plus fort de la page
 * sur l'action principale.
 */
type Variant =
  | 'primary'
  | 'accent'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'primaryOnLight'
  | 'outlineOnLight'

type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600 shadow-dark-sm',
  accent: 'bg-accent-400 text-surface-950 hover:bg-accent-300 active:bg-accent-500 shadow-dark-sm',
  secondary: 'bg-surface-700 text-onDark-hi hover:bg-surface-600 active:bg-surface-700',
  outline:
    'border border-surface-600 text-onDark-hi hover:border-brand-400/50 hover:bg-surface-800 active:bg-surface-700',
  ghost: 'text-onDark-md hover:bg-surface-800 hover:text-onDark-hi',
  danger: 'bg-red-500 text-white hover:bg-red-400 active:bg-red-600 shadow-dark-sm',

  primaryOnLight: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-sm',
  outlineOnLight:
    'border border-ink-300 bg-white text-ink-900 hover:bg-ink-50 active:bg-ink-100',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-meta gap-1.5',
  md: 'h-11 px-5 text-body gap-2',
  lg: 'h-13 px-7 py-3.5 text-base gap-2.5',
}

const BASE =
  'inline-flex items-center justify-center rounded-control font-semibold transition-colors ' +
  'disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  fullWidth,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    />
  )
}

export interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

export function ButtonLink({
  className,
  variant = 'primary',
  size = 'md',
  fullWidth,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    />
  )
}
