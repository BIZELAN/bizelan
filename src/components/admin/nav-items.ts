/**
 * Vocabulaire de navigation du back-office.
 *
 * Il vit dans son propre module parce que Next.js n'autorise que ses propres
 * exports dans un fichier `layout`, alors que la barre latérale, le fil
 * d'Ariane et le tiroir mobile ont tous besoin de cette même liste.
 *
 * Les entrées étaient auparavant présentées à plat : au-delà de sept
 * ou huit items, une liste sans regroupement se parcourt en lisant chaque
 * ligne. Les sections ci-dessous répondent à « qu'est-ce que je viens faire »
 * plutôt qu'à l'ordre d'implémentation.
 */

export interface AdminNavItem {
  href: string
  label: string
  icon: string
  /**
   * Une ligne sous le libellé, dans la barre latérale.
   *
   * Ce n'est pas de l'ornement : « Demandes » ou « Pages » ne disent pas
   * ce qu'on y trouve, et treize entrées se parcourent d'autant plus vite
   * qu'on n'a pas à ouvrir pour vérifier. Elle sert aussi de matière à la
   * recherche de la palette de commandes.
   */
  description: string
}

export interface AdminNavGroup {
  title: string | null
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: null,
    items: [{ href: '/admin', label: 'Tableau de bord', icon: 'LayoutDashboard', description: 'Ventes, revenus et tâches en attente' }],
  },
  {
    title: 'Contenu',
    items: [
      { href: '/admin/formations', label: 'Formations', icon: 'GraduationCap', description: 'Catalogue, chapitres et leçons' },
      { href: '/admin/produits', label: 'Boutique', icon: 'Package', description: 'E-books, vidéos et modèles à vendre' },
      { href: '/admin/services', label: 'Services', icon: 'Briefcase', description: 'Prestations et demandes de devis' },
      { href: '/admin/pages', label: 'Pages de vente', icon: 'FileText', description: 'Pages composées par blocs' },
      { href: '/admin/blog', label: 'Blog', icon: 'Newspaper', description: 'Articles et référencement' },
      { href: '/admin/medias', label: 'Médiathèque', icon: 'Image', description: 'Images, vidéos et documents' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { href: '/admin/commandes', label: 'Commandes', icon: 'Receipt', description: 'Paiements et virements à valider' },
      { href: '/admin/clients', label: 'Clients', icon: 'Users', description: 'Comptes, accès et progression' },
      { href: '/admin/demandes', label: 'Demandes', icon: 'Inbox', description: 'Messages de contact et devis' },
      { href: '/admin/avis', label: 'Avis', icon: 'Star', description: 'Témoignages à modérer' },
      { href: '/admin/codes-promo', label: 'Codes promo', icon: 'Tag', description: 'Remises et campagnes' },
      { href: '/admin/relances', label: 'Relances', icon: 'Repeat', description: 'Paiements abandonnés, apprenants inactifs' },
      { href: '/admin/abonnes', label: 'Abonnés', icon: 'Mail', description: 'Newsletter et exports' },
    ],
  },
  {
    title: 'Pilotage',
    items: [
      { href: '/admin/statistiques', label: 'Statistiques', icon: 'BarChart3', description: 'Audience, conversion et revenus' },
      { href: '/admin/journal', label: 'Journal', icon: 'ClipboardList', description: 'Qui a fait quoi, et quand' },
      { href: '/admin/parametres', label: 'Paramètres', icon: 'Settings', description: 'Identité, contact et paiements' },
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
