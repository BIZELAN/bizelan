'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronRight,
  ExternalLink,
  LayoutGrid,
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
 * Deux PANNEAUX FLOTTANTS séparés par une gouttière, posés sur le fond de
 * page — c'est la signature de la console demandée par le client, et le
 * changement structurel dont tout le reste découle. La barre latérale ne
 * touche plus aucun bord et n'est plus séparée par un filet : c'est
 * l'intervalle qui sépare, ce qui laisse respirer sans tracer de trait.
 *
 * Point structurant conservé : la racine est en `h-dvh` avec
 * `overflow-hidden`. Le document ne défile donc JAMAIS ; le débordement est
 * délégué à deux zones indépendantes — la navigation et le contenu. Une
 * hauteur *minimale* laisserait le conteneur grandir avec son contenu, et le
 * `overflow-y-auto` de la navigation ne se déclencherait jamais faute de
 * hauteur bornée en amont.
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
    <div className="relative h-dvh overflow-hidden bg-canvas">
      {/* Voile lumineux en haut de page : il creuse la profondeur sans qu'aucun
          bord n'apparaisse. Purement décoratif, donc non cliquable. */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgb(var(--surface)/0.55),transparent_26%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-console gap-4 p-4 sm:gap-5 sm:p-5 lg:gap-6 lg:p-6">
        {/* ---------- Panneau de navigation ---------------------------------- */}
        <aside
          className="hidden shrink-0 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-e2 transition-[width] duration-base ease-out lg:flex"
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

        {/* ---------- Tiroir mobile ------------------------------------------ */}
        <Dialog.Root open={drawer} onOpenChange={setDrawer}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-sm data-[state=open]:animate-fade-in lg:hidden" />
            <Dialog.Content
              className="fixed inset-y-3 left-3 z-50 flex w-80 max-w-[85vw] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-e3 focus:outline-none data-[state=open]:animate-fade-in lg:hidden"
            >
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line p-4">
                <Brand siteName={siteName} />
                <Dialog.Close className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-fg-muted transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg">
                  <X className="h-5 w-5" aria-hidden />
                  <span className="sr-only">Fermer</span>
                </Dialog.Close>
              </div>
              <AdminNav onNavigate={() => setDrawer(false)} />
              <SidebarFooter userName={userName} userRole={userRole} collapsed={false} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ---------- Panneau de contenu ------------------------------------- */}
        <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-e3">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-sm text-fg-muted transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <div className="min-w-0">
              <nav aria-label="Fil d’Ariane" className="flex min-w-0 items-center gap-1.5 text-sm">
                <Link
                  href="/admin"
                  className="shrink-0 text-fg-subtle transition-colors duration-fast hover:text-fg"
                >
                  Administration
                </Link>
                {current && current.href !== '/admin' && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                    <span className="truncate font-semibold text-fg">{current.label}</span>
                  </>
                )}
              </nav>
              {/* La description de l'entrée courante, reprise de la navigation :
                  une seule source, donc aucun risque de divergence. */}
              {current && (
                <p className="hidden truncate text-xs text-fg-subtle sm:block">
                  {current.description}
                </p>
              )}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <CommandPalette />
              <ThemeToggle className="hidden sm:inline-flex" />
              <UserMenu userName={userName} userRole={userRole} />
            </div>
          </header>

          {/* Seul élément défilant de la page. */}
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-panel p-4 sm:p-6">{children}</div>
          </main>
        </section>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/** Marque : tuile d'icône + deux lignes, comme les entrées de navigation. */
function Brand({ siteName }: { siteName: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <BrandTile />
      <span className="min-w-0">
        <span className="block truncate text-base font-bold text-fg">{siteName}</span>
        <span className="mt-0.5 block truncate text-xs text-fg-subtle">
          Console d’administration
        </span>
      </span>
    </span>
  )
}

/**
 * La tuile de marque porte le halo coloré de la console. Il est projeté sous
 * l'élément et non autour : c'est ce décalage qui donne la profondeur sans
 * dessiner de contour.
 */
function BrandTile() {
  return (
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-primary-text/35 bg-primary-subtle text-primary-text shadow-[0_18px_40px_-24px_rgb(var(--primary)/0.85)]">
      <LayoutGrid className="h-5 w-5" aria-hidden />
    </span>
  )
}

function SidebarHeader({ siteName, collapsed }: { siteName: string; collapsed: boolean }) {
  return (
    <div
      className={cn('shrink-0 border-b border-line', collapsed ? 'flex justify-center p-3' : 'p-4')}
    >
      <Link href="/admin" className="block min-w-0" title={siteName}>
        {collapsed ? (
          <>
            <BrandTile />
            <span className="sr-only">{siteName} — console d’administration</span>
          </>
        ) : (
          <Brand siteName={siteName} />
        )}
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
    <div className="shrink-0 border-t border-line p-3">
      {/* Le bloc utilisateur est lui-même une carte : il appartient au même
          vocabulaire que les entrées de navigation juste au-dessus. */}
      {!collapsed && (
        <div className="mb-2 rounded-sm border border-line bg-canvas-subtle p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary-subtle text-primary-text">
              <User className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{userName}</p>
              <p className="truncate text-xs capitalize text-fg-subtle">{userRole}</p>
            </div>
          </div>
        </div>
      )}

      <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center')}>
        <form action={signOut} className={collapsed ? '' : 'flex-1'}>
          <button
            type="submit"
            className={cn(
              'inline-flex items-center gap-2 rounded-sm border border-transparent text-sm text-danger transition-colors duration-fast hover:border-danger/30 hover:bg-danger-subtle',
              collapsed ? 'h-10 w-10 justify-center' : 'h-10 w-full px-3',
            )}
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            {collapsed ? <span className="sr-only">Déconnexion</span> : <span>Déconnexion</span>}
          </button>
        </form>

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg"
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-line bg-canvas-subtle text-fg-muted transition-colors duration-fast hover:text-fg data-[state=open]:bg-surface data-[state=open]:text-fg"
        >
          <User className="h-4 w-4" aria-hidden />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-56 rounded-md border border-line bg-surface-raised p-1.5 shadow-e2 data-[state=open]:animate-fade-up"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-fg">{userName}</p>
            <p className="text-xs capitalize text-fg-subtle">{userRole}</p>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />

          <DropdownMenu.Item asChild>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-sm text-fg-muted outline-none transition-colors duration-fast data-[highlighted]:bg-canvas-subtle data-[highlighted]:text-fg"
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
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm text-danger outline-none transition-colors duration-fast data-[highlighted]:bg-danger-subtle"
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
