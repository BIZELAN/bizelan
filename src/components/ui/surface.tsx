import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Conteneurs du système sombre.
 *
 * Trois niveaux d'élévation seulement. Au-delà, l'œil ne distingue plus les
 * plans et la page paraît plate malgré les nuances : mieux vaut peu de
 * niveaux nettement séparés que beaucoup de niveaux voisins.
 */
type Elevation = 'flat' | 'raised' | 'floating'

const ELEVATIONS: Record<Elevation, string> = {
  flat: 'bg-canvas-subtle ring-1 ring-line',
  raised: 'bg-surface ring-1 ring-line shadow-e1',
  floating: 'bg-surface ring-1 ring-line-strong shadow-e2',
}

export function Panel({
  elevation = 'flat',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { elevation?: Elevation }) {
  return <div className={cn('rounded-lg', ELEVATIONS[elevation], className)} {...props} />
}

export function Card({
  elevation = 'raised',
  interactive,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { elevation?: Elevation; interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg',
        ELEVATIONS[elevation],
        interactive &&
          'transition-all duration-200 hover:-translate-y-1 hover:ring-primary/40 hover:shadow-e3',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Halos de couleur posés derrière un contenu sombre.
 * Purement décoratif, et sans image : deux dégradés flous coûtent quelques
 * octets là où une texture de fond coûterait plusieurs centaines de kilos.
 */
export function Glow({
  tone = 'brand',
  className,
}: {
  tone?: 'brand' | 'accent' | 'both'
  className?: string
}) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {(tone === 'brand' || tone === 'both') && (
        <div className="absolute -top-56 left-1/3 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      )}
      {(tone === 'accent' || tone === 'both') && (
        <div className="absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-3xl" />
      )}
    </div>
  )
}
