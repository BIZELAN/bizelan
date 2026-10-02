'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'

import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* API IFrame de YouTube — chargée une seule fois, à la demande        */
/* ------------------------------------------------------------------ */

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  mute(): void
  unMute(): void
  isMuted(): boolean
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      host?: string
      videoId: string
      width?: string | number
      height?: string | number
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (e: { target: YTPlayer }) => void
        onStateChange?: (e: { data: number; target: YTPlayer }) => void
      }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YTNamespace> | null = null

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT) resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      apiPromise = null
      reject(new Error('YouTube injoignable'))
    }
    document.head.appendChild(script)
  })
  return apiPromise
}

const STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/**
 * Lecteur YouTube « sans YouTube » visible.
 *
 * Une vidéo YouTube intégrée telle quelle est une porte de sortie : titre
 * cliquable, logo, « Regarder sur YouTube », vidéos suggérées à la pause et en
 * fin de lecture. Un apprenant qui clique quitte sa formation. Ici :
 *
 *   · avant la lecture, c'est NOTRE affiche et NOTRE bouton (et rien n'est
 *     chargé depuis YouTube avant le clic — la page s'ouvre plus vite) ;
 *   · le lecteur est agrandi au-delà du cadre : la barre de titre en haut et
 *     le logo en bas sortent du champ, la vidéo elle-même reste entière ;
 *   · un calque transparent couvre la vidéo : aucun clic ne parvient à
 *     YouTube, il met en pause ou relance ;
 *   · les commandes (lecture, avance, son, plein écran) sont les nôtres ;
 *   · à la pause et à la fin, un écran du site recouvre les suggestions.
 *
 * Le plein écran porte sur notre cadre, pas sur l'iframe : les commandes
 * natives de YouTube n'y réapparaissent pas.
 */
export function YouTubePlayer({
  videoId,
  poster,
  title = 'Vidéo',
  className,
  resumeAt = 0,
  onEnded,
  autoStart = false,
}: {
  videoId: string
  poster?: string | null
  title?: string
  className?: string
  /** Position de reprise, en secondes. */
  resumeAt?: number
  onEnded?: () => void
  /** Démarrer sans attendre le clic (aperçu d'administration). */
  autoStart?: boolean
}) {
  const frame = useRef<HTMLDivElement>(null)
  const mount = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const [started, setStarted] = useState(autoStart)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<number>(-1)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [failed, setFailed] = useState(false)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  const cover = poster || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

  // Création du lecteur au premier clic.
  useEffect(() => {
    const container = mount.current
    if (!started || !container) return
    let cancelled = false
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return
        // Un élément neuf à chaque montage : YouTube REMPLACE l'élément reçu
        // par son iframe, on ne peut donc pas le réutiliser.
        const host = document.createElement('div')
        container.replaceChildren(host)
        player.current = new YT.Player(host, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            cc_load_policy: 0,
            start: Math.max(0, Math.floor(resumeAt > 5 ? resumeAt : 0)),
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              setReady(true)
              setDuration(e.target.getDuration() || 0)
              e.target.playVideo()
            },
            onStateChange: (e) => {
              setState(e.data)
              if (e.data === STATE.PLAYING) setDuration(e.target.getDuration() || 0)
              if (e.data === STATE.ENDED) onEndedRef.current?.()
            },
          },
        })
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      try {
        player.current?.destroy()
      } catch {
        // Lecteur déjà détaché : rien à libérer.
      }
      player.current = null
      container.replaceChildren()
    }
  }, [started, videoId, resumeAt])

  // Avancement de la barre de progression.
  useEffect(() => {
    if (!ready) return
    const timer = window.setInterval(() => {
      const p = player.current
      if (p) setTime(p.getCurrentTime() || 0)
    }, 250)
    return () => window.clearInterval(timer)
  }, [ready])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frame.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const playing = state === STATE.PLAYING || state === STATE.BUFFERING
  const toggle = useCallback(() => {
    const p = player.current
    if (!p) return
    if (state === STATE.ENDED) {
      p.seekTo(0, true)
      p.playVideo()
    } else if (playing) p.pauseVideo()
    else p.playVideo()
  }, [playing, state])

  const seek = (ratio: number) => {
    const p = player.current
    if (!p || !duration) return
    p.seekTo(Math.max(0, Math.min(duration, ratio * duration)), true)
    setTime(ratio * duration)
  }

  const toggleMute = () => {
    const p = player.current
    if (!p) return
    if (p.isMuted()) p.unMute()
    else p.mute()
    setMuted(!muted)
  }

  const toggleFullscreen = () => {
    const el = frame.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen?.()
  }

  // Clavier : espace / K pour lecture-pause, flèches pour ±10 s, M pour le son.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!ready) return
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault()
      toggle()
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const p = player.current
      if (p) p.seekTo(Math.max(0, p.getCurrentTime() + (e.key === 'ArrowRight' ? 10 : -10)), true)
    } else if (e.key === 'm') toggleMute()
    else if (e.key === 'f') toggleFullscreen()
  }

  const progress = duration ? Math.min(1, time / duration) : 0
  const showCurtain = started && (state === STATE.PAUSED || state === STATE.ENDED)

  return (
    <div
      ref={frame}
      tabIndex={started ? 0 : -1}
      onKeyDown={onKeyDown}
      className={cn(
        'group/yt relative aspect-video overflow-hidden rounded-lg bg-black ring-1 ring-line focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-text',
        fullscreen && 'rounded-none ring-0',
        className,
      )}
    >
      {!started ? (
        <button
          type="button"
          onClick={() => setStarted(true)}
          aria-label={`Lire la vidéo : ${title}`}
          className="group absolute inset-0 h-full w-full"
        >
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <span className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/20" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/95 text-primary-fg shadow-e3 transition-transform duration-200 group-hover:scale-110">
              <Play className="ml-1 h-8 w-8 fill-current" aria-hidden />
            </span>
          </span>
          {title && (
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-12 text-left text-base font-medium text-white">
              {title}
            </span>
          )}
        </button>
      ) : (
        <>
          {/* Le lecteur déborde du cadre en haut et en bas : la barre de titre
              et le logo de YouTube sortent du champ visible. */}
          <div className="pointer-events-none absolute inset-x-0 -top-[12%] h-[124%]">
            <div ref={mount} className="h-full w-full" />
          </div>

          {/* Calque d'interception : aucun clic n'atteint YouTube. */}
          <button
            type="button"
            onClick={toggle}
            onDoubleClick={toggleFullscreen}
            aria-label={playing ? 'Mettre en pause' : 'Lire'}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer"
          />

          {/* Pause et fin : notre écran couvre les suggestions de YouTube. */}
          {(showCurtain || !ready) && !failed && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <img src={cover} alt="" className={cn('absolute inset-0 h-full w-full object-cover', ready && 'opacity-90')} />
              <span className="absolute inset-0 bg-black/45" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/95 text-primary-fg shadow-e3">
                {!ready ? (
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary-fg/30 border-t-primary-fg" />
                ) : state === STATE.ENDED ? (
                  <RotateCcw className="h-8 w-8" aria-hidden />
                ) : (
                  <Play className="ml-1 h-8 w-8 fill-current" aria-hidden />
                )}
              </span>
            </div>
          )}

          {failed && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6 text-center text-sm text-white">
              La vidéo n’a pas pu se charger. Vérifiez votre connexion, puis rechargez la page.
            </div>
          )}

          {/* Commandes du site */}
          {ready && (
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2.5 pt-8 transition-opacity duration-200',
                playing ? 'opacity-0 group-hover/yt:opacity-100 group-focus-within/yt:opacity-100' : 'opacity-100',
              )}
            >
              <input
                type="range"
                min={0}
                max={1000}
                value={Math.round(progress * 1000)}
                onChange={(e) => seek(Number(e.target.value) / 1000)}
                aria-label="Position dans la vidéo"
                aria-valuetext={`${clock(time)} sur ${clock(duration)}`}
                className="bz-yt-range h-1.5 w-full cursor-pointer"
                style={{ ['--bz-progress' as string]: `${progress * 100}%` }}
              />
              <div className="mt-1.5 flex items-center gap-1 text-white">
                <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Lecture'} className="rounded p-1.5 hover:bg-white/15">
                  {playing ? <Pause className="h-5 w-5 fill-current" aria-hidden /> : <Play className="h-5 w-5 fill-current" aria-hidden />}
                </button>
                <button type="button" onClick={toggleMute} aria-label={muted ? 'Activer le son' : 'Couper le son'} className="rounded p-1.5 hover:bg-white/15">
                  {muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
                </button>
                <span className="ml-1 text-xs tabular-nums text-white/85">
                  {clock(time)} / {clock(duration)}
                </span>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                  className="ml-auto rounded p-1.5 hover:bg-white/15"
                >
                  {fullscreen ? <Minimize className="h-5 w-5" aria-hidden /> : <Maximize className="h-5 w-5" aria-hidden />}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
