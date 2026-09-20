'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Apparition à l'entrée dans le champ de vision.
 *
 * Point important : le contenu est visible par défaut et n'est masqué que si
 * le script s'exécute ET que le mouvement est accepté. Un visiteur sans
 * JavaScript, ou un robot d'indexation, voit donc une page complète — l'erreur
 * classique de ce type d'effet est de laisser du contenu à `opacity: 0`.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  /** Décalage en millisecondes, pour faire apparaître une grille en cascade. */
  delay?: number
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [armed, setArmed] = React.useState(false)
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const el = ref.current
    if (!el) return

    setArmed(true)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        armed && 'transition-[opacity,transform] duration-700 ease-out',
        armed && !shown && 'translate-y-4 opacity-0',
        armed && shown && 'translate-y-0 opacity-100',
        className,
      )}
    >
      {children}
    </div>
  )
}
