'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

import { ButtonLink } from '@/components/ui/button'
import { MediaView } from '@/components/ui/media-view'
import { cn } from '@/lib/utils'

export interface CarouselSlide {
  mediaUrl?: string
  title?: string
  text?: string
  ctaLabel?: string
  ctaHref?: string
}

const HEIGHTS: Record<string, string> = {
  sm: 'h-[16rem] sm:h-[20rem]',
  md: 'h-[22rem] sm:h-[28rem] lg:h-[32rem]',
  lg: 'h-[28rem] sm:h-[36rem] lg:h-[42rem]',
  screen: 'h-[100svh] min-h-[28rem]',
}

/**
 * Carrousel de diapositives (images ou vidéos).
 *
 * Bâti sur le défilement natif avec aimantation (`scroll-snap`) : le balayage
 * au doigt, l'inertie et l'accessibilité clavier viennent du navigateur, pas
 * d'une réimplémentation. Le JavaScript ne fait que trois choses : les
 * flèches, les points, et l'avance automatique — suspendue au survol, au
 * focus, et quand l'utilisateur a demandé moins d'animations.
 */
export function Carousel({
  slides,
  height = 'md',
  autoplay = 6,
  rounded = false,
}: {
  slides: CarouselSlide[]
  height?: string
  autoplay?: number
  rounded?: boolean
}) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = slides.length

  const goTo = useCallback(
    (i: number) => {
      const el = track.current
      if (!el || count === 0) return
      const next = (i + count) % count
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    },
    [count],
  )

  // Suit la diapositive visible, quel que soit le moyen de défilement.
  useEffect(() => {
    const el = track.current
    if (!el) return
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!autoplay || autoplay < 2 || count < 2 || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => goTo(index + 1), autoplay * 1000)
    return () => window.clearInterval(timer)
  }, [autoplay, count, paused, index, goTo])

  if (count === 0) return null

  return (
    <div
      className={cn('group/carousel relative overflow-hidden', rounded && 'rounded-lg', HEIGHTS[height] ?? HEIGHTS.md)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Diaporama"
    >
      <div
        ref={track}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {slides.map((slide, i) => {
          const hasText = Boolean(slide.title || slide.text || slide.ctaLabel)
          return (
            <div
              key={i}
              className="relative h-full w-full shrink-0 snap-start"
              role="group"
              aria-roledescription="diapositive"
              aria-label={`${i + 1} sur ${count}`}
            >
              {slide.mediaUrl ? (
                <MediaView
                  src={slide.mediaUrl}
                  alt={slide.title ?? ''}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900" />
              )}

              {hasText && (
                <>
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/5"
                    aria-hidden
                  />
                  {/* Texte toujours clair sur un visuel assombri. */}
                  <div data-theme="dark" className="absolute inset-x-0 bottom-0 bg-transparent">
                    <div className="container-page pb-14 pt-10 sm:pb-16">
                      <div className="max-w-2xl">
                        {slide.title && (
                          <h3 className="text-2xl font-bold leading-tight text-white sm:text-4xl">{slide.title}</h3>
                        )}
                        {slide.text && (
                          <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-white/85 sm:text-lg">
                            {slide.text}
                          </p>
                        )}
                        {slide.ctaLabel && (
                          <ButtonLink href={slide.ctaHref || '#'} variant="accent" size="lg" className="mt-6">
                            {slide.ctaLabel}
                            <ArrowRight className="h-5 w-5" aria-hidden />
                          </ButtonLink>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Diapositive précédente"
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-opacity hover:bg-black/60 sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Diapositive suivante"
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-opacity hover:bg-black/60 sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100"
          >
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>

          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Aller à la diapositive ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'h-2.5 rounded-full transition-all',
                  i === index ? 'w-7 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
