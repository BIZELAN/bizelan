/**
 * Vérifie la résolution des vidéos et la concordance avec la base.
 *
 *     node scripts/test-video.mjs
 *
 * Deux choses sont éprouvées ici :
 *
 * 1. `resolveVideoRef` / `resolveVideoUrl` — l'aiguillage qui a remplacé quatre
 *    implémentations divergentes. Une erreur ici affiche un <iframe> vers un
 *    fichier MP4, soit un rectangle blanc, ou l'inverse.
 *
 * 2. La concordance des listes d'extensions entre `src/lib/video.ts` et
 *    `public.bz_lesson_is_measurable` dans la migration 0010. C'est la même
 *    question posée des deux côtés — « ce visionnage est-il mesurable ? » — et
 *    si les deux réponses diffèrent, le garde-fou exige un temps de visionnage
 *    que le lecteur ne produira jamais : certificat retenu, sans message.
 */
import { readFileSync } from 'node:fs'
import {
  isMeasurableVideoUrl,
  isVideoFileUrl,
  parseStorageUri,
  resolveVideoRef,
  resolveVideoUrl,
  toStorageUri,
} from '../src/lib/video.ts'

let fails = 0
const check = (label, ok, detail = '') => {
  if (!ok) fails++
  console.log(`  ${ok ? 'OK   ' : 'ECHEC'} ${label.padEnd(50)} ${detail}`)
}

/* ------------------------------------------------------------------ */
console.log('\n  URI DE STOCKAGE')

check('aller-retour', (() => {
  const u = toStorageUri('lesson-videos', '2026/abc-cours.mp4')
  const p = parseStorageUri(u)
  return p?.bucket === 'lesson-videos' && p?.path === '2026/abc-cours.mp4'
})())

for (const [value, why] of [
  ['storage://lesson-videos/../resources/secret.pdf', 'remontée de dossier'],
  ['storage:///2026/x.mp4', 'bucket vide'],
  ['storage://lesson-videos', 'chemin absent'],
  ['storage://lesson-videos/', 'chemin vide'],
  ['storage://LESSON-VIDEOS/x.mp4', 'bucket en majuscules'],
  ['storage://bucket name/x.mp4', 'espace dans le bucket'],
  ['storage://lesson-videos//etc/passwd', 'chemin absolu'],
  ['https://exemple.test/x.mp4', 'pas un URI de stockage'],
  ['', 'vide'],
  [null, 'nul'],
]) {
  check(`refuse : ${why}`, parseStorageUri(value) === null, JSON.stringify(value))
}

/* ------------------------------------------------------------------ */
console.log('\n  RESOLUTION PAR FOURNISSEUR')

const cases = [
  [{ provider: 'youtube', videoId: 'dQw4w9WgXcQ' }, 'embed', 'youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0'],
  [{ provider: 'vimeo', videoId: '76979871' }, 'embed', 'player.vimeo.com/video/76979871'],
  [{ provider: 'bunny', videoId: 'guid-1', bunnyHostname: 'vz.b-cdn.net' }, 'embed', 'vz.b-cdn.net/embed/guid-1'],
  // Le fournisseur declare l'emporte sur une ancienne `video_url` restee en
  // base : c'est le cas apres un changement de fournisseur, les deux colonnes
  // coexistant.
  [{ provider: 'youtube', videoId: 'dQw4w9WgXcQ', videoUrl: 'https://vieux.test/a.mp4' }, 'embed', 'embed/dQw4w9WgXcQ'],
  // Fournisseur declare mais identifiant absent : on retombe sur l'URL.
  [{ provider: 'youtube', videoId: null, videoUrl: 'https://exemple.test/a.mp4' }, 'file', 'exemple.test/a.mp4'],
  [{ provider: 'bunny', videoId: 'guid-1' }, null, ''], // sans nom d’hôte
  [{ provider: null, videoId: null, videoUrl: null }, null, ''],
  [{}, null, ''],
  // Ancien fournisseur `upload`, jamais present en base mais tolere.
  [{ provider: 'upload', videoId: '2026/x.mp4' }, 'storage', 'lesson-videos/2026/x.mp4'],

  // URL COMPLÈTE dans `video_id`. C'est le cas réel trouvé en base : la seule
  // leçon en ligne était ainsi, et produisait
  // `embed/https://youtu.be/…`, soit un lecteur vide.
  [{ provider: 'youtube', videoId: 'https://youtu.be/dQw4w9WgXcQ' }, 'embed', 'embed/dQw4w9WgXcQ'],
  [{ provider: 'youtube', videoId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, 'embed', 'embed/dQw4w9WgXcQ'],
  [{ provider: 'youtube', videoId: '  dQw4w9WgXcQ  ' }, 'embed', 'embed/dQw4w9WgXcQ'],
  [{ provider: 'vimeo', videoId: 'https://vimeo.com/76979871' }, 'embed', 'video/76979871'],
  // Identifiant inexploitable : on retombe sur `videoUrl` plutôt que de
  // fabriquer une adresse inventee.
  [{ provider: 'youtube', videoId: 'n’importe quoi', videoUrl: 'https://x.test/a.mp4' }, 'file', 'x.test/a.mp4'],
  [{ provider: 'youtube', videoId: 'n’importe quoi' }, null, ''],
]

for (const [ref, kind, expect] of cases) {
  const got = resolveVideoRef(ref)
  // La valeur attendue est vÉRIFIÉE, pas seulement affichée. Une première
  // version de cette boucle finissait par `|| true` : elle ne contrôlait donc
  // que le `kind`, et aurait laissé passer une URL Vimeo servie pour YouTube.
  const value = got === null ? '' : got.kind === 'storage' ? `${got.bucket}/${got.path}` : got.url
  const ok = kind === null ? got === null : got?.kind === kind && value.includes(expect)
  check(JSON.stringify(ref).slice(0, 48), ok, got ? `${got.kind} ${value.slice(0, 46)}` : 'null')
}

/* ------------------------------------------------------------------ */
console.log('\n  RESOLUTION PAR URL SEULE')

for (const [url, kind] of [
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'embed'],
  ['https://youtu.be/dQw4w9WgXcQ', 'embed'],
  ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'embed'],
  ['https://www.youtube.com/live/dQw4w9WgXcQ', 'embed'],
  ['https://vimeo.com/76979871', 'embed'],
  ['https://exemple.test/film.mp4', 'file'],
  ['https://exemple.test/film.MP4', 'file'],
  ['https://exemple.test/film.mov', 'file'],
  ['https://exemple.test/flux.m3u8?token=abc', 'file'],
  ['storage://lesson-videos/2026/x.mp4', 'storage'],
  ['https://exemple.test/page', 'embed'],
  // Tout schème autre que http(s) et storage:// est ecarte : un
  // `javascript:` dans un attribut `src` s'executerait.
  ['javascript:alert(1)', null],
  ['data:text/html,<script>alert(1)</script>', null],
  ['  ', null],
  [null, null],
]) {
  const got = resolveVideoUrl(url)
  const ok = kind === null ? got === null : got?.kind === kind
  check(`${JSON.stringify(url)?.slice(0, 48)}`, ok, got ? got.kind : 'null')
}

/* ------------------------------------------------------------------ */
console.log('\n  MESURABILITE')

for (const [url, expected, why] of [
  ['https://exemple.test/a.mp4', true, 'fichier direct'],
  ['storage://lesson-videos/2026/a.mp4', true, 'fichier déposé'],
  ['storage://lesson-videos/2026/a.mov', false, 'déposé mais non décodable'],
  ['https://exemple.test/a.mov', false, 'MOV : non décodable'],
  ['https://exemple.test/a.mkv', false, 'MKV : non décodable'],
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', false, 'iframe : rien ne remonte'],
  ['https://vimeo.com/76979871', false, 'iframe'],
  ['https://exemple.test/page', false, 'page quelconque'],
  [null, false, 'absent'],
]) {
  check(`${why}`, isMeasurableVideoUrl(url) === expected, url ?? 'null')
}

// `.mov` se JOUE (balise <video>) mais ne se MESURE pas. L'ecart est
// volontaire ; le verifier empeche qu'un « nettoyage » les reunifie.
check('.mov est jouable mais non mesurable',
  isVideoFileUrl('https://x.test/a.mov') && !isMeasurableVideoUrl('https://x.test/a.mov'))

/* ------------------------------------------------------------------ */
console.log('\n  CONCORDANCE AVEC LA BASE')

const ts = readFileSync(new URL('../src/lib/video.ts', import.meta.url), 'utf8')
const sql = readFileSync(new URL('../supabase/migrations/0010_watch_guard.sql', import.meta.url), 'utf8')

const extensions = (text, source) => {
  const found = [...text.matchAll(/\(mp4\|([a-z0-9|]+)\)/g)].map((m) => `mp4|${m[1]}`)
  if (!found.length) throw new Error(`aucune liste d'extensions trouvée dans ${source}`)
  return found
}

const tsLists = extensions(ts, 'video.ts')
const sqlLists = extensions(sql, '0010_watch_guard.sql')

// video.ts en declare deux : VIDEO_FILE (lecture) et MEASURABLE_FILE (mesure).
check('video.ts déclare deux listes', tsLists.length === 2, tsLists.join('  /  '))
// 0010 emploie la liste mesurable, deux fois : URI de stockage et URL directe.
check('0010 emploie une seule liste', new Set(sqlLists).size === 1, [...new Set(sqlLists)].join(''))

const measurable = tsLists[1]
check(
  'la liste mesurable est identique de part et d’autre',
  sqlLists.every((l) => l === measurable),
  `ts=${measurable}  sql=${sqlLists[0]}`,
)

console.log(fails ? `\n${fails} CAS EN ECHEC` : '\nTous les cas passent.')
process.exitCode = fails ? 1 : 0
