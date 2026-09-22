import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Enveloppe de section et son en-tête.
 *
 * Les tons `light` et `brand` ont été retirés, ainsi que le `tone` de
 * `SectionHeader` : aucun n'était utilisé, et les jetons de rôle les rendent
 * inutiles — une section suit le thème sans qu'on ait à le lui dire.
 *
 * Il reste trois profondeurs, qui suffisent à rythmer une page : le fond de
 * page, un cran en retrait, et la même nuance pour les zones denses.
 */
export type SectionTone = 'base' | 'raised' | 'panel'

const TONES: Record<SectionTone, string> = {
  base: 'bg-canvas text-fg-muted',
  raised: 'bg-canvas-subtle text-fg-muted',
  panel: 'bg-canvas-subtle text-fg-muted',
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
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  align?: 'left' | 'center'
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
        <h2 className="mt-3 text-xl text-fg sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-4 text-md text-fg-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
