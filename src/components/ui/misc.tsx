import * as React from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

/* --- Message d'état ------------------------------------------------------ */

type AlertTone = 'info' | 'success' | 'warning' | 'error'

const ALERT_STYLES: Record<AlertTone, { wrap: string; icon: React.ElementType }> = {
  info: { wrap: 'bg-sky-400/10 text-sky-200 ring-sky-400/25', icon: Info },
  success: { wrap: 'bg-emerald-400/10 text-emerald-200 ring-emerald-400/25', icon: CheckCircle2 },
  warning: { wrap: 'bg-amber-400/10 text-amber-200 ring-amber-400/25', icon: TriangleAlert },
  error: { wrap: 'bg-red-400/10 text-red-200 ring-red-400/25', icon: AlertCircle },
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: AlertTone
  title?: string
  children?: React.ReactNode
  className?: string
}) {
  const { wrap, icon: Icon } = ALERT_STYLES[tone]
  return (
    <div
      className={cn(
        'flex gap-3 rounded-control px-4 py-3 text-body ring-1 ring-inset',
        wrap,
        className,
      )}
    >
      <Icon className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden />
      <div className="min-w-0 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  )
}

/* --- Zone vide ------------------------------------------------------------ */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-surface-600 bg-surface-900/50 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && <Icon className="mb-3 h-9 w-9 text-onDark-lo" aria-hidden />}
      <p className="font-medium text-onDark-hi">{title}</p>
      {description && <p className="mt-1.5 max-w-md text-body text-onDark-md">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* --- Barre de progression ------------------------------------------------- */

export function ProgressBar({
  value,
  className,
  showLabel,
}: {
  value: number
  className?: string
  showLabel?: boolean
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-700"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-pill bg-brand-400 transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="w-10 shrink-0 text-right text-meta font-semibold tabular-nums text-onDark-md">
          {clamped}%
        </span>
      )}
    </div>
  )
}

/* --- En-tête de section publique ------------------------------------------ */

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'center' | 'left'
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-10 max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-h2 sm:text-h1">{title}</h2>
      {subtitle && <p className="mt-4 text-body-lg text-onDark-md">{subtitle}</p>}
    </div>
  )
}

/* --- Étoiles d'avis -------------------------------------------------------- */

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn('flex gap-0.5', className)} aria-label={`${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 20 20"
          className={cn('h-4 w-4', n <= rating ? 'fill-accent-400' : 'fill-surface-600')}
          aria-hidden
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </div>
  )
}
