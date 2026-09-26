/**
 * Vérifie l'assainissement du chemin de dépôt et le classement des documents.
 *
 *     node scripts/test-uploads.mjs
 *
 * Le nom de fichier vient du navigateur : il est choisi par l'utilisateur, et
 * un `../` y suffirait à écrire hors du dossier prévu — voire à écraser le
 * fichier d'un autre client. C'est la raison d'être de ce test.
 */
import { documentKind, isReadableInline, storagePathFor } from '../src/lib/uploads.ts'

const BACKSLASH = String.fromCharCode(92)

let fails = 0
const check = (label, ok, detail = '') => {
  if (!ok) fails++
  console.log(`  ${ok ? 'OK   ' : 'ECHEC'} ${label.padEnd(44)} ${detail}`)
}

console.log('\n  CHEMIN DE DEPOT')
for (const name of [
  '../../etc/passwd.pdf',
  `..${BACKSLASH}..${BACKSLASH}windows${BACKSLASH}system32.mp4`,
  'dossier/sous-dossier/fichier.docx',
  'rapport final (v2).xlsx',
  'fichier<>:"|?*.pdf',
  '.htaccess',
  'sans-extension',
  'a'.repeat(300) + '.xlsx',
  'Été 2026 — bilan.pdf',
  '%2e%2e%2fpasswd.pdf',
]) {
  const path = storagePathFor(name)
  const safe =
    !path.includes('..') &&
    !path.includes(BACKSLASH) &&
    // Une seule barre : celle qui sépare l'année du nom de fichier.
    path.split('/').length === 2 &&
    /^\d{4}\/[a-z0-9][a-z0-9.-]*$/.test(path) &&
    path.length < 120
  check(JSON.stringify(name).slice(0, 42), safe, path)
}

console.log('\n  UNICITE')
const first = storagePathFor('doublon.pdf')
// Deux dépôts du même nom ne doivent pas se recouvrir. L'horodatage est en
// millisecondes : on force un écart plutôt que de parier sur la vitesse.
await new Promise((r) => setTimeout(r, 5))
const second = storagePathFor('doublon.pdf')
check('deux dépôts espacés ne se recouvrent pas', first !== second, `${first} != ${second}`)
check('le nom d’origine reste lisible', first.includes('doublon'), first)

console.log('\n  NATURE DU DOCUMENT')
for (const [mime, name, expected] of [
  ['application/pdf', 'x.pdf', 'pdf'],
  [null, 'rapport.pdf', 'pdf'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'x', 'word'],
  ['application/octet-stream', 'contrat.docx', 'word'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'x', 'excel'],
  [null, 'budget.xlsx', 'excel'],
  ['text/csv', 'x.csv', 'excel'],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'x', 'slides'],
  [null, 'soutenance.pptx', 'slides'],
  ['application/zip', 'x.zip', 'archive'],
  [null, 'inconnu.xyz', 'other'],
  [null, null, 'other'],
]) {
  const got = documentKind(mime, name)
  check(`${(mime ?? 'sans type').slice(-28)} / ${name ?? 'sans nom'}`, got === expected, got)
}

console.log('\n  LECTURE DANS LA PAGE')
check('le PDF se lit dans la page', isReadableInline('pdf'))
// Word, Excel et PowerPoint ne se rendent pas nativement dans un navigateur.
// Les annoncer lisibles afficherait un cadre vide à l'apprenant.
for (const kind of ['word', 'excel', 'slides', 'archive', 'other']) {
  check(`${kind} se télécharge, ne s’affiche pas`, !isReadableInline(kind))
}

console.log(fails ? `\n${fails} CAS EN ECHEC` : '\nTous les cas passent.')
process.exitCode = fails ? 1 : 0
