import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Bandeau défilant en boucle, sans JavaScript.
 *
 * Le contenu est dupliqué une fois et la piste translate de -50 % : à la fin
 * du cycle, la copie se trouve exactement là où était l'original, la boucle
 * est donc invisible. Le duplicata est masqué aux lecteurs d'écran pour ne pas
 * annoncer deux fois la même liste.
 *
 * L'animation s'arrête d'elle-même si l'utilisateur a demandé moins de
 * mouvement (règle globale dans `globals.css`).
 */
export function Marquee({
  children,
  speed = 'normal',
  className,
}: {
  children: React.ReactNode
  speed?: 'slow' | 'normal' | 'fast'
  className?: string
}) {
  const duration = { slow: '60s', normal: '40s', fast: '25s' }[speed]
  const items = React.Children.toArray(children)

  const track = (hidden: boolean) => (
    <ul
      className="flex shrink-0 items-center gap-12 pr-12"
      aria-hidden={hidden || undefined}
      role={hidden ? 'presentation' : undefined}
    >
      {items.map((child, index) => (
        <li key={index} className="shrink-0">
          {child}
        </li>
      ))}
    </ul>
  )

  return (
    <div className={cn('scroll-fade group relative overflow-hidden', className)}>
      <div
        className="flex w-max animate-marquee group-hover:[animation-play-state:paused]"
        style={{ animationDuration: duration }}
      >
        {track(false)}
        {track(true)}
      </div>
    </div>
  )
}
