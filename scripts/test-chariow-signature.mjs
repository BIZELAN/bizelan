/**
 * Vérifie `verifyPulseSignature` sur des cas réels et hostiles.
 *
 *     node scripts/test-chariow-signature.mjs
 *
 * Node 24 lit le TypeScript directement : le test porte sur le fichier LIVRÉ.
 */
import crypto from 'node:crypto'

process.env.CHARIOW_PULSE_SECRET = 'whsec_secret_de_test'
const { verifyPulseSignature } = await import('../src/lib/chariow.ts')

const SECRET = process.env.CHARIOW_PULSE_SECRET
const BODY = JSON.stringify({
  event: 'successful.sale',
  sale: { id: 'SALEYQMP2I27DMJAVQP', status: 'completed' },
})

const sign = (body, secret = SECRET) =>
  'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')

const CASES = [
  ['signature valide', BODY, sign(BODY), true],
  ['corps accentué', '{"n":"élaboré"}', sign('{"n":"élaboré"}'), true],

  ['corps altéré d’un caractère', BODY.replace('completed', 'completeD'), sign(BODY), false],
  ['signé avec un autre secret', BODY, sign(BODY, 'whsec_autre'), false],
  ['en-tête absent', BODY, null, false],
  ['en-tête vide', BODY, '', false],
  ['préfixe manquant', BODY, sign(BODY).slice('sha256='.length), false],
  ['préfixe erroné', BODY, sign(BODY).replace('sha256=', 'sha1='), false],
  ['signature tronquée', BODY, sign(BODY).slice(0, 40), false],
  ['signature allongée', BODY, sign(BODY) + '00', false],
  ['hexadécimal en majuscules', BODY, sign(BODY).toUpperCase(), false],
  ['corps vide contre signature du vrai corps', '', sign(BODY), false],
]

let fails = 0
for (const [label, body, header, expected] of CASES) {
  let got
  try {
    got = verifyPulseSignature(body, header)
  } catch (error) {
    // Une exception est un échec : un en-tête hostile ne doit jamais faire
    // tomber la route, sans quoi Chariow rejouerait indéfiniment.
    console.log(`  ECHEC ${label.padEnd(44)} exception : ${error.message}`)
    fails++
    continue
  }
  const ok = got === expected
  if (!ok) fails++
  console.log(`  ${ok ? 'OK   ' : 'ECHEC'} ${label.padEnd(44)} ${got ? 'acceptée' : 'refusée'}`)
}

// Sans secret configuré, rien ne doit passer : une route ouverte serait pire
// qu'une route en panne.
delete process.env.CHARIOW_PULSE_SECRET
const sansSecret = verifyPulseSignature(BODY, sign(BODY, SECRET))
const okSansSecret = sansSecret === false
if (!okSansSecret) fails++
console.log(`  ${okSansSecret ? 'OK   ' : 'ECHEC'} ${'secret absent de l’environnement'.padEnd(44)} ${sansSecret ? 'acceptée' : 'refusée'}`)

console.log(fails ? `\n${fails} CAS EN ECHEC` : '\nTous les cas passent.')
// `process.exitCode` plutôt que `process.exit()` : sortir pendant que des
// handles se ferment déclenche une assertion libuv sous Windows, et le script
// a rapporté 127 une fois alors que tous les cas passaient. Un test qui
// signale un faux échec est pire qu'un test absent.
process.exitCode = fails ? 1 : 0
