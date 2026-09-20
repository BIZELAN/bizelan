'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, ExternalLink, LogOut, Menu, User, X } from 'lucide-react'

import { signOut } from '@/app/actions/auth'
import { AdminNav } from '@/components/admin/admin-nav'
import { findNavItem } from '@/components/admin/nav-items'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Coquille du back-office : barre latérale, en-tête collant, tiroir mobile.
 *
 * Elle est d'un seul tenant parce que l'état d'ouverture du tiroir est partagé
 * entre l'en-tête (le bouton) et la barre latérale (le panneau) ; les séparer
 * imposerait de remonter cet état dans le `layout`, qui est un composant
 * serveur et ne peut pas en porter.
 */
export function AdminChrome({
  siteName,
  userName,
  userRole,
  children,
}: {
  siteName: string
  userName: string
  userRole: string
  children: ReactNode
}) {
  const [drawer, setDrawer] = useState(false)
  const pathname = usePathname()
  const current = findNavItem(pathname)

  // Le tiroir se referme au changement de page, sinon il resterait ouvert
  // par-dessus la page suivante.
  useEffect(() => setDrawer(false), [pathname])

  useEffect(() => {
    if (!drawer) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawer(false)
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [drawer])

  return (
    <div className="flex min-h-screen bg-surface-950">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-surface-800 bg-surface-900 lg:flex">
        <SidebarHeader siteName={siteName} />
        <AdminNav />
        <SidebarFooter userName={userName} userRole={userRole} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm"
            aria-label="Fermer le menu"
            onClick={() => setDrawer(false)}
          />
          <div className="relative flex w-72 max-w-[85vw] flex-col border-r border-surface-800 bg-surface-900 shadow-dark-lg">
            <div className="flex items-center justify-between border-b border-surface-800 px-5 py-4">
              <span className="text-base font-bold tracking-[0.1em] text-brand-300">{siteName}</span>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                autoFocus
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-onDark-md hover:bg-surface-800 hover:text-onDark-hi"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <AdminNav onNavigate={() => setDrawer(false)} />
            <SidebarFooter userName={userName} userRole={userRole} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-surface-800 bg-surface-900/90 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-control text-onDark-md hover:bg-surface-800 hover:text-onDark-hi lg:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={drawer}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <nav aria-label="Fil d’Ariane" className="flex min-w-0 items-center gap-1.5 text-body">
              <Link
                href="/admin"
                className="shrink-0 text-onDark-lo transition-colors hover:text-onDark-hi"
              >
                Administration
              </Link>
              {current && current.href !== '/admin' && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-onDark-lo" aria-hidden />
                  <span className="truncate font-medium text-onDark-hi">{current.label}</span>
                </>
              )}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-control px-3 py-2 text-body text-onDark-md transition-colors hover:bg-surface-800 hover:text-onDark-hi sm:inline-flex"
              >
                Voir le site
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <UserMenu userName={userName} userRole={userRole} />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-5 sm:p-7">{children}</main>
      </div>
    </div>
  )
}

function SidebarHeader({ siteName }: { siteName: string }) {
  return (
    <div className="border-b border-surface-800 px-5 py-4">
      <Link href="/admin" className="text-base font-bold tracking-[0.1em] text-brand-300">
        {siteName}
      </Link>
      <p className="mt-0.5 text-meta text-onDark-lo">Administration</p>
    </div>
  )
}

function SidebarFooter({ userName, userRole }: { userName: string; userRole: string }) {
  return (
    <div className="border-t border-surface-800 p-3">
      <div className="rounded-control bg-surface-950 px-3 py-2.5">
        <p className="truncate text-body font-medium text-onDark-hi">{userName}</p>
        <p className="text-meta capitalize text-onDark-lo">{userRole}</p>
      </div>
      <form action={signOut} className="mt-2">
        <Button type="submit" variant="ghost" size="sm" fullWidth>
          <LogOut className="h-4 w-4" aria-hidden />
          Déconnexion
        </Button>
      </form>
    </div>
  )
}

function UserMenu({ userName, userRole }: { userName: string; userRole: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Menu du compte"
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors',
          open
            ? 'bg-surface-700 text-onDark-hi'
            : 'text-onDark-md hover:bg-surface-800 hover:text-onDark-hi',
        )}
      >
        <User className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-60 rounded-card border border-surface-700 bg-surface-800 p-3 shadow-dark-lg">
          <p className="truncate text-body font-medium text-onDark-hi">{userName}</p>
          <p className="text-meta capitalize text-onDark-lo">{userRole}</p>

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 rounded-control px-2.5 py-2 text-body text-onDark-md transition-colors hover:bg-surface-700 hover:text-onDark-hi sm:hidden"
          >
            Voir le site
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>

          <form action={signOut} className="mt-2 border-t border-surface-700 pt-2">
            <Button type="submit" variant="ghost" size="sm" fullWidth>
              <LogOut className="h-4 w-4" aria-hidden />
              Déconnexion
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
