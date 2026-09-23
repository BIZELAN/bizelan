/**
 * Vérifie que la palette dérivée reste LISIBLE quelle que soit la couleur
 * choisie dans l'admin.
 *
 *     node scripts/test-theme-tokens.mjs
 *
 * C'est la garantie qui compte : un administrateur doit pouvoir choisir un
 * jaune fluo sans rendre son site illisible.
 */
import {
  contrast,
  deriveRole,
  parseHex,
  readableOnGradient,
  buildGradient,
  toHex,
} from '../src/lib/theme-tokens.ts'

const chan = (s) => {
  const [r, g, b] = s.split(' ').map(Number)
  return { r, g, b }
}

const LIGHT_BG = parseHex('#f6f8f7')
const DARK_BG = parseHex('#0a100d')

// Des cas volontairement hostiles : couleurs très claires, très sombres,
// saturées, désaturées, et les extrêmes absolus.
const COLORS = [
  ['GreenYellow (le piège d’origine)', '#ADFF2F'],
  ['jaune fluo', '#FFFF00'],
  ['cyan Oniix', '#2DCEFB'],
  ['blanc', '#FFFFFF'],
  ['noir', '#000000'],
  ['gris moyen', '#808080'],
  ['bleu profond', '#0B1F5C'],
  ['rose vif', '#FF2D95'],
  ['orange', '#FF7A00'],
  ['vert sombre', '#12301F'],
  ['pastel', '#CFE8FF'],
  ['rouge saturé', '#E00000'],
]

let fails = 0

function check(label, ratio, min) {
  const ok = ratio >= min
  if (!ok) fails++
  return `${ok ? 'OK   ' : 'ECHEC'} ${label.padEnd(38)} ${ratio.toFixed(2)}:1 (min ${min})`
}

for (const [themeName, bg] of [
  ['CLAIR', LIGHT_BG],
  ['SOMBRE', DARK_BG],
]) {
  console.log(`\n  ${themeName}`)
  for (const [label, hex] of COLORS) {
    const color = parseHex(hex)
    const role = deriveRole(color, bg)

    // Le texte dérivé doit être lisible sur le fond de page.
    console.log(
      '    ' + check(`${label} — texte sur la page`, contrast(chan(role.text), bg), 4.5),
    )
    // Le texte posé sur l'aplat doit l'être aussi.
    console.log(
      '    ' + check(`${label} — texte sur l’aplat`, contrast(chan(role.onFill), color), 4.5),
    )
    // Et le texte de la couleur doit rester lisible sur son propre voile.
    console.log(
      '    ' +
        check(`${label} — texte sur le voile`, contrast(chan(role.text), chan(role.subtle)), 4.5),
    )
  }
}

/* --- Dégradés ---------------------------------------------------------- */
console.log('\n  DEGRADES')
const GRADIENTS = [
  ['clair vers clair', '#ADFF2F', '#FFFF00'],
  ['sombre vers sombre', '#0B1F5C', '#12301F'],
  ['clair vers sombre', '#FFFF00', '#0B1F5C'],
  ['cyan vers emeraude', '#2DCEFB', '#28C378'],
]
for (const [label, from, to] of GRADIENTS) {
  const input = { from, to, angle: 135 }
  const css = buildGradient(input)
  if (!css) {
    console.log(`    ECHEC ${label} — dégradé non construit`)
    fails++
    continue
  }
  const text = readableOnGradient(input)
  // Un dégradé du jaune au bleu nuit n'admet AUCUN texte lisible sur toute sa
  // longueur : ce n'est pas un défaut du code, c'est une combinaison que
  // l'administration doit être empêchée d'employer pour porter du texte.
  const impossible = label === 'clair vers sombre'
  const ok = impossible ? text.worst < 4.5 : text.worst >= 4.5
  if (!ok) fails++
  console.log(
    `    ${ok ? 'OK   ' : 'ECHEC'} ${label.padEnd(38)} ${text.worst.toFixed(2)}:1` +
      (impossible ? '  (signalé comme impropre au texte — attendu)' : ''),
  )
}

/* --- Entrées invalides -------------------------------------------------- */
console.log('\n  ENTREES INVALIDES')
const BAD = ['', '#12', 'rouge', '#GGGGGG', '#1234567', 'javascript:alert(1)']
for (const value of BAD) {
  const ok = parseHex(value) === null
  if (!ok) fails++
  console.log(`    ${ok ? 'OK   ' : 'ECHEC'} refusée : ${JSON.stringify(value)}`)
}
// Forme courte et casse indifférente.
for (const [value, expected] of [
  ['#abc', '#aabbcc'],
  ['ABC', '#aabbcc'],
  ['#AABBCC', '#aabbcc'],
]) {
  const got = parseHex(value)
  const ok = got !== null && toHex(got) === expected
  if (!ok) fails++
  console.log(`    ${ok ? 'OK   ' : 'ECHEC'} ${JSON.stringify(value)} -> ${got ? toHex(got) : 'null'}`)
}

console.log(fails ? `\n${fails} CAS EN ECHEC` : '\nTous les cas passent.')
process.exitCode = fails ? 1 : 0
