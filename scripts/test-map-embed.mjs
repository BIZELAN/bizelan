// Vérifie `safeMapEmbedSrc` sur les formes que Google produit réellement,
// et sur ce qu'il doit refuser. Exécuté avec la version transpilée à la volée.
// Node 24 lit le TypeScript directement : on teste donc le fichier LIVRÉ,
// pas une copie compilée ni une réécriture approximative de la source.
//
//     node scripts/test-map-embed.mjs
import { safeMapEmbedSrc } from '../src/lib/map-embed.ts'

const PB = '!1m18!1m12!1m3!1d3963.5!2d2.42!3d6.36!2m3!1f0!2f0!3f0'

const CASES = [
  // [libellé, entrée, doit être accepté]
  ['snippet complet copié depuis Google',
   `<iframe src="https://www.google.com/maps/embed?pb=${PB}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`,
   true],
  ['snippet avec attributs avant src',
   `<iframe width="600" src="https://www.google.com/maps/embed?pb=${PB}"></iframe>`,
   true],
  ['snippet en guillemets simples',
   `<iframe src='https://www.google.com/maps/embed?pb=${PB}'></iframe>`,
   true],
  ['URL nue /maps/embed',
   `https://www.google.com/maps/embed?pb=${PB}`,
   true],
  ['forme ancienne output=embed',
   'https://maps.google.com/maps?q=Cotonou&output=embed',
   true],
  ['espaces autour',
   `   https://www.google.com/maps/embed?pb=${PB}   `,
   true],

  ['vide', '', false],
  ['non renseigné', null, false],
  ['lien de partage court (PAS une intégration)',
   'https://maps.app.goo.gl/abc123', false],
  ['page Maps normale, pas une intégration',
   'https://www.google.com/maps/place/Cotonou', false],
  ['autre domaine qui imite le chemin',
   'https://evil.example.com/maps/embed?pb=x', false],
  ['sous-domaine trompeur',
   'https://www.google.com.evil.test/maps/embed?pb=x', false],
  ['http en clair', `http://www.google.com/maps/embed?pb=${PB}`, false],
  ['javascript:', 'javascript:alert(1)', false],
  ['iframe vers un autre site', '<iframe src="https://evil.test/x"></iframe>', false],
  ['texte libre', 'voir la carte sur google', false],
]

let fails = 0
for (const [label, input, shouldPass] of CASES) {
  const out = safeMapEmbedSrc(input)
  const ok = shouldPass ? out !== null : out === null
  if (!ok) fails++
  const verdict = ok ? 'OK   ' : 'ECHEC'
  const shown = out === null ? 'refusé' : out.slice(0, 52) + (out.length > 52 ? '…' : '')
  console.log(`  ${verdict} ${label.padEnd(44)} ${shown}`)
}

console.log(fails ? `\n${fails} CAS EN ECHEC` : '\nTous les cas passent.')
process.exit(fails ? 1 : 0)
