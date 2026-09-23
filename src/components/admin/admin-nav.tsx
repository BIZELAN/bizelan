'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { motion, useReducedMotion } from 'motion/react'

import { ADMIN_NAV, type AdminNavItem } from '@/components/admin/nav-items'
import { cn } from '@/lib/utils'

/**
 * Navigation du back-office.
 *
 * Chaque entrée est une CARTE et non une ligne : une tuile d'icône à gauche,
 * le libellé et sa description à droite. C'est la grammaire de la console
 * demandée par le client, et elle fait travailler les treize entrées — avec
 * « Demandes » ou « Pages » seuls, il fallait ouvrir pour savoir.
 *
 * L'entrée active porte un fond teinté ET un halo coloré projeté sous la
 * carte. Le fond glisse d'un item à l'autre grâce au `layoutId` partagé :
 * un seul élément est monté, Motion interpole sa position. Un fond rendu par
 * item apparaîtrait et disparaîtrait brutalement.
 *
 * Repliée, la carte se réduit à sa seule tuile d'icône — la tuile EST l'état
 * replié, il n'y a pas deux mises en page à tenir.
 */
export function AdminNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const reduced = useReducedMotion()

  const isActive = (item: AdminNavItem) =>
    item.href === '/admin'
      ? pathname === '/admin'
      : pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <Tooltip.Provider delayDuration={200}>
      <nav
        className={cn('min-h-0 flex-1 overflow-y-auto py-4', collapsed ? 'px-3' : 'px-4')}
        aria-label="Navigation d’administration"
      >
        {ADMIN_NAV.map((group, groupIndex) => (
          <div key={group.title ?? 'principal'} className={cn(groupIndex > 0 && 'mt-7')}>
            {group.title &&
              (collapsed ? (
                // Replié, un titre ne tiendrait pas : un filet le remplace,
                // ce qui préserve le découpage visuel des groupes.
                <div className="mx-2 mb-3 h-px bg-line" aria-hidden />
              ) : (
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-fg-subtle">
                  {group.title}
                </p>
              ))}

            <ul className="space-y-1.5">
              {group.items.map((item) => {
                const active = isActive(item)
                const Icon = (Icons as unknown as Record<string, LucideIcon>)[item.icon]

                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center rounded-md border transition-colors duration-base',
                      collapsed ? 'justify-center p-1.5' : 'gap-3 px-3 py-3',
                      active
                        ? 'border-primary-text/40 text-fg'
                        : 'border-transparent text-fg-muted hover:border-line hover:bg-canvas-subtle hover:text-fg',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="admin-nav-active"
                        aria-hidden
                        // Le halo coloré est porté par le même élément que le
                        // fond : deux `layoutId` distincts se
                        // désynchroniseraient au passage d'une entrée à l'autre.
                        className={cn(
                          'absolute inset-0 rounded-md bg-primary-subtle',
                          'shadow-[0_18px_40px_-28px_rgb(var(--primary)/0.9)]',
                        )}
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 420, damping: 34 }
                        }
                      />
                    )}

                    {Icon && (
                      <span
                        className={cn(
                          'relative inline-flex h-9 w-9 shrink-0 items-center justify-center',
                          'rounded-sm border transition-colors duration-base',
                          active
                            ? 'border-primary-text/30 bg-primary-subtle text-primary-text'
                            : 'border-line bg-canvas-subtle text-fg-subtle group-hover:text-fg',
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                    )}

                    {collapsed ? (
                      <span className="sr-only">{item.label}</span>
                    ) : (
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold">{item.label}</span>
                        <span className="mt-0.5 block truncate text-xs text-fg-subtle">
                          {item.description}
                        </span>
                      </span>
                    )}
                  </Link>
                )

                if (!collapsed) return <li key={item.href}>{link}</li>

                return (
                  <li key={item.href}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="right"
                          sideOffset={10}
                          className="z-50 max-w-56 rounded-sm border border-line bg-surface-raised px-3 py-2 shadow-e2"
                        >
                          <span className="block text-sm font-semibold text-fg">{item.label}</span>
                          <span className="mt-0.5 block text-xs text-fg-subtle">
                            {item.description}
                          </span>
                          {/* Les jetons portent des canaux RVB : un `var()` nu
                              ne serait plus une couleur valide. */}
                          <Tooltip.Arrow className="fill-[rgb(var(--surface-raised))]" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </Tooltip.Provider>
  )
}
