/**
 * Vérifie la résolution des noms d'icônes et la recherche.
 *
 *     node scripts/test-icons.mjs
 *
 * L'enjeu est la COMPATIBILITÉ : le champ était un texte libre, et la base
 * contient des noms saisis à la main — `clock`, `play-circle`, `Star`. Une
 * icône qui disparaît d'une page en production parce que la bibliothèque est
 * devenue plus stricte serait un dégât gratuit.
 */
import {
  BLOCK_TYPE_ICONS,
  ICON_GROUPS,
  ICON_LIST,
  blockTypeIcon,
  resolveIcon,
  searchIcons,
} from '../src/lib/icons.ts'

let fails = 0
const check = (label, ok, detail = '') => {
  if (!ok) fails++
  console.log(`  ${ok ? 'OK   ' : 'ECHEC'} ${label.padEnd(50)} ${detail}`)
}

/* --- Formes héritées ---------------------------------------------------- */
console.log('\n  NOMS HERITES (champ texte libre)')
for (const [input, expected] of [
  ['Clock', true],
  ['clock', true],
  ['play-circle', true],
  ['PlayCircle', true],
  ['graduation_cap', true],
  ['file text', true],
  ['STAR', true],
  ['  briefcase  ', true],
]) {
  const got = resolveIcon(input) !== null
  check(`« ${input} »`, got === expected, got ? 'résolue' : 'inconnue')
}

console.log('\n  NOMS QUI DOIVENT ECHOUER')
for (const input of ['', null, undefined, 'nimportequoi', 'Rocket2', '<script>']) {
  check(`${JSON.stringify(input)}`, resolveIcon(input) === null, 'refusée')
}

/* --- Intégrité de la bibliothèque --------------------------------------- */
console.log('\n  BIBLIOTHEQUE')
check('au moins 80 icônes proposées', ICON_LIST.length >= 80, `${ICON_LIST.length} entrées`)

const names = ICON_LIST.map((e) => e.name)
check('aucun doublon', new Set(names).size === names.length, `${new Set(names).size} uniques`)

check(
  'chaque entrée porte un composant',
  ICON_LIST.every((e) => typeof e.Icon === 'function' || typeof e.Icon === 'object'),
)
check(
  'chaque entrée porte un libellé et des mots-clés',
  ICON_LIST.every((e) => e.label.length > 1 && e.keywords.length > 3),
)
check(
  'chaque nom se résout',
  names.every((n) => resolveIcon(n) !== null),
)
check('tous les groupes sont peuplés', ICON_GROUPS.every((g) => g.icons.length > 0))

/* --- Recherche ---------------------------------------------------------- */
console.log('\n  RECHERCHE (en français, accents indifférents)')
for (const [query, expectName] of [
  ['argent', 'Coins'],
  ['formation', 'GraduationCap'],
  ['contact', 'Phone'],
  ['securite', 'ShieldCheck'],
  ['sécurité', 'ShieldCheck'],
  ['AGRICULTURE', 'Sprout'],
  ['certificat', 'Award'],
]) {
  const found = searchIcons(query).some((e) => e.name === expectName)
  check(`« ${query} » propose ${expectName}`, found, `${searchIcons(query).length} résultat(s)`)
}
check('une recherche vide rend tout', searchIcons('').length === ICON_LIST.length)
check('une recherche absurde rend rien', searchIcons('zzzzqqq').length === 0)

/* --- Icônes de types de blocs ------------------------------------------- */
console.log('\n  TYPES DE BLOCS')
check('22 types couverts', Object.keys(BLOCK_TYPE_ICONS).length === 22, `${Object.keys(BLOCK_TYPE_ICONS).length}`)
check('un type inconnu a un repli', blockTypeIcon('nimporte') !== null && blockTypeIcon(undefined) !== null)

console.log(fails ? `\n${fails} CAS EN ECHEC` : '\nTous les cas passent.')
process.exitCode = fails ? 1 : 0
