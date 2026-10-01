/**
 * Destinations de dépôt.
 *
 * Une liste fermée, partagée par le serveur qui signe et par le navigateur qui
 * envoie. Laisser le client nommer son bucket reviendrait à lui laisser écrire
 * où il veut — y compris dans les buckets d'une autre application, puisque ce
 * projet Supabase en héberge plusieurs.
 */

export interface UploadTarget {
  bucket: string
  /** Limite annoncée à l'utilisateur ; le bucket porte la même côté serveur. */
  maxBytes: number
  /** `null` accepte tout format — réservé aux supports de cours. */
  mimeTypes: string[] | null
  public: boolean
  label: string
}

const MB = 1024 * 1024

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Formats ouverts, courants dans l'administration et les ONG
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  // Archives : un support livré en plusieurs fichiers
  'application/zip',
  'text/csv',
]

export const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
]

export const UPLOAD_TARGETS: Record<string, UploadTarget> = {
  image: {
    bucket: 'public-media',
    maxBytes: 10 * MB,
    mimeTypes: IMAGE_MIME_TYPES,
    public: true,
    label: 'Image du site',
  },
  document: {
    bucket: 'resources',
    maxBytes: 100 * MB,
    mimeTypes: DOCUMENT_MIME_TYPES,
    public: false,
    label: 'Document ou support de cours',
  },
  video: {
    bucket: 'lesson-videos',
    // Deux gigaoctets : une leçon d'une heure en 1080p tient largement dessous.
    maxBytes: 2048 * MB,
    mimeTypes: VIDEO_MIME_TYPES,
    public: false,
    label: 'Vidéo de leçon',
  },
  /**
   * Fichiers vendus dans la boutique : e-books, vidéos, modèles, audio,
   * archives. Même principe que les supports de cours — bucket privé, lecture
   * par URL signée après vérification de l'achat.
   */
  product: {
    bucket: 'product-files',
    maxBytes: 2048 * MB,
    mimeTypes: [
      ...DOCUMENT_MIME_TYPES,
      ...VIDEO_MIME_TYPES,
      ...IMAGE_MIME_TYPES,
      'application/epub+zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/vnd.rar',
      'application/x-7z-compressed',
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/wav',
      'audio/ogg',
      'text/plain',
    ],
    public: false,
    label: 'Fichier de produit',
  },
}

export type UploadTargetName = keyof typeof UPLOAD_TARGETS

export function isUploadTarget(value: string): value is UploadTargetName {
  return Object.prototype.hasOwnProperty.call(UPLOAD_TARGETS, value)
}

/**
 * Chemin de dépôt.
 *
 * Le nom d'origine est nettoyé mais conservé en partie : retrouver un fichier
 * dans le tableau de bord Supabase est impossible quand tout s'appelle
 * `a3f9c2.pdf`. L'horodatage évite les collisions, et l'année range les
 * dossiers d'elle-même.
 *
 * Le nom fourni par le client n'est jamais employé tel quel : un `../` y
 * suffirait à écrire hors du dossier prévu.
 */
export function storagePathFor(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const rawBase = dot > 0 ? fileName.slice(0, dot) : fileName
  const rawExt = dot > 0 ? fileName.slice(dot + 1) : ''

  const base = normaliseForPath(rawBase).slice(0, 60) || 'fichier'
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'

  return `${new Date().getFullYear()}/${Date.now().toString(36)}-${base}.${ext}`
}

/**
 * Ramène un nom à `[a-z0-9-]`.
 *
 * Volontairement séparé du `slugify` des URL : celui-là sert à fabriquer des
 * adresses lisibles, celui-ci à empêcher une écriture hors dossier. Les faire
 * partager une implémentation signifierait qu'un ajustement cosmétique sur les
 * URL déplace, un jour, l'endroit où atterrissent les fichiers.
 *
 * La liste est BLANCHE, pas noire : tout ce qui n'est pas explicitement permis
 * disparaît. Une liste noire laisse toujours passer ce qu'on n'a pas prévu —
 * un point, une barre inversée, un encodage pourcent.
 */
function normaliseForPath(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/* ------------------------------------------------------------------ */
/* Lecture des documents                                               */
/* ------------------------------------------------------------------ */

export type DocumentKind =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'slides'
  | 'archive'
  | 'ebook'
  | 'video'
  | 'audio'
  | 'image'
  | 'other'

/**
 * Nature d'un document, d'après son type MIME puis son extension.
 *
 * Le type MIME est parfois absent ou faux — un `.docx` servi en
 * `application/octet-stream` est courant. L'extension sert alors de recours.
 */
export function documentKind(mimeType: string | null, fileName: string | null): DocumentKind {
  const mime = (mimeType ?? '').toLowerCase()
  if (mime === 'application/pdf') return 'pdf'
  if (mime.includes('wordprocessing') || mime === 'application/msword') return 'word'
  if (mime.includes('spreadsheet') || mime === 'application/vnd.ms-excel' || mime === 'text/csv') {
    return 'excel'
  }
  if (mime.includes('presentation') || mime === 'application/vnd.ms-powerpoint') return 'slides'
  if (mime === 'application/epub+zip') return 'ebook'
  if (mime === 'application/zip' || mime.includes('compressed') || mime.includes('rar')) {
    return 'archive'
  }
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('image/')) return 'image'

  const ext = (fileName ?? '').toLowerCase().split('.').pop() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'word'
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'excel'
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'slides'
  if (['epub', 'mobi'].includes(ext)) return 'ebook'
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive'
  if (['mp4', 'webm', 'mov', 'm4v', 'mkv'].includes(ext)) return 'video'
  if (['mp3', 'm4a', 'wav', 'ogg', 'aac'].includes(ext)) return 'audio'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'image'
  return 'other'
}

/** Libellé lisible d'une nature de document. */
export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  pdf: 'PDF',
  word: 'Document Word',
  excel: 'Tableur',
  slides: 'Présentation',
  archive: 'Archive',
  ebook: 'Livre numérique',
  video: 'Vidéo',
  audio: 'Audio',
  image: 'Image',
  other: 'Fichier',
}

/**
 * Lecture dans la page d'un média par un lecteur natif (`<video>`, `<audio>`).
 * Le navigateur sait lire MP4, WebM, MP3, M4A : pas besoin de télécharger.
 */
export function isPlayableInline(kind: DocumentKind): boolean {
  return kind === 'video' || kind === 'audio'
}

/**
 * Peut-on l'afficher DANS la page, sans téléchargement ?
 *
 * Seul le PDF, et c'est une limite du navigateur, pas un choix. Word et Excel
 * demanderaient une conversion, PowerPoint n'a aucun rendu fiable côté client.
 * Le reste se télécharge — le dire franchement vaut mieux qu'un cadre vide.
 */
export function isReadableInline(kind: DocumentKind): boolean {
  return kind === 'pdf'
}
