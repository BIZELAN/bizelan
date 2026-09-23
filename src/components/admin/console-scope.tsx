'use client'

import { useEffect } from 'react'

/**
 * Retire `data-console` de <html> en quittant le back-office.
 *
 * Le script d'amorçage du gabarit pose l'attribut avant la peinture, ce qui
 * évite un basculement visible de palette. Mais il ne s'exécute qu'au
 * chargement d'une page d'administration : une navigation CLIENT vers le site
 * public — « Voir le site », un lien du fil d'Ariane — ne le rejoue pas, et
 * l'attribut resterait posé. Le site public s'afficherait alors en cyan.
 *
 * Ce composant ne rend rien : il n'existe que pour son nettoyage au démontage,
 * qui survient précisément quand on sort du gabarit admin.
 */
export function ConsoleScope() {
  useEffect(() => {
    // Le script d'amorçage l'a normalement déjà posé. On le repose ici pour
    // le cas inverse : une navigation client DEPUIS le site public VERS
    // l'administration, où le script ne se rejoue pas davantage.
    document.documentElement.setAttribute('data-console', '')
    return () => document.documentElement.removeAttribute('data-console')
  }, [])

  return null
}
