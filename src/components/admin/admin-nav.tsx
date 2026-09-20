'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { ADMIN_NAV, type AdminNavItem } from '@/components/admin/nav-items'
import { cn } from '@/lib/utils'

/**
 * Navigation du back-office, groupée par intention.
 *
 * L'entrée active porte un liseré vertical en couleur de marque plutôt qu'un
 * simple fond : sur une barre latérale sombre, un changement de fond seul se
 * repère mal en vision périphérique.
 */
export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  const isActive = (item: AdminNavItem) =>
    item.href === '/admin'
      ? pathname === '/admin'
      : pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation d’administration">
      {ADMIN_NAV.map((group, groupIndex) => (
        <div key={group.title ?? 'principal'} className={cn(groupIndex > 0 && 'mt-6')}>
          {group.title && (
            <p className="mb-2 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-onDark-lo">
              {group.title}
            </p>
          )}

          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item)
              const Icon = (Icons as unknown as Record<string, LucideIcon>)[item.icon]

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-3 rounded-control px-3 py-2 text-body transition-colors',
                      active
                        ? 'bg-surface-700/60 font-medium text-onDark-hi'
                        : 'text-onDark-md hover:bg-surface-800 hover:text-onDark-hi',
                    )}
                  >
                    {active && (
                      <span
                        className="absolute inset-y-1.5 left-0 w-0.5 rounded-pill bg-brand-400"
                        aria-hidden
                      />
                    )}
                    {Icon && (
                      <Icon
                        className={cn('h-4 w-4 shrink-0', active ? 'text-brand-300' : 'text-onDark-lo')}
                        aria-hidden
                      />
                    )}
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
