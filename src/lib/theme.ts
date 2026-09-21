/**
 * Gestion du thème clair / sombre.
 *
 * Trois états, pas deux : « clair », « sombre » et « système ». Ce dernier est
 * le défaut et ne pose aucun attribut — la préférence du système d'exploitation
 * gouverne alors, via la requête média de `globals.css`.
 */

export type Theme = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'bizelan-theme'

/**
 * Script injecté dans le `<head>`, exécuté AVANT le premier rendu.
 *
 * Sans lui, la page s'affiche d'abord en clair puis bascule en sombre une fois
 * React monté : un flash blanc à chaque chargement, particulièrement pénible
 * de nuit. Le script est volontairement minuscule et synchrone — c'est le seul
 * moyen d'agir avant la peinture.
 *
 * Le `try/catch` est nécessaire : `localStorage` lève une exception en
 * navigation privée sur certains navigateurs, et l'échec ne doit pas empêcher
 * la page de s'afficher.
 */
export const THEME_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch (e) {}
})();
`.trim()

/** Applique un thème et le mémorise. Appelé uniquement côté navigateur. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement

  if (theme === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme)
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Stockage indisponible : le thème s'applique pour la session en cours.
  }
}

/** Thème mémorisé, ou « system » à défaut. */
export function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    if (value === 'dark' || value === 'light' || value === 'system') return value
  } catch {
    // ignoré
  }
  return 'system'
}
