'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronUp, Lock, PlayCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { VideoSurface } from '@/components/ui/video-player'
import type { PlayableVideo } from '@/lib/video'
import { cn, formatDuration } from '@/lib/utils'

/**
 * Une ligne du programme, sur la page de vente d'une formation.
 *
 * Elle existe parce que l'aperçu gratuit était une promesse creuse. La page
 * affichait la pastille « Aperçu gratuit » et une icône de lecture, mais le
 * `openable` qui les commandait ne servait qu'à CHOISIR L'ICÔNE : aucun lien,
 * aucun lecteur. Le visiteur cliquait sur une ligne inerte.
 *
 * L'aperçu se déplie sous la ligne plutôt que d'ouvrir une page : le visiteur
 * est en train de décider d'un achat, et l'envoyer ailleurs lui fait perdre
 * l'encart de prix et le programme. C'est le même parti que le lecteur de
 * documents de l'espace membre.
 */
export function LessonRow({
  title,
  durationSeconds,
  isPreview,
  enrolled,
  href,
  playable,
}: {
  title: string
  durationSeconds: number
  isPreview: boolean
  enrolled: boolean
  /** Destination pour un apprenant déjà inscrit. */
  href: string
  /** Vidéo d'aperçu, déjà résolue et signée. `null` s'il n'y en a pas. */
  playable: PlayableVideo | null
}) {
  const [open, setOpen] = useState(false)

  const duration = durationSeconds > 0 ? formatDuration(durationSeconds) : null
  const previewable = isPreview && !enrolled && playable !== null

  const body = (
    <>
      {enrolled || isPreview ? (
        open ? (
          <ChevronUp className="h-[1.125rem] w-[1.125rem] shrink-0 text-primary-text" aria-hidden />
        ) : (
          <PlayCircle className="h-[1.125rem] w-[1.125rem] shrink-0 text-primary-text" aria-hidden />
        )
      ) : (
        <Lock className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
      )}

      <span className="min-w-0 flex-1 text-left text-[0.9375rem] text-fg">
        {title}
        {isPreview && !enrolled && (
          <Badge tone="success" className="ml-2">
            {/* La pastille annonce ce qui est réellement disponible. Quand la
                leçon est marquée en aperçu mais qu'aucune vidéo n'y est
                attachée, promettre « Aperçu gratuit » serait mentir une
                seconde fois. */}
            {previewable ? 'Aperçu gratuit' : 'Aperçu bientôt'}
          </Badge>
        )}
      </span>

      {duration && (
        <span className="shrink-0 text-xs tabular-nums text-fg-subtle">{duration}</span>
      )}
    </>
  )

  const row = 'flex w-full items-center gap-3 px-5 py-3.5 text-left'
  const interactive = 'transition-colors duration-fast hover:bg-canvas-subtle'

  if (enrolled) {
    return (
      <li>
        <Link href={href} className={cn(row, interactive)}>
          {body}
        </Link>
      </li>
    )
  }

  if (!previewable) {
    return <li className={row}>{body}</li>
  }

  return (
    <li>
      <button type="button" onClick={() => setOpen((v) => !v)} className={cn(row, interactive)}>
        {body}
      </button>

      {open && (
        <div className="px-5 pb-5">
          <VideoSurface playable={playable} title={title} />
          <p className="mt-2.5 text-xs text-fg-subtle">
            Aperçu gratuit de cette leçon. Le reste du programme est accessible après l’achat.
          </p>
        </div>
      )}
    </li>
  )
}
