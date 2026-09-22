import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Enveloppe de section et son en-tête.
 *
 * Le `tone` est un jeton, pas une classe écrite en dur : basculer une section
 * du sombre au clair reste un changement d'un mot, y compris depuis l'admin
 * via les blocs de page.
 */
export type SectionTone = 'base' | 'raised' | 'panel' | 'light' | 'brand'

const TONES: Record<SectionTone, string> = {
  base: 'bg-canvas text-fg-muted',
  raised: 'bg-canvas-subtle text-fg-muted',
  panel: 'bg-canvas-subtle text-fg-muted',
  light: 'bg-white text-ink-700',
  brand: 'bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 text-brand-50',
}

export function Section({
  tone = 'base',
  size = 'md',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { tone?: SectionTone; size?: 'md' | 'lg' }) {
  return (
    <section
      className={cn('relative', TONES[tone], size === 'lg' ? 'section-lg' : 'section', className)}
      {...props}
    >
      {children}
    </section>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  align = 'left',
  tone = 'dark',
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  align?: 'left' | 'center'
  tone?: 'dark' | 'light'
  className?: string
}) {
  const centered = align === 'center'

  return (
    <div
      className={cn(
        'mb-11 flex flex-wrap items-end gap-5',
        centered ? 'flex-col justify-center text-center' : 'justify-between',
        className,
      )}
    >
      <div className={cn(centered ? 'max-w-2xl' : 'max-w-xl')}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2
          className={cn(
            'mt-3 text-xl sm:text-2xl',
            tone === 'light' ? 'text-ink-950' : 'text-fg',
          )}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={cn(
              'mt-4 text-md',
              tone === 'light' ? 'text-ink-600' : 'text-fg-muted',
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
