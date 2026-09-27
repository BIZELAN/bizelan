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

/**
 * Hôtes YouTube. Liste FERMÉE : c'est elle qui autorise l'intégration, et un
 * `includes('youtube.com')` accepterait `youtube.com.pirate.test`.
 */
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'www.youtu.be',
])

/**
 * Segments de chemin qui précèdent un identifiant de vidéo sur youtube.com.
 *
 * Le contrôle est nécessaire : `/c/abcdefghijk` est une chaîne dont le dernier
 * segment fait onze caractères valides, et serait pris pour une vidéo.
 */
const YOUTUBE_VIDEO_SEGMENTS = new Set(['embed', 'live', 'shorts', 'v', 'e', 'watch'])

const YOUTUBE_ID_SHAPE = /^[\w-]{11}$/

const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'])

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
 * Lit une URL, même écrite sans schème.
 *
 * Un administrateur colle volontiers `www.youtube.com/watch?v=…` : sans
 * schème, `new URL` lève une exception. On préfixe alors, plutôt que de perdre
 * l'URL pour un détail de saisie.
 */
function parseLooseUrl(value: string): URL | null {
  for (const candidate of [value, `https://${value}`]) {
    try {
      const url = new URL(candidate)
      if (url.protocol === 'http:' || url.protocol === 'https:') return url
    } catch {
      // On essaie la forme suivante.
    }
  }
  return null
}

/**
 * Extrait un identifiant YouTube, que l'on ait reçu l'identifiant ou une URL.
 *
 * La version précédente cherchait `watch?v=` par expression régulière, donc
 * exigeait que `v` soit le PREMIER paramètre. Or les liens du quotidien ne le
 * sont pas :
 *
 *     ?app=desktop&v=…      lien copié depuis l'application
 *     ?feature=shared&v=…   bouton « Partager »
 *     ?list=PL…&v=…         copié depuis une playlist
 *
 * Ces trois formes tombaient dans le repli générique, qui encadrait la page
 * `youtube.com/watch` — que YouTube refuse de laisser encadrer. Résultat : un
 * rectangle blanc, sans message d'aucune sorte. On lit donc la requête, au lieu
 * de parier sur l'ordre des paramètres.
 */
export function youtubeIdFrom(value: string): string | null {
  const trimmed = value.trim()
  if (YOUTUBE_ID_SHAPE.test(trimmed)) return trimmed

  const url = parseLooseUrl(trimmed)
  if (!url) return null

  const host = url.hostname.toLowerCase()
  if (!YOUTUBE_HOSTS.has(host)) return null

  // `?v=` où qu'il se trouve dans la requête.
  const v = url.searchParams.get('v')
  if (v && YOUTUBE_ID_SHAPE.test(v)) return v

  const segments = url.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (!last || !YOUTUBE_ID_SHAPE.test(last)) return null

  // `youtu.be/ID` : l'identifiant est le chemin entier.
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    return segments.length === 1 ? last : null
  }

  // Sur youtube.com, l'identifiant doit être annoncé par son segment — sans
  // quoi `/c/abcdefghijk`, une chaîne, passerait pour une vidéo.
  return segments.length >= 2 && YOUTUBE_VIDEO_SEGMENTS.has(segments[segments.length - 2])
    ? last
    : null
}

/**
 * Même tolérance pour Vimeo : numéro seul ou URL complète.
 *
 * Le jeton `h` des vidéos non répertoriées est conservé. Sans lui, une vidéo
 * non répertoriée répond « Nous n'avons pas trouvé cette page » : c'est le cas
 * de toutes celles qu'on ne veut pas voir figurer dans la recherche Vimeo, donc
 * précisément celles d'une formation payante. Vimeo l'écrit tantôt en
 * paramètre `?h=`, tantôt comme second segment du chemin.
 */
export function vimeoIdFrom(value: string): { id: string; hash: string | null } | null {
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) return { id: trimmed, hash: null }

  const url = parseLooseUrl(trimmed)
  if (!url || !VIMEO_HOSTS.has(url.hostname.toLowerCase())) return null

  const segments = url.pathname.split('/').filter(Boolean)
  const index = segments.findIndex((segment) => /^\d+$/.test(segment))
  if (index === -1) return null

  const next = segments[index + 1]
  return {
    id: segments[index],
    hash: url.searchParams.get('h') ?? (next && /^[a-z0-9]+$/i.test(next) ? next : null),
  }
}

/**
 * Permissions accordées à un lecteur intégré.
 *
 * Il en existait TROIS listes différentes pour quatre iframes : la page de
 * leçon accordait `autoplay` et `fullscreen`, les trois autres non. Un même
 * lien YouTube n'offrait donc pas les mêmes commandes selon l'endroit où il
 * était placé.
 *
 * `autoplay` NE déclenche rien : il autorise le lecteur à le demander. Aucune
 * de nos URL ne passe `autoplay=1`.
 */
export const VIDEO_IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; ' +
  'picture-in-picture; web-share; fullscreen'

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
}

export function vimeoEmbedUrl(id: string, hash?: string | null): string {
  return hash
    ? `https://player.vimeo.com/video/${id}?h=${encodeURIComponent(hash)}`
    : `https://player.vimeo.com/video/${id}`
}

/**
 * Reconnaît une URL YouTube ou Vimeo collée telle quelle.
 *
 * `null` si ce n'en est pas une — l'appelant décide alors s'il s'agit d'un
 * fichier direct ou de rien du tout.
 */
export function embedUrlFromUrl(url: string): string | null {
  const yt = youtubeIdFrom(url)
  if (yt) return youtubeEmbedUrl(yt)
  const vimeo = vimeoIdFrom(url)
  if (vimeo) return vimeoEmbedUrl(vimeo.id, vimeo.hash)
  return null
}

/**
 * L'URL désigne-t-elle une plate-forme dont la PAGE refuse d'être encadrée ?
 *
 * YouTube et Vimeo posent `X-Frame-Options` sur leurs pages de visionnage :
 * seule l'adresse `/embed/` est encadrable. Quand l'identifiant n'a pas pu être
 * extrait, encadrer l'URL telle quelle donne donc un rectangle blanc, muet. Il
 * vaut mieux ne rien rendre : l'interface affiche alors son message d'absence,
 * et l'administrateur comprend qu'il doit revoir le lien.
 */
export function refusesFraming(url: string): boolean {
  const parsed = parseLooseUrl(url)
  if (!parsed) return false
  const host = parsed.hostname.toLowerCase()
  return YOUTUBE_HOSTS.has(host) || VIMEO_HOSTS.has(host)
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
    const vimeo = vimeoIdFrom(videoId)
    if (vimeo) return { kind: 'embed', url: vimeoEmbedUrl(vimeo.id, vimeo.hash) }
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

  // Une URL YouTube ou Vimeo dont l'identifiant n'a pas pu être lu : on
  // s'arrête. L'encadrer produirait un rectangle blanc (voir `refusesFraming`),
  // et c'est précisément ce qui faisait que trois formes de lien YouTube
  // courantes ne se jouaient pas.
  if (refusesFraming(url)) return null

  // Une autre URL http(s) : on l'intègre, faute de mieux — un lien Loom ou
  // Dailymotion collé tel quel fonctionne ainsi. Tout autre schème est écarté :
  // `javascript:` dans un attribut `src` s'exécuterait.
  if (/^https?:\/\//i.test(url)) return { kind: 'embed', url }

  return null
}
