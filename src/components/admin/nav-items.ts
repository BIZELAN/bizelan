/**
 * Vocabulaire de navigation du back-office.
 *
 * Il vit dans son propre module parce que Next.js n'autorise que ses propres
 * exports dans un fichier `layout`, alors que la barre latérale, le fil
 * d'Ariane et le tiroir mobile ont tous besoin de cette même liste.
 *
 * Les treize entrées étaient auparavant présentées à plat : au-delà de sept
 * ou huit items, une liste sans regroupement se parcourt en lisant chaque
 * ligne. Les sections ci-dessous répondent à « qu'est-ce que je viens faire »
 * plutôt qu'à l'ordre d'implémentation.
 */

export interface AdminNavItem {
  href: string
  label: string
  icon: string
}

export interface AdminNavGroup {
  title: string | null
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: null,
    items: [{ href: '/admin', label: 'Tableau de bord', icon: 'LayoutDashboard' }],
  },
  {
    title: 'Contenu',
    items: [
      { href: '/admin/formations', label: 'Formations', icon: 'GraduationCap' },
      { href: '/admin/services', label: 'Services', icon: 'Briefcase' },
      { href: '/admin/pages', label: 'Pages de vente', icon: 'FileText' },
      { href: '/admin/blog', label: 'Blog', icon: 'Newspaper' },
      { href: '/admin/medias', label: 'Médiathèque', icon: 'Image' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { href: '/admin/commandes', label: 'Commandes', icon: 'Receipt' },
      { href: '/admin/clients', label: 'Clients', icon: 'Users' },
      { href: '/admin/demandes', label: 'Demandes', icon: 'Inbox' },
      { href: '/admin/avis', label: 'Avis', icon: 'Star' },
      { href: '/admin/codes-promo', label: 'Codes promo', icon: 'Tag' },
    ],
  },
  {
    title: 'Pilotage',
    items: [
      { href: '/admin/statistiques', label: 'Statistiques', icon: 'BarChart3' },
      { href: '/admin/parametres', label: 'Paramètres', icon: 'Settings' },
    ],
  },
]

/** Toutes les entrées à plat — pour le fil d'Ariane et la recherche. */
export const ADMIN_NAV_FLAT: AdminNavItem[] = ADMIN_NAV.flatMap((group) => group.items)

/**
 * Entrée correspondant au chemin courant.
 * On retient la plus longue qui corresponde, sans quoi « /admin » l'emporterait
 * sur « /admin/formations » puisque toutes les routes en descendent.
 */
export function findNavItem(pathname: string): AdminNavItem | null {
  let best: AdminNavItem | null = null
  for (const item of ADMIN_NAV_FLAT) {
    const matches = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
    if (matches && (!best || item.href.length > best.href.length)) best = item
  }
  return best
}
