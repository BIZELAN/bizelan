import type { VideoProvider } from '@/lib/types'

/**
 * Résolution des vidéos, pour tout le site.
 *
 * Il en existait quatre implémentations indépendantes — la page de leçon, le
 * bloc « Vidéo », le rendu de contenu riche et le lecteur public — chacune avec
 * sa propre expression régulière YouTube. Elles avaient déjà divergé : deux
 * posaient `rel=0&modestbranding=1`, deux non. Une seule ici.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Pourquoi `storage://` et non une valeur d'enum
 *
 * La première version ajoutait `'upload'` à l'enum `bz_video_provider`, avec
 * le chemin du fichier rangé dans `video_id`. Deux raisons d'abandonner :
 *
 * 1. `courses.promo_video_url` et le bloc « Vidéo » n'ont AUCUNE colonne
 *    `video_provider`. Ils ne portent qu'une URL. Une valeur d'enum ne peut
 *    donc jamais les servir — or une vidéo déposée doit pouvoir se jouer là
 *    aussi.
 * 2. Une valeur d'enum exige un `alter type` : une migration, une bascule, et
 *    entre-temps un enregistrement qui échoue avec `22P02`. C'est exactement
 *    ce qui s'est produit : l'éditeur proposait `upload` par défaut alors que
 *    la base l'ignorait, donc AUCUNE vidéo ne pouvait être ajoutée.
 *
 * Un URI `storage://bucket/chemin` fait voyager l'information AVEC la valeur,
 * dans n'importe quelle colonne de texte, sans changement de schéma.
 */

export const STORAGE_SCHEME = 'storage://'

export interface VideoRef {
  provider?: VideoProvider | null
  /** Identifiant chez l'hébergeur (YouTube, Vimeo, Bunny). */
  videoId?: string | null
  /** URL publique, ou URI `storage://…` pour un fichier déposé. */
  videoUrl?: string | null
  bunnyHostname?: string | null
}

/**
 * Ce qu'il y a à jouer, une fois la référence interprétée.
 *
 * `storage` n'est pas jouable en l'état : il faut d'abord signer une URL, ce
 * qui demande la clé de service et donc le serveur. Le distinguer par le type
 * plutôt que par une convention rend l'oubli impossible à la compilation.
 */
export type VideoTarget =
  | { kind: 'embed'; url: string }
  | { kind: 'file'; url: string }
  | { kind: 'storage'; bucket: string; path: string }

/** Une vidéo prête à être rendue par le navigateur. */
export type PlayableVideo = { kind: 'embed' | 'file'; url: string }

/* ------------------------------------------------------------------ */
/* URI de stockage                                                     */
/* ------------------------------------------------------------------ */

export function toStorageUri(bucket: string, path: string): string {
  return `${STORAGE_SCHEME}${bucket}/${path}`
}

/**
 * Découpe `storage://bucket/chemin`.
 *
 * La valeur vient de la base, donc d'une saisie d'administration : on ne lui
 * fait pas confiance. Le nom de bucket est contraint à `[a-z0-9-]` et le
 * chemin ne peut contenir `..` — sans quoi une URL signée pourrait être
 * demandée pour un fichier d'un autre bucket de ce projet, qui en héberge
 * plusieurs applications.
 */
export function parseStorageUri(value: string | null | undefined): { bucket: string; path: string } | null {
  if (!value || !value.startsWith(STORAGE_SCHEME)) return null

  const rest = value.slice(STORAGE_SCHEME.length)
  const slash = rest.indexOf('/')
  if (slash <= 0) return null

  const bucket = rest.slice(0, slash)
  const path = rest.slice(slash + 1)

  if (!/^[a-z0-9][a-z0-9-]*$/.test(bucket)) return null
  if (!path || path.includes('..') || path.startsWith('/')) return null

  return { bucket, path }
}

/* ------------------------------------------------------------------ */
/* Hébergeurs                                                          */
/* ------------------------------------------------------------------ */

const YOUTUBE_ID = /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{11})/
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/

/**
 * Extensions traitées comme un fichier lisible directement.
 *
 * `.mov` et `.mkv` y figurent parce que la liste blanche de dépôt les accepte
 * (`video/quicktime`, `video/x-matroska`). Les omettre les faisait tomber dans
 * la branche « intégration » : un <iframe> vers un fichier vidéo, soit un
 * rectangle blanc. Dans une balise <video>, le navigateur qui ne sait pas les
 * décoder affiche au moins son propre message et le lien de téléchargement.
 */
const VIDEO_FILE = /\.(mp4|webm|ogg|ogv|m3u8|mov|mkv|m4v)(\?|#|$)/i

export function isVideoFileUrl(url: string): boolean {
  return VIDEO_FILE.test(url)
}

/**
 * Formats dont le temps de visionnage peut être CRU.
 *
 * Plus étroit que `VIDEO_FILE`, et l'écart est volontaire. `.mov` et `.mkv` se
 * rendent bien dans une balise <video>, mais la plupart des navigateurs ne les
 * décodent pas. Les déclarer mesurables enfermerait l'apprenant : le garde-fou
 * exigerait un temps de visionnage qu'aucune lecture ne peut produire, et le
 * certificat serait retenu à jamais. Mieux vaut exclure la leçon du calcul que
 * poser une condition impossible.
 */
const MEASURABLE_FILE = /\.(mp4|webm|ogg|ogv|m3u8|m4v)(\?|#|$)/i

/**
 * Le temps de visionnage de cette vidéo est-il mesurable ?
 *
 * Doit rester cohérent avec `public.bz_lesson_is_measurable` côté base : c'est
 * la même question posée des deux côtés, et deux réponses divergentes
 * produiraient un certificat retenu sans raison visible.
 */
export function isMeasurableVideoUrl(value: string | null | undefined): boolean {
  const url = value?.trim()
  if (!url) return false

  // Un fichier déposé par nos soins : la liste blanche de dépôt garantit un
  // format vidéo, et le lecteur le sert en fichier direct.
  const stored = parseStorageUri(url)
  if (stored) return MEASURABLE_FILE.test(stored.path)

  if (embedUrlFromUrl(url)) return false
  return MEASURABLE_FILE.test(url)
}

/**
 * Extrait un identifiant YouTube, que l'on ait reçu l'identifiant ou une URL.
 *
 * L'aide du champ, dans l'administration, dit : « Vous pouvez aussi coller
 * l'URL complète. » Elle le disait déjà, mais rien ne l'honorait : la seule
 * leçon du catalogue qui portait une vidéo avait une URL dans `video_id`, et
 * produisait donc
 *
 *     https://www.youtube-nocookie.com/embed/https://youtu.be/XXXXXXXXXXX
 *
 * soit un lecteur vide. C'était la panne visible du lecteur de l'espace
 * client : une seule vidéo en ligne, et elle ne partait pas.
 */
export function youtubeIdFrom(value: string): string | null {
  const trimmed = value.trim()
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed
  const match = YOUTUBE_ID.exec(trimmed)
  return match ? match[1] : null
}

/** Même tolérance pour Vimeo : numéro seul ou URL complète. */
export function vimeoIdFrom(value: string): string | null {
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  const match = VIMEO_ID.exec(trimmed)
  return match ? match[1] : null
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
}

export function vimeoEmbedUrl(id: string): string {
  return `https://player.vimeo.com/video/${id}`
}

/**
 * Reconnaît une URL YouTube ou Vimeo collée telle quelle.
 *
 * `null` si ce n'en est pas une — l'appelant décide alors s'il s'agit d'un
 * fichier direct ou de rien du tout.
 */
export function embedUrlFromUrl(url: string): string | null {
  const yt = YOUTUBE_ID.exec(url)
  if (yt) return youtubeEmbedUrl(yt[1])
  const vimeo = VIMEO_ID.exec(url)
  if (vimeo) return vimeoEmbedUrl(vimeo[1])
  return null
}

/* ------------------------------------------------------------------ */
/* Résolution                                                          */
/* ------------------------------------------------------------------ */

/**
 * Interprète une référence vidéo. Aucune entrée/sortie : utilisable sur le
 * serveur comme dans le navigateur.
 *
 * L'ordre compte. Le fournisseur déclaré passe avant la reconnaissance par
 * URL : un administrateur qui a choisi « Vimeo » et saisi l'identifiant doit
 * obtenir Vimeo, même si l'ancienne valeur de `video_url` traîne encore en
 * base — ce qui arrive après un changement de fournisseur, puisque les deux
 * colonnes coexistent.
 */
export function resolveVideoRef(ref: VideoRef): VideoTarget | null {
  const { provider, videoId, videoUrl, bunnyHostname } = ref

  // Si l'identifiant est inexploitable, on NE fabrique PAS une URL bancale : on
  // laisse la suite retomber sur `videoUrl`, puis sur le message d'absence. Une
  // iframe vers une adresse inventee affiche un cadre blanc, et l'apprenant n'a
  // aucun moyen de savoir que c'est la saisie qui est en cause.
  if (provider === 'youtube' && videoId) {
    const id = youtubeIdFrom(videoId)
    if (id) return { kind: 'embed', url: youtubeEmbedUrl(id) }
  }
  if (provider === 'vimeo' && videoId) {
    const id = vimeoIdFrom(videoId)
    if (id) return { kind: 'embed', url: vimeoEmbedUrl(id) }
  }
  if (provider === 'bunny' && videoId && bunnyHostname) {
    return { kind: 'embed', url: `https://${bunnyHostname}/embed/${videoId.trim()}` }
  }

  // Ancien fournisseur `upload` : le chemin était rangé dans `video_id`. Cette
  // valeur d'enum n'a jamais existé en base, donc aucune ligne n'en porte —
  // c'est ici par sûreté, pour le cas où la migration 0005 d'origine aurait
  // été appliquée sur un environnement avant son remplacement.
  if (provider === 'upload' && videoId) {
    return { kind: 'storage', bucket: 'lesson-videos', path: videoId }
  }

  if (videoUrl) return resolveVideoUrl(videoUrl)
  return null
}

/**
 * Cas d'une simple URL, sans colonne de fournisseur : `promo_video_url`, le
 * bloc « Vidéo », le champ libre de l'éditeur de programme.
 */
export function resolveVideoUrl(value: string | null | undefined): VideoTarget | null {
  const url = value?.trim()
  if (!url) return null

  const stored = parseStorageUri(url)
  if (stored) return { kind: 'storage', ...stored }

  const embed = embedUrlFromUrl(url)
  if (embed) return { kind: 'embed', url: embed }

  if (isVideoFileUrl(url)) return { kind: 'file', url }

  // Une URL http(s) quelconque : on l'intègre, faute de mieux. Tout autre
  // schéma est écarté — `javascript:` dans un attribut `src` s'exécuterait.
  if (/^https?:\/\//i.test(url)) return { kind: 'embed', url }

  return null
}
