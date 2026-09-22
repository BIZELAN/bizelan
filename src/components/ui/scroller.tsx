'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Défileur horizontal à accroche.
 *
 * Préféré à une bibliothèque de carrousel : le défilement natif reste
 * utilisable au doigt, à la molette et au clavier, il ne charge aucun
 * JavaScript supplémentaire, et il se dégrade proprement si le script ne
 * s'exécute pas — les flèches disparaissent, le contenu reste défilable.
 */
export function Scroller({
  children,
  itemClassName,
  className,
  ariaLabel,
}: {
  children: React.ReactNode
  /** Largeur de chaque élément, ex. « w-[19rem] sm:w-[22rem] ». */
  itemClassName?: string
  className?: string
  ariaLabel?: string
}) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = React.useState(true)
  const [atEnd, setAtEnd] = React.useState(false)

  const sync = React.useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setAtStart(el.scrollLeft <= 4)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
  }, [])

  React.useEffect(() => {
    const el = trackRef.current
    if (!el) return
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      el.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [sync])

  const nudge = (direction: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8), behavior: 'smooth' })
  }

  const items = React.Children.toArray(children)

  return (
    <div className={cn('relative', className)}>
      <div
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2"
      >
        {items.map((child, index) => (
          <div key={index} className={cn('shrink-0 snap-start', itemClassName ?? 'w-[20rem]')}>
            {child}
          </div>
        ))}
      </div>

      <ScrollButton side="left" hidden={atStart} onClick={() => nudge(-1)} />
      <ScrollButton side="right" hidden={atEnd} onClick={() => nudge(1)} />
    </div>
  )
}

function ScrollButton({
  side,
  hidden,
  onClick,
}: {
  side: 'left' | 'right'
  hidden: boolean
  onClick: () => void
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Éléments précédents' : 'Éléments suivants'}
      // Masqué aux lecteurs d'écran ET au clavier quand il ne sert à rien :
      // le défilement reste accessible par la zone elle-même.
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      className={cn(
        'absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full',
        'bg-surface/90 text-fg ring-1 ring-line-strong backdrop-blur transition-all',
        'hover:bg-canvas-subtle md:inline-flex',
        side === 'left' ? '-left-3' : '-right-3',
        hidden && 'pointer-events-none opacity-0',
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  )
}
