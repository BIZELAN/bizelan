'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogIn, Menu, User, X } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/formations', label: 'Formations' },
  { href: '/services', label: 'Services' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
]

/**
 * Barre de navigation flottante, détachée du haut de page et superposée au
 * héros. Elle se resserre au défilement : la marque et les actions restent
 * accessibles sans occuper la même hauteur qu'en haut de page.
 */
export function SiteHeader({
  siteName,
  logoUrl,
  isLoggedIn,
  announcement,
}: {
  siteName: string
  logoUrl: string | null
  isLoggedIn: boolean
  announcement?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Le menu mobile se ferme au changement de page : sans cela, il resterait
  // ouvert par-dessus la nouvelle page après un clic sur un lien.
  useEffect(() => setOpen(false), [pathname])

  // Panneau plein écran : on verrouille le défilement de la page derrière et
  // on rend la touche Échap opérante, comme pour une boîte de dialogue.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      {announcement && (
        <div className="bg-brand-800 px-4 py-2 text-center text-meta font-medium text-brand-200">
          {announcement}
        </div>
      )}

      <header className="sticky top-0 z-50">
        <div className="container-page pt-4">
          <div
            className={cn(
              'flex items-center justify-between gap-4 rounded-pill px-4 pr-3 ring-1 backdrop-blur-xl transition-all duration-300',
              scrolled
                ? 'h-14 bg-surface-900/90 shadow-dark ring-surface-600'
                : 'h-16 bg-surface-900/60 ring-surface-700',
            )}
          >
            <Link href="/" className="flex shrink-0 items-center gap-2.5 pl-1">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
              ) : (
                <span className="text-lg font-bold tracking-[0.12em] text-onDark-hi">
                  {siteName}
                </span>
              )}
            </Link>

            <nav
              className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
              aria-label="Navigation principale"
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'rounded-pill px-4 py-2 text-body font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-surface-700/70 text-onDark-hi'
                      : 'text-onDark-md hover:bg-surface-800 hover:text-onDark-hi',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              {isLoggedIn ? (
                <ButtonLink href="/compte" variant="outline" size="sm">
                  <User className="h-4 w-4" aria-hidden />
                  Mon espace
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/connexion" variant="ghost" size="sm">
                    <LogIn className="h-4 w-4" aria-hidden />
                    Connexion
                  </ButtonLink>
                  <ButtonLink href="/formations" variant="accent" size="sm">
                    Voir les formations
                  </ButtonLink>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-onDark-hi hover:bg-surface-800 md:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={open}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-surface-950/98 backdrop-blur-xl md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
        >
          <div className="container-page flex h-20 shrink-0 items-center justify-between">
            <span className="text-lg font-bold tracking-[0.12em] text-onDark-hi">{siteName}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              autoFocus
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-onDark-hi hover:bg-surface-800"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <nav
            className="container-page flex flex-1 flex-col gap-1 pt-6"
            aria-label="Navigation mobile"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-card px-4 py-4 text-h3 font-semibold transition-colors',
                  isActive(item.href)
                    ? 'bg-surface-800 text-brand-300'
                    : 'text-onDark-hi hover:bg-surface-900',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="container-page flex flex-col gap-3 border-t border-surface-700 py-6">
            {isLoggedIn ? (
              <ButtonLink href="/compte" variant="outline" size="lg" fullWidth>
                Mon espace
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/connexion" variant="outline" size="lg" fullWidth>
                  Connexion
                </ButtonLink>
                <ButtonLink href="/formations" variant="accent" size="lg" fullWidth>
                  Voir les formations
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
