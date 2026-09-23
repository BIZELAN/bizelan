/**
 * Mémorisation du repli de la barre latérale.
 *
 * La largeur passe par une variable CSS plutôt que par l'état React : posée
 * avant la peinture par le script ci-dessous, elle évite que la barre
 * s'affiche dépliée puis se rétracte à chaque chargement de page.
 */

export const SIDEBAR_STORAGE_KEY = 'bizelan-sidebar'
/**
 * Les entrées de navigation sont des cartes à deux lignes : il leur faut la
 * largeur de la tuile d'icône (36 px), d'un libellé et de sa description.
 * Repliée, la barre ne conserve que la tuile et sa marge.
 */
export const SIDEBAR_WIDTH = '19.5rem'
export const SIDEBAR_WIDTH_COLLAPSED = '4.75rem'

/**
 * Bascule la console sur sa palette, et applique le repli mémorisé.
 *
 * `data-console` est posé sur <html> et non sur la coquille React pour une
 * raison précise : Radix rend ses infobulles, menus et dialogues dans un
 * PORTAIL, c'est-à-dire hors du sous-arbre de la coquille. Marqué plus bas,
 * l'attribut ne les atteindrait pas et ils retomberaient sur la palette du
 * site public — un menu vert-jaune au milieu d'une console cyan.
 *
 * Marquer chaque portail n'était pas une option : les primitives de
 * `components/ui` servent aussi le site public.
 *
 * Le script s'exécute avant la peinture, donc sans transition visible.
 */
export const CONSOLE_SCRIPT = `
document.documentElement.setAttribute('data-console','');
`.trim()

export const SIDEBAR_SCRIPT = `
(function(){
  try {
    if (localStorage.getItem('${SIDEBAR_STORAGE_KEY}') === 'collapsed') {
      document.documentElement.style.setProperty('--sidebar-w', '${SIDEBAR_WIDTH_COLLAPSED}');
      document.documentElement.setAttribute('data-sidebar', 'collapsed');
    }
  } catch (e) {}
})();
`.trim()

export function applySidebar(collapsed: boolean) {
  const root = document.documentElement
  root.style.setProperty('--sidebar-w', collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH)

  if (collapsed) root.setAttribute('data-sidebar', 'collapsed')
  else root.removeAttribute('data-sidebar')

  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? 'collapsed' : 'expanded')
  } catch {
    // Stockage indisponible : le repli vaut pour la session en cours.
  }
}

export function readStoredSidebar(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'collapsed'
  } catch {
    return false
  }
}
