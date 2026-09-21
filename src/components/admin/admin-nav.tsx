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
 * L'entrée active porte un liseré qui **glisse** d'un item à l'autre grâce au
 * `layoutId` partagé : un seul élément est monté, Motion interpole sa position.
 * Un liseré rendu par item apparaîtrait et disparaîtrait brutalement.
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
        className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}
        aria-label="Navigation d’administration"
      >
        {ADMIN_NAV.map((group, groupIndex) => (
          <div key={group.title ?? 'principal'} className={cn(groupIndex > 0 && 'mt-6')}>
            {group.title &&
              (collapsed ? (
                // Replié, un titre ne tiendrait pas : un filet le remplace,
                // ce qui préserve le découpage visuel des groupes.
                <div className="mx-2 mb-2 h-px bg-line" aria-hidden />
              ) : (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                  {group.title}
                </p>
              ))}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item)
                const Icon = (Icons as unknown as Record<string, LucideIcon>)[item.icon]

                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center rounded-md text-base transition-colors duration-fast',
                      collapsed ? 'h-10 w-10 justify-center' : 'gap-3 px-3 py-2',
                      active
                        ? 'font-medium text-fg'
                        : 'text-fg-muted hover:bg-canvas-subtle hover:text-fg',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="admin-nav-active"
                        // Le fond et le liseré voyagent ensemble : deux
                        // `layoutId` distincts se désynchroniseraient.
                        className="absolute inset-0 rounded-md bg-primary-subtle"
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 420, damping: 34 }
                        }
                      >
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-pill bg-primary" />
                      </motion.span>
                    )}

                    {Icon && (
                      <Icon
                        className={cn(
                          'relative h-4 w-4 shrink-0',
                          active ? 'text-primary' : 'text-fg-subtle',
                        )}
                        aria-hidden
                      />
                    )}
                    {!collapsed && <span className="relative truncate">{item.label}</span>}
                    {collapsed && <span className="sr-only">{item.label}</span>}
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
                          sideOffset={8}
                          className="z-50 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-sm text-fg shadow-e2"
                        >
                          {item.label}
                          {/* Les jetons portent désormais des canaux RVB :
                              un `var()` nu ne serait plus une couleur valide. */}
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
