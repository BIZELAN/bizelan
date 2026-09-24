/**
 * Vérifie la signature des webhooks SasPay et la normalisation des numéros.
 *
 *     node scripts/test-saspay.mjs
 *
 * Node 24 lit le TypeScript directement : le test porte sur le fichier LIVRÉ.
 */
import crypto from 'node:crypto'

process.env.SASPAY_WEBHOOK_SECRET = 'whsec_secret_de_test'
const { verifyWebhookSignature } = await import('../src/lib/saspay.ts')
// Réseaux et numéros vivent à part : ce module-là doit rester chargeable par
// le navigateur, donc sans `node:crypto`. Le build l'a imposé, et la
// séparation était de toute façon la bonne.
const { normalizePhone, isKnownNetwork } = await import('../src/lib/saspay-networks.ts')

const SECRET = process.env.SASPAY_WEBHOOK_SECRET
const BODY = JSON.stringify({
  event: 'transaction.success',
  data: { id: '9c3f2a10-4b7e-4f1a-9d2e-9b6a7c1e4a02', status: 'SUCCESS', amount: '25000.00' },
})

const now = () => Math.floor(Date.now() / 1000)
const sign = (body, ts, secret = SECRET) =>
  crypto.createHmac('sha256', secret).update(`${ts}.${body}`, 'utf8').digest('hex')

let fails = 0
const check = (label, ok, detail = '') => {
  if (!ok) fails++
  console.log(`  ${ok ? 'OK   ' : 'ECHEC'} ${label.padEnd(52)} ${detail}`)
}

/* --- Signature ---------------------------------------------------------- */
console.log('\n  SIGNATURE')
{
  const ts = String(now())
  check('signature valide', verifyWebhookSignature(BODY, sign(BODY, ts), ts).ok)

  const body2 = '{"n":"élaboré"}'
  check('corps accentué', verifyWebhookSignature(body2, sign(body2, ts), ts).ok)

  // L'horodatage fait PARTIE de la signature : le changer doit invalider.
  check(
    'horodatage modifié après signature',
    !verifyWebhookSignature(BODY, sign(BODY, ts), String(Number(ts) + 1)).ok,
  )

  check(
    'corps altéré d’un caractère',
    !verifyWebhookSignature(BODY.replace('SUCCESS', 'SUCCESs'), sign(BODY, ts), ts).ok,
  )
  check('autre secret', !verifyWebhookSignature(BODY, sign(BODY, ts, 'autre'), ts).ok)
  check('signature absente', !verifyWebhookSignature(BODY, null, ts).ok)
  check('horodatage absent', !verifyWebhookSignature(BODY, sign(BODY, ts), null).ok)
  check('horodatage illisible', !verifyWebhookSignature(BODY, sign(BODY, ts), 'hier').ok)
  check('signature tronquée', !verifyWebhookSignature(BODY, sign(BODY, ts).slice(0, 40), ts).ok)
  check(
    'majuscules tolérées',
    verifyWebhookSignature(BODY, sign(BODY, ts).toUpperCase(), ts).ok,
    'la casse hexadécimale ne doit pas rejeter',
  )
}

/* --- Fenêtre temporelle ------------------------------------------------- */
console.log('\n  FENETRE TEMPORELLE')
{
  // La documentation conseille cinq minutes, mais décrit des rejeux jusqu'à
  // deux heures. Appliquer les deux à la lettre ferait perdre l'encaissement
  // que ces rejeux existent pour rattraper.
  for (const [label, offset, expected] of [
    ['il y a 1 minute', -60, true],
    ['il y a 10 minutes', -600, true],
    ['il y a 2 heures (dernier rejeu)', -7200, true],
    ['il y a 4 heures', -14400, false],
    ['dans 10 minutes (horloge décalée)', 600, true],
    ['dans 4 heures', 14400, false],
  ]) {
    const ts = String(now() + offset)
    const got = verifyWebhookSignature(BODY, sign(BODY, ts), ts).ok
    check(label, got === expected, got ? 'acceptée' : 'refusée')
  }
}

/* --- Secret absent ------------------------------------------------------ */
console.log('\n  SECRET ABSENT')
{
  const ts = String(now())
  const signature = sign(BODY, ts)
  delete process.env.SASPAY_WEBHOOK_SECRET
  // Une route ouverte serait pire qu'une route en panne.
  check('tout est refusé', !verifyWebhookSignature(BODY, signature, ts).ok)
  process.env.SASPAY_WEBHOOK_SECRET = SECRET
}

/* --- Numéros béninois --------------------------------------------------- */
console.log('\n  NUMEROS')
for (const [input, expected] of [
  ['0197505050', '+2290197505050'],
  ['01 97 50 50 50', '+2290197505050'],
  ['+229 01 97 50 50 50', '+2290197505050'],
  ['2290197505050', '+2290197505050'],
  ['+2290197505050', '+2290197505050'],
  ['97505050', null], // huit chiffres : l'ancien format, plus valide
  ['', null],
  ['abc', null],
  ['0197505050123', null],
]) {
  const got = normalizePhone(input)
  check(`« ${input} »`, got === expected, got ?? 'refusé')
}

/* --- Réseaux ------------------------------------------------------------ */
console.log('\n  RESEAUX')
for (const [code, expected] of [
  ['mtn_bj', true],
  ['moov_bj', true],
  ['celtiis_bj', true],
  ['coris_bj', false], // inactif au référentiel
  ['orange_ci', false],
  ['', false],
]) {
  check(`« ${code} »`, isKnownNetwork(code) === expected, isKnownNetwork(code) ? 'accepté' : 'refusé')
}

console.log(fails ? `\n${fails} CAS EN ECHEC` : '\nTous les cas passent.')
process.exitCode = fails ? 1 : 0
