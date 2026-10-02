'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { YouTubePlayer } from '@/components/ui/youtube-player'
import { describeUploadError, uploadToLibrary } from '@/lib/media-upload'
import { VIDEO_IFRAME_ALLOW, youtubeIdFromEmbed, type PlayableVideo } from '@/lib/video'

/**
 * Aperçu d'une vidéo dans l'administration, avant de l'enregistrer.
 *
 * Pour un fichier (déposé ou lien MP4), deux aides en plus :
 *   · la durée est lue dans le fichier et transmise (`onDuration`) — plus
 *     besoin de la saisir à la main ;
 *   · « Utiliser cette image » capture l'image affichée à l'instant et la
 *     dépose comme miniature.
 */
export function VideoPreview({
  source,
  poster,
  onDuration,
  onPosterCaptured,
}: {
  /** `src` (URL ou URI storage://) ou fournisseur + identifiant. */
  source: { src: string } | { provider: string; id: string } | null
  poster?: string | null
  onDuration?: (seconds: number) => void
  onPosterCaptured?: (url: string) => void
}) {
  const [playable, setPlayable] = useState<PlayableVideo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [reload, setReload] = useState(0)
  const video = useRef<HTMLVideoElement>(null)

  const key = source ? ('src' in source ? source.src : `${source.provider}:${source.id}`) : ''

  useEffect(() => {
    if (!source || !key) {
      setPlayable(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const query =
      'src' in source
        ? `src=${encodeURIComponent(source.src)}`
        : `provider=${encodeURIComponent(source.provider)}&id=${encodeURIComponent(source.id)}`
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/video-preview?${query}`)
        const payload = (await response.json()) as { playable?: PlayableVideo; error?: string }
        if (cancelled) return
        if (!response.ok || !payload.playable) {
          setPlayable(null)
          setError(payload.error ?? 'Aperçu indisponible.')
        } else setPlayable(payload.playable)
      } catch {
        if (!cancelled) setError('Aperçu indisponible : vérifiez votre connexion.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 400)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reload])

  async function capture() {
    const el = video.current
    if (!el || !el.videoWidth) return
    setCapturing(true)
    setError(null)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = el.videoWidth
      canvas.height = el.videoHeight
      canvas.getContext('2d')?.drawImage(el, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
      if (!blob) throw new Error('Capture impossible.')
      const file = new File([blob], `miniature-${Math.round(el.currentTime)}s.jpg`, { type: 'image/jpeg' })
      const { url } = await uploadToLibrary(file)
      onPosterCaptured?.(url)
    } catch (cause) {
      setError(
        cause instanceof DOMException
          ? 'Le navigateur bloque la capture pour cette vidéo. Téléversez plutôt une image ci-dessous.'
          : describeUploadError(cause),
      )
    } finally {
      setCapturing(false)
    }
  }

  if (!source) return null

  return (
    <div className="rounded-lg border border-line bg-canvas-subtle p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Aperçu</p>
        <button
          type="button"
          onClick={() => setReload((n) => n + 1)}
          className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
        >
          <RefreshCw className="h-3 w-3" aria-hidden /> Recharger
        </button>
      </div>

      {loading ? (
        <div className="flex aspect-video items-center justify-center rounded-md bg-canvas text-sm text-fg-subtle">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Préparation de l’aperçu…
        </div>
      ) : playable?.kind === 'file' ? (
        <>
          <video
            ref={video}
            src={playable.url}
            poster={poster ?? undefined}
            controls
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration
              if (Number.isFinite(d) && d > 0) onDuration?.(Math.round(d))
            }}
            className="aspect-video w-full rounded-md bg-black"
          />
          {onPosterCaptured && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={capture} disabled={capturing}>
                {capturing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Camera className="h-3.5 w-3.5" aria-hidden />}
                Utiliser l’image affichée comme miniature
              </Button>
              <span className="text-xs text-fg-subtle">Mettez la vidéo sur le bon moment, puis cliquez.</span>
            </div>
          )}
        </>
      ) : playable?.kind === 'embed' && youtubeIdFromEmbed(playable.url) ? (
        <YouTubePlayer videoId={youtubeIdFromEmbed(playable.url)!} poster={poster} title="" />
      ) : playable?.kind === 'embed' ? (
        <iframe
          src={playable.url}
          title="Aperçu"
          className="aspect-video w-full rounded-md border-0 bg-black"
          allow={VIDEO_IFRAME_ALLOW}
          allowFullScreen
        />
      ) : null}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  )
}
