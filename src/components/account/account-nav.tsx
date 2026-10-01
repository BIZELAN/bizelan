'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Award, BookOpen, LayoutDashboard, Package, Receipt, User } from 'lucide-react'

import { cn } from '@/lib/utils'

const NAV = [
  { href: '/compte', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/compte/formations', label: 'Mes formations', icon: BookOpen },
  { href: '/compte/produits', label: 'Mes produits', icon: Package },
  { href: '/compte/certificats', label: 'Mes certificats', icon: Award },
  { href: '/compte/commandes', label: 'Mes commandes', icon: Receipt },
  { href: '/compte/profil', label: 'Mon profil', icon: User },
]

/**
 * Navigation de l'espace membre.
 *
 * Extraite du gabarit parce qu'elle a besoin du chemin courant : sans état
 * actif, l'apprenant perdait le seul repère lui disant où il se trouve — la
 * liste était rendue strictement identique sur les trois pages.
 */
export function AccountNav() {
  const pathname = usePathname()

  // `/compte` est le préfixe de tous les autres : sans égalité stricte, il
  // resterait allumé sur chaque page de l'espace.
  const isActive = (href: string) =>
    href === '/compte'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`) ||
        // Le certificat vit sous `/compte/certificat/<code>` (singulier).
        (href === '/compte/certificats' && pathname.startsWith('/compte/certificat/'))

  return (
    // `min-w-0` : élément de grille, la barre prenait sinon la largeur de ses
    // six entrées et élargissait toute la page au-delà de l'écran sur mobile.
    <nav aria-label="Navigation de l’espace membre" className="min-w-0">
      <ul className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 lg:flex-col lg:overflow-visible lg:pb-0">
        {NAV.map((item) => {
          const active = isActive(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 whitespace-nowrap rounded-md px-3.5 py-2.5',
                  'text-[0.9375rem] font-medium transition-colors duration-fast',
                  active
                    ? 'bg-primary-subtle text-primary-text'
                    : 'text-fg-muted hover:bg-surface hover:text-fg',
                )}
              >
                <item.icon className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
