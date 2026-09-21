'use client'

import { useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Lecteur vidéo à déclenchement manuel.
 *
 * Le point important est `preload="none"` combiné au montage différé : tant
 * que le visiteur n'a pas cliqué, AUCUN octet de la vidéo n'est demandé. Une
 * balise <video> ordinaire, même sans lecture automatique, télécharge selon
 * les navigateurs les métadonnées voire le premier segment — plusieurs
 * mégaoctets imposés à chaque visite, pour une vidéo que la plupart des
 * visiteurs ne regarderont pas.
 *
 * L'affiche reste une simple image : légère, indexable, et elle occupe
 * exactement la place du lecteur, ce qui évite tout décalage de mise en page
 * au moment de la lecture.
 */
export function VideoPlayer({
  src,
  poster,
  title = 'Vidéo de présentation',
  className,
}: {
  src: string
  poster?: string | null
  title?: string
  className?: string
}) {
  const [started, setStarted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div
      className={cn(
        'relative aspect-video overflow-hidden rounded-panel bg-surface-950 ring-1 ring-surface-700',
        className,
      )}
    >
      {started ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster ?? undefined}
          controls
          autoPlay
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
        >
          Votre navigateur ne peut pas lire cette vidéo.{' '}
          <a href={src} download>
            La télécharger
          </a>
          .
        </video>
      ) : (
        <button
          type="button"
          onClick={() => setStarted(true)}
          aria-label={`Lire la vidéo : ${title}`}
          className="group absolute inset-0 h-full w-full"
        >
          {poster ? (
            <img
              src={poster}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <span className="absolute inset-0 bg-gradient-to-br from-brand-800 via-surface-900 to-surface-950" />
          )}

          {/* Voile : garantit le contraste du bouton quelle que soit l'affiche */}
          <span className="absolute inset-0 bg-surface-950/40 transition-colors group-hover:bg-surface-950/25" />

          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-500/90 text-white shadow-dark-lg ring-1 ring-brand-300/40 backdrop-blur transition-transform duration-200 group-hover:scale-110">
              <Play className="ml-1 h-8 w-8 fill-current" aria-hidden />
            </span>
          </span>

          <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-surface-950 to-transparent px-5 pb-4 pt-12 text-left">
            <span className="text-body font-medium text-onDark-hi">{title}</span>
          </span>
        </button>
      )}
    </div>
  )
}
