/**
 * Dérivation d'une palette lisible à partir des couleurs choisies dans l'admin.
 *
 * L'administrateur choisit UNE couleur. L'interface en a besoin de quatre :
 * l'aplat, le texte qui se pose dessus, la variante lisible en texte sur la
 * page, et le voile de fond. Les déduire à l'œil, c'est reproduire le problème
 * du GreenYellow — superbe en aplat, illisible en texte, 1,15:1.
 *
 * Elles sont donc CALCULÉES, et le calcul s'arrête sur une mesure de contraste,
 * pas sur une impression. Une couleur choisie reste donc utilisable même si
 * l'administrateur choisit un jaune fluo.
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

/* ------------------------------------------------------------------ */
/* Conversions                                                         */
/* ------------------------------------------------------------------ */

export function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, '')
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/** Canaux séparés par des espaces — la forme attendue par nos jetons CSS. */
export function toChannels({ r, g, b }: Rgb): string {
  return `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`
}

function toLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a)
  const lb = luminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

/* ------------------------------------------------------------------ */
/* Teinte, saturation, luminosité                                      */
/* ------------------------------------------------------------------ */

interface Hsl {
  h: number
  s: number
  l: number
}

export function toHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h, s, l }
}

export function fromHsl({ h, s, l }: Hsl): Rgb {
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return {
    r: Math.round(channel(h + 1 / 3) * 255),
    g: Math.round(channel(h) * 255),
    b: Math.round(channel(h - 1 / 3) * 255),
  }
}

/* ------------------------------------------------------------------ */
/* Dérivations                                                         */
/* ------------------------------------------------------------------ */

const WHITE: Rgb = { r: 255, g: 255, b: 255 }

/**
 * Encre sombre de référence.
 *
 * Volontairement une constante et non la couleur de texte du thème : en thème
 * sombre celle-ci est presque blanche, et `readableOn` comparait alors deux
 * couleurs claires entre elles. Tout aplat vif se retrouvait avec du texte
 * clair dessus, à 1,1:1. C'est le test qui l'a montré.
 */
const INK: Rgb = { r: 13, g: 20, b: 17 }

/**
 * Texte à poser SUR un aplat de cette couleur : encre sombre ou blanc, celui
 * des deux qui contraste le plus. Un aplat vif veut du texte sombre, un aplat
 * profond veut du blanc — et c'est la mesure qui tranche, pas l'intuition.
 */
export function readableOn(fill: Rgb): Rgb {
  return contrast(fill, INK) >= contrast(fill, WHITE) ? INK : WHITE
}

/**
 * Variante lisible en TEXTE de cette couleur, sur le fond donné.
 *
 * On garde la teinte et la saturation, et on déplace la seule luminosité
 * jusqu'à franchir le seuil. La recherche est bornée : au pire on finit sur du
 * noir ou du blanc, ce qui passe toujours.
 *
 * C'est la fonction qui empêche l'administrateur de rendre son site illisible
 * en choisissant une couleur trop claire — le jaune reste jaune en aplat, mais
 * son texte devient un ocre foncé.
 */
export function readableText(color: Rgb, backgrounds: Rgb | Rgb[], target = 4.5): Rgb {
  // Plusieurs fonds parce que la même couleur de texte sert sur la page ET sur
  // son propre voile. Ne la vérifier que sur la page laissait les encadrés
  // sous le seuil : mesuré à 3,80:1 pour un rouge saturé.
  const list = Array.isArray(backgrounds) ? backgrounds : [backgrounds]
  const holds = (candidate: Rgb) => list.every((bg) => contrast(candidate, bg) >= target)

  if (holds(color)) return color

  const hsl = toHsl(color)
  // Le sens est donné par le fond le plus clair : c'est lui qui contraint.
  const lightest = list.reduce((a, b) => (luminance(a) >= luminance(b) ? a : b))
  const goDarker = luminance(lightest) > 0.5
  const step = 0.01

  for (let i = 1; i <= 100; i++) {
    const l = goDarker ? hsl.l - i * step : hsl.l + i * step
    if (l < 0 || l > 1) break
    const candidate = fromHsl({ ...hsl, l })
    if (holds(candidate)) return candidate
  }
  // Butée : la teinte ne suffit pas, on prend l'extrême correspondant.
  return goDarker ? { r: 0, g: 0, b: 0 } : WHITE
}

/**
 * Voile très pâle de la couleur, pour les fonds de pastilles et d'encadrés.
 * Mélange avec le fond plutôt que simple éclaircissement : la nuance reste
 * dans la famille du fond, ce qui évite l'effet de pastille rapportée.
 */
export function subtleOf(color: Rgb, background: Rgb, amount = 0.12): Rgb {
  return {
    r: color.r * amount + background.r * (1 - amount),
    g: color.g * amount + background.g * (1 - amount),
    b: color.b * amount + background.b * (1 - amount),
  }
}

/** Survol : un cran plus soutenu, dans le sens opposé au fond. */
export function hoverOf(color: Rgb, background: Rgb): Rgb {
  const hsl = toHsl(color)
  const goDarker = luminance(background) > 0.5
  const l = goDarker ? Math.max(0, hsl.l - 0.08) : Math.min(1, hsl.l + 0.08)
  return fromHsl({ ...hsl, l })
}

/* ------------------------------------------------------------------ */
/* Palette complète                                                    */
/* ------------------------------------------------------------------ */

export interface DerivedRole {
  fill: string
  fillHover: string
  onFill: string
  text: string
  subtle: string
}

/**
 * Déduit les cinq jetons d'un rôle à partir de la seule couleur choisie.
 * `background` décrit le thème visé : la même couleur donne donc une palette
 * différente en clair et en sombre, ce qui est exactement l'intention.
 */
export function deriveRole(color: Rgb, background: Rgb): DerivedRole {
  // Le voile est calculé AVANT le texte : celui-ci doit tenir sur les deux.
  const subtle = subtleOf(color, background)
  return {
    fill: toChannels(color),
    fillHover: toChannels(hoverOf(color, background)),
    onFill: toChannels(readableOn(color)),
    text: toChannels(readableText(color, [background, subtle])),
    subtle: toChannels(subtle),
  }
}

/* ------------------------------------------------------------------ */
/* Dégradés                                                            */
/* ------------------------------------------------------------------ */

export interface GradientInput {
  from: string
  to: string
  angle: number
}

/**
 * Construit un dégradé CSS à partir de deux couleurs et d'un angle.
 * Renvoie `null` si l'une des couleurs est invalide : mieux vaut ne rien
 * peindre qu'un dégradé à moitié défini.
 */
export function buildGradient(input: GradientInput): string | null {
  const from = parseHex(input.from)
  const to = parseHex(input.to)
  if (!from || !to) return null
  const angle = Number.isFinite(input.angle) ? Math.round(input.angle) % 360 : 135
  return `linear-gradient(${angle}deg, ${toHex(from)}, ${toHex(to)})`
}

/**
 * Texte à poser sur un dégradé : la mesure porte sur le stop le PLUS clair et
 * le plus sombre, et on garde la couleur qui tient sur les deux. Ne regarder
 * qu'une extrémité laisse l'autre illisible.
 */
export function readableOnGradient(
  input: GradientInput,
): { color: Rgb; worst: number } | null {
  const from = parseHex(input.from)
  const to = parseHex(input.to)
  if (!from || !to) return null

  const worstInk = Math.min(contrast(from, INK), contrast(to, INK))
  const worstWhite = Math.min(contrast(from, WHITE), contrast(to, WHITE))

  // `worst` est renvoyé, et non tu : un dégradé qui va du jaune au bleu nuit
  // n'admet AUCUNE couleur de texte lisible sur toute sa longueur. Le cacher
  // produirait un titre illisible sur une moitié du bandeau ; le dire permet
  // à l'administration d'en être avertie.
  return worstInk >= worstWhite
    ? { color: INK, worst: worstInk }
    : { color: WHITE, worst: worstWhite }
}
