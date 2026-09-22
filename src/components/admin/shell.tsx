import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/* --- En-tête de page ------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
}: {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-7">
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-base font-medium text-fg-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel ?? 'Retour'}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg text-fg sm:text-xl">{title}</h1>
          {description && <p className="mt-1.5 text-base text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/* --- Tableau -------------------------------------------------------------- */

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border border-line bg-surface',
        className,
      )}
    >
      <table className="w-full min-w-[640px] border-collapse text-left text-base">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'border-b border-line bg-canvas-subtle px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-fg-subtle',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn('border-b border-line px-4 py-3 align-middle', className)}
    >
      {children}
    </td>
  )
}

/* --- Tuile de statistique ------------------------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  trend,
}: {
  label: string
  value: string | number
  hint?: string
  icon?: React.ElementType
  tone?: 'neutral' | 'brand' | 'accent'
  /** Variation en pourcentage par rapport à la période précédente. */
  trend?: number | null
}) {
  const hasTrend = typeof trend === 'number' && Number.isFinite(trend)
  const rising = hasTrend && trend > 0

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-medium text-fg-muted">{label}</p>
        {Icon && (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
              tone === 'brand' && 'bg-primary-subtle text-primary',
              tone === 'accent' && 'bg-accent/10 text-accent',
              tone === 'neutral' && 'bg-canvas-subtle text-fg-muted',
            )}
          >
            <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
          </span>
        )}
      </div>

      <p className="mt-2 text-xl font-bold tabular-nums text-fg">{value}</p>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        {hasTrend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold tabular-nums',
              rising ? 'text-success' : 'text-danger',
            )}
          >
            {rising ? (
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" aria-hidden />
            )}
            {rising ? '+' : ''}
            {Math.round(trend)} %
          </span>
        )}
        {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
      </div>
    </div>
  )
}

/* --- Panneau de formulaire ------------------------------------------------ */

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-lg border border-line bg-surface p-6', className)}>
      <div className="mb-5">
        <h2 className="text-lg text-fg">{title}</h2>
        {description && <p className="mt-1 text-base text-fg-muted">{description}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

/* --- Barre d'enregistrement collante -------------------------------------- */

/**
 * Se colle en bas de la fenêtre pendant la saisie.
 *
 * Sur les formulaires longs de ce back-office — une formation compte une
 * trentaine de champs — le bouton d'enregistrement se retrouvait sous la ligne
 * de flottaison, obligeant à redescendre après chaque modification.
 */
export function FormActions({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-30 -mx-5 mt-6 flex flex-wrap items-center justify-end gap-3',
        'border-t border-line bg-canvas-subtle/95 px-5 py-3.5 backdrop-blur sm:-mx-7 sm:px-7',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* --- Squelette de chargement ---------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      // Le dégradé lit les variables directement : `theme()` ne sait pas
      // résoudre un jeton porteur d'un `<alpha-value>`.
      className={cn(
        'animate-shimmer rounded-md bg-[length:200%_100%]',
        'bg-[linear-gradient(90deg,rgb(var(--bg-subtle))_25%,rgb(var(--border))_50%,rgb(var(--bg-subtle))_75%)]',
        className,
      )}
      aria-hidden
    />
  )
}

/** Silhouette d'un tableau pendant le chargement. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="border-b border-line bg-canvas-subtle px-4 py-3">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
