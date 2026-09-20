'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Compteur de visites sans cookie.
 * L'identifiant de session vit dans sessionStorage : il disparaît à la
 * fermeture de l'onglet et ne permet pas de suivre un visiteur dans le temps.
 */
export function ViewTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return
    lastPath.current = pathname

    let sessionId: string | null = null
    try {
      sessionId = sessionStorage.getItem('bz_sid')
      if (!sessionId) {
        sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36)
        sessionStorage.setItem('bz_sid', sessionId)
      }
    } catch {
      // Navigation privée ou stockage bloqué : on continue sans identifiant.
    }

    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      sessionId,
    })

    // `keepalive` permet l'envoi même si la page se ferme juste après.
    void fetch('/api/vues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* une statistique perdue n'a aucune conséquence */
    })
  }, [pathname])

  return null
}
