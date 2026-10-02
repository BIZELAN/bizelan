'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/** Délai avant d'afficher quoi que ce soit : une page en cache s'ouvre sans clignoter. */
const SHOW_AFTER_MS = 120
/** Au-delà, une pastille « Chargement… » confirme que le clic a été pris en compte. */
const BADGE_AFTER_MS = 600
/** Filet de sécurité : jamais d'écran bloqué si la navigation échoue en silence. */
const GIVE_UP_AFTER_MS = 10000

/** Démarre l'indicateur depuis du code (ex. `router.push` après une action). */
export function startNavigationProgress() {
  window.dispatchEvent(new Event('bz:navigation-start'))
}

/**
 * Indicateur de navigation, sur tout le site.
 *
 * Le routeur de Next ne signale pas le début d'une navigation : entre le clic
 * et l'affichage de la page suivante, rien ne bougeait. Sur une connexion
 * mobile lente, le visiteur recliquait — deux, trois fois — croyant que le
 * premier clic n'avait pas porté.
 *
 * Dès qu'un lien interne est cliqué :
 *   · une barre de progression parcourt le haut de l'écran ;
 *   · un voile transparent bloque les clics répétés (curseur d'attente) ;
 *   · au-delà de 0,6 s, une pastille « Chargement… » s'affiche.
 * Tout disparaît quand l'adresse a changé, c'est-à-dire quand la nouvelle
 * page est là.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<'idle' | 'loading' | 'slow' | 'done'>('idle')
  const timers = useRef<number[]>([])
  const active = useRef(false)

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  // Nouvelle adresse : la page est arrivée.
  useEffect(() => {
    if (!active.current) return
    active.current = false
    clearTimers()
    setPhase('done')
    const t = window.setTimeout(() => setPhase('idle'), 250)
    timers.current.push(t)
  }, [pathname, searchParams])

  useEffect(() => {
    const start = () => {
      if (active.current) return
      active.current = true
      clearTimers()
      timers.current.push(
        window.setTimeout(() => active.current && setPhase('loading'), SHOW_AFTER_MS),
        window.setTimeout(() => active.current && setPhase('slow'), BADGE_AFTER_MS),
        window.setTimeout(() => {
          active.current = false
          setPhase('idle')
        }, GIVE_UP_AFTER_MS),
      )
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = (event.target as Element | null)?.closest?.('a')
      if (!anchor || !anchor.href) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download') || anchor.dataset.noProgress !== undefined) return

      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      if (!/^https?:$/.test(url.protocol)) return
      // Simple ancre dans la même page, ou même adresse : pas de navigation.
      const same = url.pathname === window.location.pathname && url.search === window.location.search
      if (same) return
      // Les routes d'API et de fichiers ne changent pas de page.
      if (url.pathname.startsWith('/api/')) return

      start()
    }

    // Retour arrière / avant du navigateur.
    const onPopState = () => start()

    document.addEventListener('click', onClick)
    window.addEventListener('popstate', onPopState)
    window.addEventListener('bz:navigation-start', start)
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('bz:navigation-start', start)
      clearTimers()
    }
  }, [])

  if (phase === 'idle') return null

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden print:hidden"
      >
        <div
          className={
            phase === 'done'
              ? 'h-full w-full bg-primary-text opacity-0 transition-[opacity,width] duration-300'
              : 'bz-nav-progress h-full bg-primary-text shadow-[0_0_8px_rgb(var(--primary-text))]'
          }
        />
      </div>

      {phase !== 'done' && (
        // Voile transparent : absorbe les clics répétés pendant le chargement.
        <div aria-hidden className="fixed inset-0 z-[99] cursor-progress print:hidden" />
      )}

      {phase === 'slow' && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-pill border border-line bg-surface-raised px-4 py-2 text-sm font-medium text-fg shadow-e3 print:hidden"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-primary-text" />
          Chargement…
        </div>
      )}
    </>
  )
}
