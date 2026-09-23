'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { saveVideoPosition, setLessonCompleted } from '@/app/actions/learning'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface PlayerSource {
  provider: 'bunny' | 'youtube' | 'vimeo' | 'url' | null
  videoId: string | null
  videoUrl: string | null
  bunnyHostname?: string
}

/** Construit l'URL d'intégration selon l'hébergeur vidéo choisi. */
export function embedUrlFor(source: PlayerSource): string | null {
  const { provider, videoId, videoUrl, bunnyHostname } = source

  if (provider === 'youtube' && videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`
  }
  if (provider === 'vimeo' && videoId) {
    return `https://player.vimeo.com/video/${videoId}`
  }
  if (provider === 'bunny' && videoId && bunnyHostname) {
    return `https://${bunnyHostname}/embed/${videoId}`
  }
  if (provider === 'url' && videoUrl) return videoUrl

  // Repli : une URL YouTube collée telle quelle dans l'admin
  if (videoUrl) {
    const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/.exec(videoUrl)
    if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1`
    const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(videoUrl)
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
    return videoUrl
  }

  return null
}

export function VideoFrame({
  source,
  title,
  lessonId,
  courseId,
  resumeAt = 0,
}: {
  source: PlayerSource
  title: string
  lessonId?: string
  courseId?: string
  resumeAt?: number
}) {
  const url = embedUrlFor(source)
  const isDirectFile = Boolean(url && /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url))
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastSaved = useRef(0)

  // Reprise de lecture et mémorisation de la position (fichiers directs uniquement :
  // les lecteurs intégrés YouTube/Vimeo ne laissent pas lire leur position).
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isDirectFile) return

    if (resumeAt > 5) {
      const onReady = () => {
        if (video.currentTime < 1) video.currentTime = resumeAt
      }
      video.addEventListener('loadedmetadata', onReady, { once: true })
    }

    if (!lessonId || !courseId) return

    const onTimeUpdate = () => {
      const now = Math.floor(video.currentTime)
      // Un enregistrement toutes les 15 secondes suffit largement.
      if (now - lastSaved.current >= 15) {
        lastSaved.current = now
        void saveVideoPosition(lessonId, courseId, now)
      }
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    return () => video.removeEventListener('timeupdate', onTimeUpdate)
  }, [isDirectFile, lessonId, courseId, resumeAt])

  if (!url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-canvas text-center text-sm text-fg-subtle">
        <p className="max-w-sm px-6">
          La vidéo de cette leçon n’est pas encore en ligne. Elle sera ajoutée prochainement.
        </p>
      </div>
    )
  }

  return (
    <div className="aspect-video overflow-hidden rounded-lg bg-canvas">
      {isDirectFile ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          src={url}
          controls
          controlsList="nodownload"
          className="h-full w-full"
        />
      ) : (
        <iframe
          src={url}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )}
    </div>
  )
}

/**
 * Barre d'actions de fin de leçon.
 *
 * Elle réunit les trois gestes qui closent une leçon — revenir, marquer comme
 * terminée, avancer — là où ils avaient un sens : SOUS le contenu. Le bouton
 * « Marquer comme terminée » était placé juste sous la vidéo, au-dessus des
 * notes et des supports : on demandait de conclure avant d'avoir lu.
 *
 * La navigation précédente/suivante est rendue ici plutôt qu'en bas de page,
 * pour que l'apprenant n'ait pas à choisir entre deux rangées de liens qui
 * font la même chose.
 */
export function LessonActions({
  lessonId,
  courseId,
  courseSlug,
  initialCompleted,
  previousHref,
  previousLabel,
  nextHref,
  nextLabel,
}: {
  lessonId: string
  courseId: string
  courseSlug: string
  initialCompleted: boolean
  previousHref: string | null
  previousLabel: string | null
  nextHref: string | null
  nextLabel: string | null
}) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function toggle(goNext: boolean) {
    const target = goNext ? true : !completed
    startTransition(async () => {
      const result = await setLessonCompleted(lessonId, courseId, courseSlug, target)
      if (!result.ok) {
        setError(result.message ?? 'Enregistrement impossible.')
        return
      }
      setCompleted(target)
      setError(null)
      if (goNext && nextHref) router.push(nextHref)
      else router.refresh()
    })
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          onClick={() => toggle(false)}
          disabled={pending}
          variant={completed ? 'outline' : 'primary'}
          size="lg"
        >
          {pending ? (
            <Loader2 className="h-[1.125rem] w-[1.125rem] animate-spin" aria-hidden />
          ) : (
            <Check
              className={cn('h-[1.125rem] w-[1.125rem]', completed && 'text-primary-text')}
              aria-hidden
            />
          )}
          {completed ? 'Leçon terminée' : 'Marquer comme terminée'}
        </Button>

        {nextHref && (
          <Button
            type="button"
            onClick={() => toggle(true)}
            disabled={pending}
            variant="accent"
            size="lg"
          >
            Terminer et continuer
            <ArrowRight className="h-[1.125rem] w-[1.125rem]" aria-hidden />
          </Button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {(previousHref || nextHref) && (
        <div className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
          {/* Chaque lien annonce OÙ il mène. Les flèches nues « ← titre » ne
              disaient pas s'il s'agissait d'une leçon, d'un module ou du
              cours, et se chevauchaient sur mobile. */}
          {previousHref ? (
            <Link href={previousHref} className={NEIGHBOUR}>
              <ArrowLeft className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
              <span className="min-w-0">
                <span className="block text-xs text-fg-subtle">Leçon précédente</span>
                <span className="mt-0.5 block truncate font-medium text-fg">{previousLabel}</span>
              </span>
            </Link>
          ) : (
            <span aria-hidden />
          )}

          {nextHref && (
            <Link href={nextHref} className={cn(NEIGHBOUR, 'sm:text-right')}>
              <span className="min-w-0 sm:order-1 sm:ml-auto">
                <span className="block text-xs text-fg-subtle">Leçon suivante</span>
                <span className="mt-0.5 block truncate font-medium text-fg">{nextLabel}</span>
              </span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle sm:order-2" aria-hidden />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

const NEIGHBOUR =
  'flex items-start gap-2.5 rounded-md border border-line px-4 py-3 text-sm ' +
  'transition-colors duration-fast hover:border-line-control hover:bg-canvas-subtle'
