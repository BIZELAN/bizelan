import { isVideoUrl } from '@/lib/media'
import { cn } from '@/lib/utils'

/**
 * Affiche une image OU une vidéo, selon l'adresse.
 *
 * Une vidéo choisie à la place d'une image se comporte comme une image
 * animée : lecture automatique, muette, en boucle, sans commandes — c'est
 * l'usage attendu d'une couverture ou d'un visuel de section. `playsInline`
 * évite le passage en plein écran sur iPhone.
 *
 * Aucun JavaScript : rendu côté serveur, utilisable partout.
 */
export function MediaView({
  src,
  alt = '',
  className,
  poster,
  loading,
}: {
  src: string
  alt?: string
  className?: string
  /** Image affichée pendant le chargement d'une vidéo. */
  poster?: string | null
  loading?: 'lazy' | 'eager'
}) {
  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        poster={poster ?? undefined}
        className={cn('object-cover', className)}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      />
    )
  }
  return <img src={src} alt={alt} className={className} loading={loading} />
}
