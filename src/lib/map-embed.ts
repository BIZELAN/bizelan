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

/* ------------------------------------------------------------------ */
/* Lien d'ouverture dans Google Maps                                   */
/* ------------------------------------------------------------------ */

/**
 * Lien de partage Google Maps, ou `null`.
 *
 * C'est le lien que l'on OUVRE (nouvel onglet, application Maps sur
 * téléphone), à ne pas confondre avec l'URL d'intégration ci-dessus. Google en
 * produit plusieurs formes : `maps.app.goo.gl/…` (bouton « Partager »),
 * `goo.gl/maps/…` (ancienne), `www.google.com/maps/place/…`,
 * `maps.google.com/?q=…`, et les domaines nationaux (`google.bj`, `google.fr`).
 * Toute autre adresse est refusée : le lien est affiché sur chaque page du
 * site, il ne doit pas pouvoir mener ailleurs.
 */
export function safeMapsLink(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase()
  const path = url.pathname

  const ok =
    host === 'maps.app.goo.gl' ||
    (host === 'goo.gl' && path.startsWith('/maps')) ||
    host === 'maps.google.com' ||
    (/^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host) && path.startsWith('/maps'))

  return ok ? url.toString() : null
}

/**
 * Lien Google Maps de l'adresse du cabinet.
 *
 * Le lien saisi dans les paramètres prime — il pointe la fiche exacte, avec
 * avis et horaires. À défaut, une recherche de l'adresse : moins précise,
 * mais toujours utile, et sans rien à configurer.
 */
export function mapsLinkFor(settings: {
  maps_url?: string | null
  address?: string | null
}): string | null {
  const direct = safeMapsLink(settings.maps_url)
  if (direct) return direct
  const address = settings.address?.trim()
  if (!address) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
