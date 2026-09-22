'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  X,
} from 'lucide-react'

import { signOut } from '@/app/actions/auth'
import { AdminNav } from '@/components/admin/admin-nav'
import { CommandPalette } from '@/components/admin/command-palette'
import { findNavItem } from '@/components/admin/nav-items'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { applySidebar, readStoredSidebar } from '@/lib/sidebar'
import { cn } from '@/lib/utils'

/**
 * Coquille du back-office.
 *
 * Point structurant : la racine est en `h-dvh` avec `overflow-hidden`. Le
 * document ne défile donc JAMAIS ; le débordement est délégué à deux zones
 * indépendantes — la navigation et le contenu.
 *
 * La version précédente utilisait `min-h-screen`, une hauteur *minimale* : le
 * conteneur grandissait avec son contenu, c'est le document entier qui
 * défilait, et la barre latérale partait avec lui. Le `overflow-y-auto` posé
 * sur la navigation ne se déclenchait jamais, faute de hauteur bornée en
 * amont — il donnait l'illusion d'un défilement indépendant qui n'existait pas.
 *
 * `dvh` plutôt que `vh` : sur mobile, `vh` ignore la barre d'adresse
 * rétractable et laisse la page dépasser sous l'écran.
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
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const current = findNavItem(pathname)

  // L'état réel est déjà appliqué au DOM par le script d'amorçage ; on ne fait
  // que le refléter côté React, pour les infobulles et les attributs ARIA.
  useEffect(() => setCollapsed(readStoredSidebar()), [])

  useEffect(() => setDrawer(false), [pathname])

  const toggleSidebar = () => {
    const next = !collapsed
    setCollapsed(next)
    applySidebar(next)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      {/* ---------- Barre latérale : hauteur pleine, défilement propre ------- */}
      <aside
        className="hidden shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-base ease-out lg:flex"
        style={{ width: 'var(--sidebar-w)' }}
      >
        <SidebarHeader siteName={siteName} collapsed={collapsed} />
        {/* Seule cette zone déborde : l'en-tête et le pied restent visibles. */}
        <AdminNav collapsed={collapsed} />
        <SidebarFooter
          userName={userName}
          userRole={userRole}
          collapsed={collapsed}
          onToggle={toggleSidebar}
        />
      </aside>

      {/* ---------- Tiroir mobile ------------------------------------------- */}
      <Dialog.Root open={drawer} onOpenChange={setDrawer}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-sm data-[state=open]:animate-fade-in lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface shadow-e3 focus:outline-none data-[state=open]:animate-fade-in lg:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
              <span className="text-base font-semibold tracking-wide text-primary-text">{siteName}</span>
              <Dialog.Close className="inline-flex h-10 w-10 items-center justify-center rounded-md text-fg-muted transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg">
                <X className="h-5 w-5" aria-hidden />
                <span className="sr-only">Fermer</span>
              </Dialog.Close>
            </div>
            <AdminNav onNavigate={() => setDrawer(false)} />
            <SidebarFooter userName={userName} userRole={userRole} collapsed={false} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ---------- Colonne principale --------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-fg-muted transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>

          <nav aria-label="Fil d’Ariane" className="flex min-w-0 items-center gap-1.5 text-base">
            <Link
              href="/admin"
              className="shrink-0 text-fg-subtle transition-colors duration-fast hover:text-fg"
            >
              Administration
            </Link>
            {current && current.href !== '/admin' && (
              <>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                <span className="truncate font-medium text-fg">{current.label}</span>
              </>
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <CommandPalette />
            <ThemeToggle className="hidden sm:inline-flex" />
            <UserMenu userName={userName} userRole={userRole} />
          </div>
        </header>

        {/* Seul élément défilant de la page. */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function SidebarHeader({ siteName, collapsed }: { siteName: string; collapsed: boolean }) {
  return (
    <div
      className={cn(
        'flex h-14 shrink-0 items-center border-b border-line',
        collapsed ? 'justify-center px-2' : 'px-4',
      )}
    >
      <Link
        href="/admin"
        className="truncate text-base font-semibold tracking-wide text-primary-text"
        title={siteName}
      >
        {collapsed ? siteName.charAt(0) : siteName}
      </Link>
    </div>
  )
}

function SidebarFooter({
  userName,
  userRole,
  collapsed,
  onToggle,
}: {
  userName: string
  userRole: string
  collapsed: boolean
  onToggle?: () => void
}) {
  return (
    <div className="shrink-0 border-t border-line p-2">
      {!collapsed && (
        <div className="mb-2 rounded-md bg-canvas-subtle px-3 py-2">
          <p className="truncate text-sm font-medium text-fg">{userName}</p>
          <p className="text-xs capitalize text-fg-subtle">{userRole}</p>
        </div>
      )}

      <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center')}>
        <form action={signOut} className={collapsed ? '' : 'flex-1'}>
          <button
            type="submit"
            className={cn(
              'inline-flex items-center gap-2 rounded-md text-sm text-fg-muted transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg',
              collapsed ? 'h-10 w-10 justify-center' : 'h-9 w-full px-3',
            )}
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed && <span>Déconnexion</span>}
            {collapsed && <span className="sr-only">Déconnexion</span>}
          </button>
        </form>

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg"
            aria-label={collapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function UserMenu({ userName, userRole }: { userName: string; userRole: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Menu du compte"
          className="inline-flex h-9 w-9 items-center justify-center rounded-pill border border-line bg-canvas-subtle text-fg-muted transition-colors duration-fast hover:text-fg data-[state=open]:bg-surface data-[state=open]:text-fg"
        >
          <User className="h-4 w-4" aria-hidden />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-56 rounded-lg border border-line bg-surface-raised p-1.5 shadow-e2 data-[state=open]:animate-fade-up"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-fg">{userName}</p>
            <p className="text-xs capitalize text-fg-subtle">{userRole}</p>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />

          <DropdownMenu.Item asChild>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-fg-muted outline-none transition-colors duration-fast data-[highlighted]:bg-canvas-subtle data-[highlighted]:text-fg"
            >
              Voir le site
              <ExternalLink className="ml-auto h-3.5 w-3.5" aria-hidden />
            </Link>
          </DropdownMenu.Item>

          <div className="px-2.5 py-2 sm:hidden">
            <ThemeToggle />
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />

          <DropdownMenu.Item asChild>
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-fg-muted outline-none transition-colors duration-fast data-[highlighted]:bg-canvas-subtle data-[highlighted]:text-fg"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Déconnexion
              </button>
            </form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
