import { cn } from '@/lib/utils'

/**
 * Le logo du site, ou son nom à défaut.
 *
 * Il figurait déjà dans l'en-tête et le pied publics, mais pas dans l'espace
 * membre ni dans la console : l'apprenant qui se connecte quittait la marque
 * à l'instant précis où il devient client. Un composant partagé plutôt que
 * trois copies, pour que le repli et les dimensions ne divergent pas.
 *
 * `next/image` n'est pas employé : le logo vient d'une URL arbitraire choisie
 * dans l'administration, et il faudrait déclarer chaque domaine possible dans
 * la configuration. La balise reçoit en revanche des dimensions explicites,
 * qui évitent le saut de mise en page au chargement.
 */
export function SiteLogo({
  siteName,
  logoUrl,
  className,
  height = 'h-8',
}: {
  siteName: string
  logoUrl: string | null
  className?: string
  /** Classe de hauteur Tailwind. La largeur suit le rapport de l'image. */
  height?: string
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={siteName}
        className={cn('w-auto object-contain', height, className)}
      />
    )
  }

  return (
    <span className={cn('text-lg font-bold tracking-[0.12em] text-primary-text', className)}>
      {siteName}
    </span>
  )
}
