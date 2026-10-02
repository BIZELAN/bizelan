/**
 * Nature d'un média désigné par son adresse.
 *
 * Partout où l'administration choisit une « image » (couverture, visuel de
 * bloc, fond), elle peut désormais choisir une vidéo. La colonne reste un
 * simple texte : c'est l'extension du fichier qui dit comment l'afficher.
 * Pur et sans dépendance — utilisable côté serveur comme dans le navigateur.
 */

const VIDEO_EXT = /\.(mp4|m4v|webm|mov|ogv|ogg)$/i
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif)$/i

/** Chemin de l'URL, sans paramètres ni ancre. */
function pathOf(url: string): string {
  try {
    return new URL(url, 'https://x.invalid').pathname
  } catch {
    return url.split(/[?#]/)[0] ?? url
  }
}

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return VIDEO_EXT.test(pathOf(url))
}

export function isImageUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return IMAGE_EXT.test(pathOf(url))
}

export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'other'

/** Famille d'un fichier de la médiathèque, d'après son type MIME puis son nom. */
export function mediaKind(mimeType: string | null | undefined, fileName?: string | null): MediaKind {
  const mime = (mimeType ?? '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  const name = fileName ?? ''
  if (isImageUrl(name)) return 'image'
  if (isVideoUrl(name)) return 'video'
  if (/\.(mp3|m4a|wav|aac|flac)$/i.test(name)) return 'audio'
  if (
    mime.startsWith('application/') ||
    mime.startsWith('text/') ||
    /\.(pdf|docx?|xlsx?|pptx?|odt|ods|odp|csv|txt|zip|rar|7z|epub)$/i.test(name)
  ) {
    return 'document'
  }
  return 'other'
}

/** Ce qu'un champ de média accepte. */
export type MediaAccept = 'image' | 'media' | 'any'

export const ACCEPT_ATTR: Record<MediaAccept, string | undefined> = {
  image: 'image/*',
  media: 'image/*,video/*',
  any: undefined,
}
