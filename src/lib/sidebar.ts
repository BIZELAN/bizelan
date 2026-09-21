/**
 * Mémorisation du repli de la barre latérale.
 *
 * La largeur passe par une variable CSS plutôt que par l'état React : posée
 * avant la peinture par le script ci-dessous, elle évite que la barre
 * s'affiche dépliée puis se rétracte à chaque chargement de page.
 */

export const SIDEBAR_STORAGE_KEY = 'bizelan-sidebar'
export const SIDEBAR_WIDTH = '16rem'
export const SIDEBAR_WIDTH_COLLAPSED = '4rem'

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
