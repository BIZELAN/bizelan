/**
 * Contenu riche de l'éditeur TipTap.
 *
 * Le contenu est stocké en JSON ProseMirror — jamais en HTML. Le rendu public
 * (`components/ui/rich-content.tsx`) traduit ce JSON en éléments React via une
 * liste blanche stricte de nœuds, de marques et d'attributs. Aucun HTML fourni
 * par un éditeur n'est donc interprété : c'est la même garantie que le rendu
 * markdown historique, mais avec un éditeur WYSIWYG complet.
 *
 * Compatibilité : les contenus existants sont de simples chaînes markdown.
 * `RichContent` accepte les deux, et le rendu bascule automatiquement.
 */

export interface RichMark {
  type: string
  attrs?: Record<string, unknown> | null
}

export interface RichNode {
  type: string
  attrs?: Record<string, unknown> | null
  content?: RichNode[]
  marks?: RichMark[]
  text?: string
}

export interface RichDoc {
  type: 'doc'
  content?: RichNode[]
}

/** Contenu accepté partout : ancien markdown (chaîne) ou document TipTap. */
export type RichContent = string | RichDoc | null | undefined

/* ------------------------------------------------------------------ */
/* Reconnaissance et normalisation                                     */
/* ------------------------------------------------------------------ */

export function isRichDoc(value: unknown): value is RichDoc {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as RichNode).type === 'doc' &&
    (!(value as RichNode).content || Array.isArray((value as RichNode).content))
  )
}

export function emptyRichDoc(): RichDoc {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

/**
 * Normalise une valeur venant de la base ou d'un champ de formulaire.
 *
 * Les formulaires transmettent le document sérialisé dans un champ caché : il
 * arrive donc sous forme de chaîne JSON qu'il faut reconnaître, sans confondre
 * avec du markdown légitime commençant par une accolade.
 */
export function parseRichContent(value: unknown): RichContent {
  if (value == null) return null
  if (isRichDoc(value)) return value

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('{') && trimmed.includes('"type"')) {
      try {
        const parsed: unknown = JSON.parse(trimmed)
        if (isRichDoc(parsed)) return parsed
      } catch {
        // Ce n'était pas du JSON : on retombe sur le markdown.
      }
    }
    return value
  }

  return null
}

/** Texte brut d'un contenu — pour les extraits, le SEO et le temps de lecture. */
export function richContentToText(content: RichContent): string {
  if (!content) return ''
  if (typeof content === 'string') return content

  const parts: string[] = []
  const walk = (nodes: RichNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === 'text' && node.text) parts.push(node.text)
      if (node.type === 'hardBreak' || node.type === 'paragraph') parts.push(' ')
      walk(node.content)
    }
  }
  walk(content.content)
  return parts.join('').replace(/\s+/g, ' ').trim()
}

export function isRichContentEmpty(content: RichContent): boolean {
  if (!content) return true
  if (typeof content === 'string') return content.trim().length === 0

  // Un document peut contenir des nœuds sans texte (image, vidéo, tableau…) :
  // il n'est vide que s'il ne contient rien de tout cela.
  const MEANINGFUL = new Set([
    'image',
    'youtube',
    'table',
    'horizontalRule',
    'ctaButton',
    'callout',
    'codeBlock',
  ])
  let found = false
  const walk = (nodes: RichNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (found) return
      if (node.type === 'text' && node.text?.trim()) found = true
      else if (MEANINGFUL.has(node.type)) found = true
      else walk(node.content)
    }
  }
  walk(content.content)
  return !found
}

/* ------------------------------------------------------------------ */
/* Assainissement des attributs                                        */
/* ------------------------------------------------------------------ */

/** N'autorise que http(s), mailto, tel et les liens internes. */
export function safeUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed) ? trimmed : null
}

/** Couleurs : hexadécimal ou rgb()/rgba() uniquement. */
export function safeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i.test(trimmed)) {
    return trimmed
  }
  return null
}

/** Polices proposées par l'éditeur — toute autre valeur est ignorée. */
export const FONT_FAMILIES = [
  { label: 'Police du site', value: '' },
  { label: 'Titrage (serif)', value: 'var(--font-display)' },
  { label: 'Inter / système', value: 'ui-sans-serif, system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier', value: 'ui-monospace, "Courier New", monospace' },
] as const

const ALLOWED_FONTS = new Set<string>(FONT_FAMILIES.map((f) => f.value).filter(Boolean))

export function safeFontFamily(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return ALLOWED_FONTS.has(value.trim()) ? value.trim() : null
}

/** Tailles : de 12 à 72 px, exprimées en px ou rem. */
export function safeFontSize(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(\d{1,2}(?:\.\d+)?)(px|rem)$/)
  if (!match) return null
  const amount = Number(match[1])
  if (match[2] === 'px') return amount >= 10 && amount <= 72 ? `${amount}px` : null
  return amount >= 0.6 && amount <= 4.5 ? `${amount}rem` : null
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export function safeAlign(value: unknown): TextAlign | null {
  return value === 'left' || value === 'center' || value === 'right' || value === 'justify'
    ? value
    : null
}

/** Identifiant de vidéo YouTube extrait d'une URL d'intégration TipTap. */
export function safeYoutubeSrc(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.trim().match(
    /^https?:\/\/(?:www\.)?(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{6,20})/i,
  )
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null
}

export const CALLOUT_TONES = [
  { value: 'info', label: 'Information' },
  { value: 'success', label: 'Réussite' },
  { value: 'warning', label: 'Attention' },
  { value: 'danger', label: 'Mise en garde' },
] as const

export type CalloutTone = (typeof CALLOUT_TONES)[number]['value']

export function safeCalloutTone(value: unknown): CalloutTone {
  return CALLOUT_TONES.some((t) => t.value === value) ? (value as CalloutTone) : 'info'
}

export const CTA_VARIANTS = [
  { value: 'primary', label: 'Principal (vert)' },
  { value: 'accent', label: 'Accent (ocre)' },
  { value: 'outline', label: 'Contour' },
] as const

export type CtaVariant = (typeof CTA_VARIANTS)[number]['value']

export function safeCtaVariant(value: unknown): CtaVariant {
  return CTA_VARIANTS.some((v) => v.value === value) ? (value as CtaVariant) : 'primary'
}

/** Largeur d'image en pourcentage de la colonne (25 à 100). */
export function safeWidth(value: unknown): number | null {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) return null
  const rounded = Math.round(amount)
  return rounded >= 25 && rounded <= 100 ? rounded : null
}
