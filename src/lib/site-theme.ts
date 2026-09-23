import {
  buildGradient,
  deriveRole,
  parseHex,
  readableOnGradient,
  toChannels,
  type Rgb,
} from '@/lib/theme-tokens'

/**
 * Traduit l'apparence choisie dans l'administration en surcharges de jetons.
 *
 * Le principe qui rend la chose sûre : l'administration ne choisit que des
 * COULEURS DE MARQUE. Tout le reste — texte lisible, survol, voile, texte
 * posé sur un aplat — est recalculé ici, et le calcul s'arrête sur une mesure
 * de contraste. Une couleur mal choisie ne peut donc pas rendre le site
 * illisible ; au pire elle n'est pas celle qu'on imaginait.
 *
 * Les fonds, les textes et les bordures ne sont PAS exposés au réglage. Ce
 * sont eux qui portent la lisibilité de l'ensemble, et les ouvrir reviendrait
 * à confier le contraste à l'œil de qui remplit le formulaire.
 */

export interface SiteTheme {
  primary?: string
  secondary?: string
  gradientFrom?: string
  gradientTo?: string
  gradientAngle?: number
  radius?: 'sm' | 'md' | 'lg'
}

/** Doit refléter `globals.css`. Ce sont les fonds sur lesquels on mesure. */
const LIGHT_BG: Rgb = { r: 246, g: 248, b: 247 }
const DARK_BG: Rgb = { r: 10, g: 16, b: 13 }

const RADIUS: Record<string, [string, string, string]> = {
  sm: ['0.25rem', '0.375rem', '0.5rem'],
  md: ['0.375rem', '0.625rem', '0.875rem'],
  lg: ['0.625rem', '1rem', '1.5rem'],
}

export function parseTheme(value: unknown): SiteTheme {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = value as Record<string, unknown>
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : undefined)
  const radius = str('radius')
  return {
    primary: str('primary'),
    secondary: str('secondary'),
    gradientFrom: str('gradientFrom'),
    gradientTo: str('gradientTo'),
    gradientAngle: typeof raw.gradientAngle === 'number' ? raw.gradientAngle : undefined,
    radius: radius === 'sm' || radius === 'md' || radius === 'lg' ? radius : undefined,
  }
}

function roleBlock(prefix: string, color: Rgb, background: Rgb): string {
  const role = deriveRole(color, background)
  return [
    `--${prefix}: ${role.fill};`,
    `--${prefix}-hover: ${role.fillHover};`,
    `--${prefix}-fg: ${role.onFill};`,
    `--${prefix}-text: ${role.text};`,
    `--${prefix}-subtle: ${role.subtle};`,
  ].join('')
}

/**
 * Feuille de surcharge à injecter après `globals.css`.
 *
 * Chaîne vide quand rien n'est réglé : aucune balise `<style>` superflue, et
 * le site garde sa palette d'origine. Le sélecteur est doublé pour couvrir la
 * préférence système ET le choix explicite, comme les blocs d'origine.
 */
export function buildThemeCss(theme: SiteTheme): string {
  const parts: string[] = []
  const light: string[] = []
  const dark: string[] = []

  for (const [key, prefix] of [
    ['primary', 'primary'],
    ['secondary', 'secondary'],
  ] as const) {
    const hex = theme[key]
    if (!hex) continue
    const color = parseHex(hex)
    if (!color) continue // Valeur illisible : on garde celle d'origine.
    light.push(roleBlock(prefix, color, LIGHT_BG))
    dark.push(roleBlock(prefix, color, DARK_BG))
  }

  // L'anneau de focus suit la couleur de marque : c'est le même rôle.
  if (theme.primary) {
    const color = parseHex(theme.primary)
    if (color) {
      light.push(`--ring: ${deriveRole(color, LIGHT_BG).text};`)
      dark.push(`--ring: ${deriveRole(color, DARK_BG).text};`)
    }
  }

  if (theme.radius && RADIUS[theme.radius]) {
    const [sm, md, lg] = RADIUS[theme.radius]
    light.push(`--radius-sm:${sm};--radius-md:${md};--radius-lg:${lg};`)
  }

  const gradient = buildGradient({
    from: theme.gradientFrom ?? '',
    to: theme.gradientTo ?? '',
    angle: theme.gradientAngle ?? 135,
  })
  if (gradient) {
    const readable = readableOnGradient({
      from: theme.gradientFrom ?? '',
      to: theme.gradientTo ?? '',
      angle: theme.gradientAngle ?? 135,
    })
    light.push(`--brand-gradient:${gradient};`)
    if (readable) light.push(`--brand-gradient-fg: ${toChannels(readable.color)};`)
  }

  if (light.length) parts.push(`:root,[data-theme='light']{${light.join('')}}`)
  if (dark.length) {
    parts.push(
      `@media (prefers-color-scheme:dark){:root:not([data-theme='light']){${dark.join('')}}}`,
      `[data-theme='dark']{${dark.join('')}}`,
    )
  }

  // La console d'administration garde sa propre palette : elle est posée plus
  // bas dans la cascade et resterait gagnante, mais l'exclure explicitement
  // évite de recalculer pour rien et documente l'intention.
  return parts.join('')
}

/**
 * Avertissements destinés à l'administration.
 *
 * Ils ne bloquent rien : la palette reste lisible quoi qu'il arrive, puisque
 * les jetons dérivés sont mesurés. Mais un dégradé qui ne peut porter aucun
 * texte mérite d'être signalé AVANT publication plutôt que découvert dessus.
 */
export function themeWarnings(theme: SiteTheme): string[] {
  const warnings: string[] = []

  for (const [key, label] of [
    ['primary', 'couleur principale'],
    ['secondary', 'couleur secondaire'],
    ['gradientFrom', 'première couleur du dégradé'],
    ['gradientTo', 'seconde couleur du dégradé'],
  ] as const) {
    const value = theme[key]
    if (value && !parseHex(value)) {
      warnings.push(`La ${label} n’est pas une couleur valide (${value}) : elle est ignorée.`)
    }
  }

  const from = theme.gradientFrom
  const to = theme.gradientTo
  if (from && to && parseHex(from) && parseHex(to)) {
    const readable = readableOnGradient({ from, to, angle: theme.gradientAngle ?? 135 })
    if (readable && readable.worst < 4.5) {
      warnings.push(
        `Ce dégradé ne permet aucun texte lisible sur toute sa longueur ` +
          `(${readable.worst.toFixed(1)}:1 au pire endroit). Rapprochez les deux ` +
          `couleurs en luminosité, ou réservez-le à un fond sans texte.`,
      )
    }
  }

  return warnings
}
