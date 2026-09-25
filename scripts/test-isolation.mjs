/**
 * Éprouve l'isolation entre clients, avec DEUX comptes réels.
 *
 *     node scripts/test-isolation.mjs
 *
 * Les politiques RLS ont toutes été écrites en supposant leur effet. Un test
 * anonyme ne prouve presque rien : le visiteur anonyme est bloqué partout, et
 * c'est le cas facile. Ce qui compte, c'est ce qu'un client CONNECTÉ peut
 * atteindre — chez lui, et surtout chez les autres.
 *
 * Deux comptes sont créés : A, inscrit à une formation, et B, qui ne l'est
 * pas. On vérifie que chacun voit le sien et rien du voisin, qu'aucun ne peut
 * s'offrir un accès, se déclarer reçu, ni se promouvoir. Tout est effacé
 * ensuite.
 */
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC = env.SUPABASE_SERVICE_ROLE_KEY

if (!BASE || !ANON || !SVC) {
  console.log('  Variables Supabase absentes de .env — test impossible.')
  process.exit(0)
}

const svc = {
  apikey: SVC,
  Authorization: `Bearer ${SVC}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

let fails = 0
const check = (label, ok, detail = '') => {
  if (!ok) fails++
  console.log(`  ${ok ? 'OK   ' : 'ECHEC'} ${label.padEnd(50)} ${detail}`)
}

const stamp = Date.now()
const STORAGE_PATH = `sonde/${stamp}-fichier-de-test.txt`
const people = []

async function makeUser(tag) {
  const email = `zz-sonde-${tag}-${stamp}@bizelan.invalid`
  const password = `Sonde!${tag}${stamp}`
  const created = await (
    await fetch(`${BASE}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, email_confirm: true }),
    })
  ).json()
  if (!created.id) throw new Error(`création impossible : ${JSON.stringify(created).slice(0, 160)}`)

  const session = await (
    await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  ).json()
  if (!session.access_token) throw new Error('session impossible')

  const person = {
    id: created.id,
    email,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  }
  people.push(person)
  return person
}

/** Vrai si la requête a renvoyé au moins une ligne. */
async function rows(headers, path) {
  const response = await fetch(`${BASE}/rest/v1/${path}`, { headers })
  if (!response.ok) return { ok: false, count: 0, status: response.status }
  const body = await response.json().catch(() => null)
  return { ok: true, count: Array.isArray(body) ? body.length : 0, status: response.status }
}

let courseId = null
let orderId = null
let resourceId = null

try {
  const courses = await (
    await fetch(`${BASE}/rest/v1/courses?select=id,slug&limit=1`, { headers: svc })
  ).json()
  if (!courses.length) {
    console.log('  Aucune formation en base : rien à éprouver.')
    process.exit(0)
  }
  courseId = courses[0].id

  const a = await makeUser('a')
  const b = await makeUser('b')

  // A est inscrit et a une commande. B n'a rien.
  await fetch(`${BASE}/rest/v1/enrollments`, {
    method: 'POST',
    headers: svc,
    body: JSON.stringify({ user_id: a.id, course_id: courseId, state: 'active', source: 'probe' }),
  })
  const [order] = await (
    await fetch(`${BASE}/rest/v1/orders`, {
      method: 'POST',
      headers: svc,
      body: JSON.stringify({
        user_id: a.id,
        customer_name: 'Sonde A',
        customer_email: a.email,
        total_cents: 25000,
        status: 'paid',
      }),
    })
  ).json()
  orderId = order?.id ?? null

  /* --- Chacun chez soi --------------------------------------------------- */
  console.log('\n  CHACUN VOIT LE SIEN')
  check('A voit sa commande', (await rows(a.headers, 'orders?select=id')).count === 1)
  check('A voit son inscription', (await rows(a.headers, 'enrollments?select=id')).count === 1)
  check('A voit son profil', (await rows(a.headers, 'bz_profiles?select=id')).count >= 1)

  /* --- Et rien du voisin -------------------------------------------------- */
  console.log('\n  ET RIEN DU VOISIN')
  const bOrders = await rows(b.headers, 'orders?select=id')
  check('B ne voit aucune commande', bOrders.count === 0, `${bOrders.count} ligne(s)`)

  const bOrderA = await rows(b.headers, `orders?select=id&id=eq.${orderId}`)
  check('B ne voit pas la commande de A, même ciblée', bOrderA.count === 0, `${bOrderA.count}`)

  const bEnrol = await rows(b.headers, 'enrollments?select=id')
  check('B ne voit aucune inscription', bEnrol.count === 0, `${bEnrol.count} ligne(s)`)

  const bProfiles = await rows(b.headers, 'bz_profiles?select=id,email')
  check('B ne voit que son propre profil', bProfiles.count <= 1, `${bProfiles.count} profil(s)`)

  const bProgress = await rows(b.headers, 'lesson_progress?select=id')
  check('B ne voit aucune progression', bProgress.count === 0, `${bProgress.count}`)

  const bAttempts = await rows(b.headers, 'quiz_attempts?select=id')
  check('B ne voit aucune tentative', bAttempts.count === 0, `${bAttempts.count}`)

  /* --- Ce qu'on ne doit pas pouvoir s'offrir ------------------------------ */
  console.log('\n  CE QU’ON NE PEUT PAS S’OFFRIR')

  const selfEnrol = await fetch(`${BASE}/rest/v1/enrollments`, {
    method: 'POST',
    headers: b.headers,
    body: JSON.stringify({ user_id: b.id, course_id: courseId, state: 'active', source: 'triche' }),
  })
  check('B ne peut pas s’inscrire lui-même', !selfEnrol.ok, `HTTP ${selfEnrol.status}`)

  const fakeAttempt = await fetch(`${BASE}/rest/v1/quiz_attempts`, {
    method: 'POST',
    headers: b.headers,
    body: JSON.stringify({
      user_id: b.id,
      quiz_id: '00000000-0000-0000-0000-000000000000',
      course_id: courseId,
      score_percent: 100,
      passed: true,
    }),
  })
  check('B ne peut pas se déclarer reçu', !fakeAttempt.ok, `HTTP ${fakeAttempt.status}`)

  const promote = await fetch(`${BASE}/rest/v1/bz_profiles?id=eq.${b.id}`, {
    method: 'PATCH',
    headers: b.headers,
    body: JSON.stringify({ role: 'admin' }),
  })
  const promoteBody = await promote.text()
  // Le déclencheur `bz_guard_profile_role` peut accepter la requête et rétablir
  // le rôle en silence : c'est le rôle EFFECTIF qui compte.
  const after = await (
    await fetch(`${BASE}/rest/v1/bz_profiles?select=role&id=eq.${b.id}`, { headers: svc })
  ).json()
  check(
    'B ne peut pas se promouvoir administrateur',
    after[0]?.role !== 'admin',
    `rôle effectif : ${after[0]?.role ?? '?'}`,
  )

  const coupons = await rows(b.headers, 'coupons?select=code,discount_value')
  check('B ne peut pas lire les codes promo', coupons.count === 0, `${coupons.count} code(s)`)

  const settings = await fetch(`${BASE}/rest/v1/site_settings?id=eq.1`, {
    method: 'PATCH',
    headers: b.headers,
    body: JSON.stringify({ site_name: 'Piraté' }),
  })
  const settingsAfter = await (
    await fetch(`${BASE}/rest/v1/site_settings?select=site_name&id=eq.1`, { headers: svc })
  ).json()
  check(
    'B ne peut pas modifier les réglages du site',
    settingsAfter[0]?.site_name !== 'Piraté',
    `nom : ${settingsAfter[0]?.site_name}`,
  )

  const publishCourse = await fetch(`${BASE}/rest/v1/courses?id=eq.${courseId}`, {
    method: 'PATCH',
    headers: b.headers,
    body: JSON.stringify({ price_cents: 0 }),
  })
  const priceAfter = await (
    await fetch(`${BASE}/rest/v1/courses?select=price_cents&id=eq.${courseId}`, { headers: svc })
  ).json()
  check(
    'B ne peut pas rendre une formation gratuite',
    priceAfter[0]?.price_cents !== 0 || !publishCourse.ok,
    `prix : ${priceAfter[0]?.price_cents}`,
  )

  const revisions = await rows(b.headers, 'bz_revisions?select=id')
  check('B ne peut pas lire l’historique', revisions.count === 0, `${revisions.count}`)

  /* --- Ressources téléchargeables ----------------------------------------- */
  console.log('\n  SUPPORTS DE COURS')
  // Un support est créé pour l'occasion : sans lui, « B n'en voit aucun »
  // serait vrai parce qu'il n'y en a aucun, ce qui ne prouve rien.
  const [resource] = await (
    await fetch(`${BASE}/rest/v1/resources`, {
      method: 'POST',
      headers: svc,
      body: JSON.stringify({
        course_id: courseId,
        title: 'Sonde — support de test',
        storage_path: STORAGE_PATH,
        position: 999,
      }),
    })
  ).json()
  resourceId = resource?.id ?? null

  const aRes = await rows(a.headers, `resources?select=id&course_id=eq.${courseId}`)
  const bRes = await rows(b.headers, `resources?select=id&course_id=eq.${courseId}`)
  check('A, inscrit, voit le support', aRes.count >= 1, `${aRes.count} support(s)`)
  check('B, non inscrit, ne le voit pas', bRes.count === 0, `${bRes.count} support(s)`)

  /* --- Le fichier lui-même ------------------------------------------------ */
  // Le bucket `resources` est privé : le téléchargement passe par une route
  // serveur qui vérifie l'inscription puis signe une URL de courte durée.
  // Personne, pas même un inscrit, ne doit court-circuiter ce chemin.
  console.log('\n  STOCKAGE PRIVE')

  // Le fichier est RÉELLEMENT déposé avant d'éprouver l'accès. Sans lui, un
  // refus « introuvable » se confondrait avec un refus « interdit », et les
  // quatre contrôles suivants passeraient pour la mauvaise raison.
  const upload = await fetch(`${BASE}/storage/v1/object/resources/${STORAGE_PATH}`, {
    method: 'POST',
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      'Content-Type': 'text/plain',
      'x-upsert': 'true',
    },
    body: 'contenu de sonde',
  })
  const readable = await fetch(`${BASE}/storage/v1/object/resources/${STORAGE_PATH}`, {
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  })
  check(
    'le fichier existe bel et bien (lu par la clé de service)',
    upload.ok && readable.ok,
    `dépôt ${upload.status}, lecture ${readable.status}`,
  )
  for (const [who, person] of [
    ['A (inscrit)', a],
    ['B (non inscrit)', b],
  ]) {
    const direct = await fetch(`${BASE}/storage/v1/object/resources/${STORAGE_PATH}`, {
      headers: { apikey: ANON, Authorization: person.headers.Authorization },
    })
    check(`${who} ne télécharge pas en direct`, !direct.ok, `HTTP ${direct.status}`)

    const signed = await fetch(
      `${BASE}/storage/v1/object/sign/resources/${STORAGE_PATH}`,
      {
        method: 'POST',
        headers: {
          apikey: ANON,
          Authorization: person.headers.Authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 60 }),
      },
    )
    check(`${who} ne signe pas d’URL lui-même`, !signed.ok, `HTTP ${signed.status}`)
  }
} catch (error) {
  console.log('  Erreur pendant la sonde :', error.message)
  fails++
} finally {
  if (resourceId) {
    await fetch(`${BASE}/rest/v1/resources?id=eq.${resourceId}`, { method: 'DELETE', headers: svc })
  }
  await fetch(`${BASE}/storage/v1/object/resources/${STORAGE_PATH}`, {
    method: 'DELETE',
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  })
  for (const person of people) {
    await fetch(`${BASE}/rest/v1/orders?user_id=eq.${person.id}`, { method: 'DELETE', headers: svc })
    await fetch(`${BASE}/rest/v1/enrollments?user_id=eq.${person.id}`, { method: 'DELETE', headers: svc })
    await fetch(`${BASE}/rest/v1/lesson_progress?user_id=eq.${person.id}`, { method: 'DELETE', headers: svc })
    await fetch(`${BASE}/rest/v1/quiz_attempts?user_id=eq.${person.id}`, { method: 'DELETE', headers: svc })
    await fetch(`${BASE}/auth/v1/admin/users/${person.id}`, {
      method: 'DELETE',
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
    })
  }
  console.log('\n  Comptes de test supprimés.')
}

console.log(fails ? `\n${fails} CAS EN ECHEC` : '\nL’isolation tient.')
process.exitCode = fails ? 1 : 0
