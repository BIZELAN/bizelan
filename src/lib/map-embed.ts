/**
 * Normalisation de l'URL de carte Google Maps.
 *
 * Le champ d'administration demandait « l'URL d'intégration obtenue via
 * Google Maps > Partager > Intégrer une carte ». Or ce menu ne donne PAS une
 * URL : il donne un snippet HTML complet, `<iframe src="…" …></iframe>`.
 * Suivre l'instruction à la lettre revenait donc à déposer tout le balisage
 * dans l'attribut `src` d'une iframe — carte muette, sans aucun message.
 *
 * Cette fonction accepte donc les deux formes, et ne renvoie que ce qui est
 * réellement une intégration Google Maps. Même discipline que
 * `safeYoutubeSrc` : on normalise vers une forme canonique, ou on renvoie
 * `null`. Rien d'autre n'atteint un attribut `src`.
 */

/**
 * Hôtes acceptés. La liste est fermée : la valeur finit dans le `src` d'une
 * iframe servie depuis notre domaine, et un champ de réglages reste une
 * entrée utilisateur même quand l'utilisateur est administrateur.
 */
const ALLOWED_HOSTS = [
  'www.google.com',
  'google.com',
  'maps.google.com',
  'www.google.co.uk',
]

export function safeMapEmbedSrc(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Forme 1 : le snippet complet copié depuis Google. On en extrait le `src`.
  const fromIframe = /<iframe[^>]*\ssrc=["']([^"']+)["']/i.exec(trimmed)
  const candidate = fromIframe ? fromIframe[1] : trimmed

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  if (url.protocol !== 'https:') return null
  if (!ALLOWED_HOSTS.includes(url.hostname.toLowerCase())) return null

  // Deux formes d'intégration produites par Google :
  //   /maps/embed?pb=…            — « Intégrer une carte »
  //   /maps?…&output=embed        — forme ancienne, encore servie
  const isEmbedPath = url.pathname === '/maps/embed'
  const isOutputEmbed = url.pathname.startsWith('/maps') && url.searchParams.get('output') === 'embed'
  if (!isEmbedPath && !isOutputEmbed) return null

  return url.toString()
}

/** Vrai si la saisie est non vide mais inexploitable — pour le message d'erreur. */
export function isInvalidMapEmbed(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '' && safeMapEmbedSrc(value) === null
}
