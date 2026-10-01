'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogIn, Menu, User, X } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

/** Repli, employé tant que l'administration n'a rien saisi. */
const FALLBACK_NAV = [
  { href: '/formations', label: 'Formations' },
  { href: '/boutique', label: 'Boutique' },
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
  navLinks,
}: {
  siteName: string
  logoUrl: string | null
  isLoggedIn: boolean
  announcement?: string | null
  /** Menu réglé dans Paramètres > Navigation. */
  navLinks?: { label: string; href: string }[]
}) {
  const NAV = navLinks && navLinks.length > 0 ? navLinks : FALLBACK_NAV
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
        <div className="bg-primary px-4 py-2 text-center text-xs font-medium text-primary-fg">
          {announcement}
        </div>
      )}

      <header className="sticky top-0 z-50">
        <div className="container-page pt-4">
          <div
            className={cn(
              'flex items-center justify-between gap-4 rounded-pill px-4 pr-3 ring-1 backdrop-blur-xl transition-all duration-300',
              scrolled
                ? 'h-14 bg-canvas-subtle/90 shadow-e2 ring-line-strong'
                : 'h-16 bg-canvas-subtle/60 ring-line',
            )}
          >
            <Link href="/" className="flex shrink-0 items-center gap-2.5 pl-1">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
              ) : (
                <span className="text-lg font-bold tracking-[0.12em] text-fg">
                  {siteName}
                </span>
              )}
            </Link>

            <nav
              // Dans le flux et non plus centré en absolu : centré ainsi, le menu
              // passait sous le sélecteur de thème et les boutons de droite
              // entre 1024 et 1400 px de large (« Contact » recouvert).
              className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex"
              aria-label="Navigation principale"
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'whitespace-nowrap rounded-pill px-3 py-2 text-base font-medium transition-colors lg:px-4',
                    isActive(item.href)
                      ? 'bg-canvas-subtle text-fg'
                      : 'text-fg-muted hover:bg-surface hover:text-fg',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <ThemeToggle className="hidden xl:inline-flex" />
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
                  <ButtonLink href="/formations" variant="accent" size="sm" className="hidden lg:inline-flex">
                    Voir les formations
                  </ButtonLink>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-fg hover:bg-surface md:hidden"
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
          className="fixed inset-0 z-50 flex flex-col bg-canvas/95 backdrop-blur-xl md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
        >
          <div className="container-page flex h-20 shrink-0 items-center justify-between">
            <span className="text-lg font-bold tracking-[0.12em] text-fg">{siteName}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              autoFocus
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-fg hover:bg-surface"
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
                  'rounded-lg px-4 py-4 text-lg font-semibold transition-colors',
                  isActive(item.href)
                    ? 'bg-surface text-primary-text'
                    : 'text-fg hover:bg-canvas-subtle',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="container-page flex flex-col gap-3 border-t border-line py-6">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-fg-muted">Thème</span>
              <ThemeToggle />
            </div>
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
