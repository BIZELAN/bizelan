/**
 * Vérifie, contre la VRAIE base, que deux données restent hors de portée d'un
 * apprenant inscrit : les bonnes réponses des questionnaires, et son propre
 * compteur de visionnage.
 *
 *     node scripts/test-privileges.mjs
 *
 * Pourquoi ce script existe. La migration 0004 retirait ces droits colonne par
 * colonne :
 *
 *     revoke select (is_correct) on quiz_choices from authenticated;
 *
 * Ces instructions n'ont rien fait — en PostgreSQL, un privilège de TABLE
 * couvre déjà toutes ses colonnes et ne se soustrait pas ainsi. Le défaut est
 * resté invisible plusieurs semaines parce qu'il ne casse rien : il ouvre.
 * Aucun test ne pouvait le voir tant qu'aucun ne se mettait à la place d'un
 * apprenant authentifié, ce que ce script fait.
 *
 * Il crée un compte de test, l'inscrit, tente ce qui doit échouer, puis efface
 * tout. À rejouer après chaque migration touchant aux droits.
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

const stamp = Date.now()
const EMAIL = `zz-sonde-droits-${stamp}@bizelan.invalid`
const PASSWORD = `Sonde!Droits${stamp}`

let fails = 0
const check = (label, ok, detail = '') => {
  if (!ok) fails++
  console.log(`  ${ok ? 'OK   ' : 'ECHEC'} ${label.padEnd(48)} ${detail}`)
}

let userId = null
let lessonId = null

try {
  const lessons = await (
    await fetch(`${BASE}/rest/v1/lessons?select=id,course_modules(course_id)&limit=1`, {
      headers: svc,
    })
  ).json()

  if (!Array.isArray(lessons) || lessons.length === 0) {
    console.log('  Aucune leçon en base : rien à éprouver.')
    process.exit(0)
  }

  lessonId = lessons[0].id
  const courseId = lessons[0].course_modules.course_id

  /* --- Un questionnaire actif, avec une bonne réponse connue ------------- */
  await fetch(`${BASE}/rest/v1/quizzes?lesson_id=eq.${lessonId}`, { method: 'DELETE', headers: svc })
  const [quiz] = await (
    await fetch(`${BASE}/rest/v1/quizzes`, {
      method: 'POST',
      headers: svc,
      body: JSON.stringify({ lesson_id: lessonId, title: 'Sonde', is_active: true, pass_percent: 50 }),
    })
  ).json()

  const [question] = await (
    await fetch(`${BASE}/rest/v1/quiz_questions`, {
      method: 'POST',
      headers: svc,
      body: JSON.stringify({ quiz_id: quiz.id, prompt: 'Sonde ?', explanation: 'Oui.' }),
    })
  ).json()

  const choices = await (
    await fetch(`${BASE}/rest/v1/quiz_choices`, {
      method: 'POST',
      headers: svc,
      body: JSON.stringify([
        { question_id: question.id, label: 'Bonne', is_correct: true, position: 0 },
        { question_id: question.id, label: 'Mauvaise', is_correct: false, position: 1 },
      ]),
    })
  ).json()
  const goodId = choices.find((c) => c.is_correct).id
  const badId = choices.find((c) => !c.is_correct).id

  /* --- Un apprenant réellement inscrit ----------------------------------- */
  const created = await (
    await fetch(`${BASE}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
    })
  ).json()
  userId = created.id
  if (!userId) {
    console.log('  Création du compte de test impossible :', JSON.stringify(created).slice(0, 200))
    process.exit(1)
  }

  await fetch(`${BASE}/rest/v1/enrollments`, {
    method: 'POST',
    headers: svc,
    body: JSON.stringify({ user_id: userId, course_id: courseId, state: 'active', source: 'probe' }),
  })

  const session = await (
    await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
  ).json()

  if (!session.access_token) {
    console.log('  Session impossible :', JSON.stringify(session).slice(0, 200))
    process.exit(1)
  }

  const learner = {
    apikey: ANON,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  /* --- Ce qui doit rester possible --------------------------------------- */
  console.log('\n  CE QUE L’APPRENANT DOIT POUVOIR FAIRE')
  const labels = await fetch(`${BASE}/rest/v1/quiz_choices?select=id,label`, { headers: learner })
  const labelRows = await labels.json()
  check('lire les libellés des réponses', labels.ok && labelRows.length > 0, `${labelRows.length} ligne(s)`)

  const graded = await fetch(`${BASE}/rest/v1/rpc/bz_grade_quiz`, {
    method: 'POST',
    headers: learner,
    body: JSON.stringify({ p_quiz: quiz.id, p_answers: { [question.id]: [goodId] } }),
  })
  const result = await graded.json()
  check('faire corriger sa tentative', graded.ok && result?.passed === true, `score ${result?.score_percent} %`)

  const all = await (
    await fetch(`${BASE}/rest/v1/rpc/bz_grade_quiz`, {
      method: 'POST',
      headers: learner,
      body: JSON.stringify({ p_quiz: quiz.id, p_answers: { [question.id]: [goodId, badId] } }),
    })
  ).json()
  check('cocher TOUT ne fait pas gagner', all?.passed === false, `score ${all?.score_percent} %`)

  const progress = await fetch(`${BASE}/rest/v1/lesson_progress`, {
    method: 'POST',
    headers: learner,
    body: JSON.stringify({ user_id: userId, lesson_id: lessonId, course_id: courseId, completed: true }),
  })
  check('marquer une leçon terminée', progress.ok, `HTTP ${progress.status}`)

  /* --- Ce qui doit être impossible ---------------------------------------- */
  console.log('\n  CE QUI DOIT LUI ETRE REFUSE')

  const secret = await fetch(`${BASE}/rest/v1/quiz_choices?select=is_correct`, { headers: learner })
  const secretBody = await secret.text()
  check(
    'lire is_correct explicitement',
    !(secret.ok && /(true|false)/.test(secretBody)),
    secret.ok ? `HTTP 200 — ${secretBody.slice(0, 48)}` : `HTTP ${secret.status}`,
  )

  const starred = await fetch(`${BASE}/rest/v1/quiz_choices?select=*`, { headers: learner })
  const starredBody = await starred.text()
  check(
    'obtenir is_correct via select=*',
    !/is_correct/.test(starredBody),
    /is_correct/.test(starredBody) ? 'la colonne sort' : 'absente de la réponse',
  )

  const inflateUpdate = await fetch(
    `${BASE}/rest/v1/lesson_progress?user_id=eq.${userId}&lesson_id=eq.${lessonId}`,
    { method: 'PATCH', headers: learner, body: JSON.stringify({ watched_seconds: 888888 }) },
  )
  const updateBody = await inflateUpdate.text()
  check(
    'gonfler watched_seconds par UPDATE',
    !(inflateUpdate.ok && /888888/.test(updateBody)),
    inflateUpdate.ok ? `HTTP 200 — accepté` : `HTTP ${inflateUpdate.status}`,
  )

  // Sur une seconde leçon, pour éprouver aussi le chemin INSERT.
  const others = await (
    await fetch(`${BASE}/rest/v1/lessons?select=id&id=neq.${lessonId}&limit=1`, { headers: svc })
  ).json()
  if (others.length) {
    const inflateInsert = await fetch(`${BASE}/rest/v1/lesson_progress`, {
      method: 'POST',
      headers: learner,
      body: JSON.stringify({
        user_id: userId,
        lesson_id: others[0].id,
        course_id: courseId,
        watched_seconds: 999999,
      }),
    })
    const insertBody = await inflateInsert.text()
    check(
      'gonfler watched_seconds par INSERT',
      !(inflateInsert.ok && /999999/.test(insertBody)),
      inflateInsert.ok ? `HTTP 201 — accepté` : `HTTP ${inflateInsert.status}`,
    )
  }
} finally {
  if (lessonId) {
    await fetch(`${BASE}/rest/v1/quizzes?lesson_id=eq.${lessonId}`, { method: 'DELETE', headers: svc })
  }
  if (userId) {
    await fetch(`${BASE}/rest/v1/lesson_progress?user_id=eq.${userId}`, { method: 'DELETE', headers: svc })
    await fetch(`${BASE}/rest/v1/quiz_attempts?user_id=eq.${userId}`, { method: 'DELETE', headers: svc })
    await fetch(`${BASE}/rest/v1/enrollments?user_id=eq.${userId}`, { method: 'DELETE', headers: svc })
    await fetch(`${BASE}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
    })
  }
  console.log('\n  Données de test supprimées.')
}

console.log(
  fails
    ? `\n${fails} CAS EN ECHEC — la migration 0011 est-elle appliquée ?`
    : '\nLes deux protections tiennent.',
)
process.exitCode = fails ? 1 : 0
