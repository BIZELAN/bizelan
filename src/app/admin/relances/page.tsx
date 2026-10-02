import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageSquareHeart, ShoppingCart, UserRoundX } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSiteUrl } from '@/lib/site-url'
import { PageHeader, StatCard } from '@/components/admin/shell'
import { FollowUpActions } from '@/components/admin/followup-actions'
import { ORDER_STATUS_LABELS, StatusBadge } from '@/components/ui/badge'
import { EmptyState, ProgressBar } from '@/components/ui/misc'
import { formatDate, formatDateTime, formatPrice, whatsappLink } from '@/lib/utils'

export const metadata: Metadata = { title: 'Relances' }
export const dynamic = 'force-dynamic'

const DAY = 86400000
/** Au-delà, une commande abandonnée n'est plus une relance mais une prospection. */
const ORDER_WINDOW_DAYS = 45
/** Sans activité depuis ce délai, un apprenant est considéré comme décroché. */
const INACTIVE_DAYS = 14

function firstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] ?? ''
}

function mailto(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function ago(date: string | null) {
  if (!date) return '—'
  const days = Math.floor((Date.now() - new Date(date).getTime()) / DAY)
  if (days <= 0) return 'aujourd’hui'
  if (days === 1) return 'hier'
  return `il y a ${days} jours`
}

/**
 * Relances : le chiffre d'affaires qui dort.
 *
 * Trois listes, chacune avec un message prêt à envoyer :
 *  · les paiements commencés et jamais aboutis ;
 *  · les apprenants qui ont décroché ;
 *  · ceux qui ont (presque) fini et à qui on n'a pas demandé d'avis.
 */
export default async function FollowUpsPage() {
  const supabase = createAdminClient()
  const base = await getSiteUrl()
  const now = Date.now()

  /* ---------- Commandes abandonnées --------------------------------------- */
  const { data: openOrders } = await supabase
    .from('orders')
    .select(
      'id, reference, user_id, customer_name, customer_email, customer_phone, total_cents, currency, status, created_at, items:order_items(title_snapshot, course_id, product_id, item_type)',
    )
    .in('status', ['pending', 'failed', 'awaiting_payment'])
    .gte('created_at', new Date(now - ORDER_WINDOW_DAYS * DAY).toISOString())
    // Une commande de moins de trente minutes est peut-être encore en cours
    // de validation sur le téléphone : on ne relance pas quelqu'un qui paie.
    .lte('created_at', new Date(now - 30 * 60000).toISOString())
    .order('created_at', { ascending: false })
    .limit(300)

  type OpenOrder = {
    id: string
    reference: string
    user_id: string | null
    customer_name: string
    customer_email: string
    customer_phone: string | null
    total_cents: number
    currency: string
    status: string
    created_at: string
    items: { title_snapshot: string; course_id: string | null; product_id: string | null; item_type: string }[]
  }
  const orders = (openOrders ?? []) as OpenOrder[]
  const buyerIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))] as string[]

  const [{ data: ownedCourses }, { data: ownedProducts }] = await Promise.all([
    buyerIds.length
      ? supabase
          .from('enrollments')
          .select('user_id, course_id')
          .in('user_id', buyerIds)
          .in('state', ['active', 'completed'])
      : Promise.resolve({ data: [] as { user_id: string; course_id: string }[] }),
    buyerIds.length
      ? supabase
          .from('product_purchases')
          .select('user_id, product_id')
          .in('user_id', buyerIds)
          .eq('state', 'active')
      : Promise.resolve({ data: [] as { user_id: string; product_id: string }[] }),
  ])
  const owns = new Set([
    ...(ownedCourses ?? []).map((e) => `${e.user_id}:c:${e.course_id}`),
    ...(ownedProducts ?? []).map((p) => `${p.user_id}:p:${p.product_id}`),
  ])

  // Une personne qui a réessayé et payé depuis n'est pas à relancer ; et
  // trois tentatives échouées sur la même offre ne font qu'UNE relance.
  const seen = new Set<string>()
  const abandoned = orders.filter((order) => {
    const item = order.items?.[0]
    if (!item) return false
    const itemKey = item.course_id ? `c:${item.course_id}` : `p:${item.product_id}`
    if (order.user_id && owns.has(`${order.user_id}:${itemKey}`)) return false
    const key = `${order.user_id ?? order.customer_email}:${itemKey}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  /* ---------- Apprenants inactifs et demandes d'avis ---------------------- */
  const { data: enrollmentRows } = await supabase
    .from('enrollments')
    .select(
      'id, user_id, course_id, progress_percent, state, created_at, profile:bz_profiles(full_name, email, phone), course:courses(title, slug)',
    )
    .in('state', ['active', 'completed'])
    .order('created_at', { ascending: false })
    .limit(500)

  type EnrollmentRow = {
    id: string
    user_id: string
    course_id: string
    progress_percent: number
    state: string
    created_at: string
    profile: { full_name: string | null; email: string; phone: string | null } | null
    course: { title: string; slug: string } | null
  }
  const enrollments = ((enrollmentRows ?? []) as unknown as EnrollmentRow[]).filter(
    (e) => e.profile && e.course,
  )
  const learnerIds = [...new Set(enrollments.map((e) => e.user_id))]

  const [{ data: progressRows }, { data: reviewRows }, { data: followups }] = await Promise.all([
    learnerIds.length
      ? supabase
          .from('lesson_progress')
          .select('user_id, course_id, updated_at')
          .in('user_id', learnerIds)
      : Promise.resolve({ data: [] as { user_id: string; course_id: string; updated_at: string }[] }),
    learnerIds.length
      ? supabase.from('reviews').select('user_id, course_id').in('user_id', learnerIds)
      : Promise.resolve({ data: [] as { user_id: string; course_id: string }[] }),
    supabase
      .from('activity_log')
      .select('action, entity_id, created_at')
      .like('action', 'followup.%')
      .gte('created_at', new Date(now - 60 * DAY).toISOString())
      .order('created_at', { ascending: false }),
  ])

  const lastActivity = new Map<string, string>()
  for (const p of progressRows ?? []) {
    const key = `${p.user_id}:${p.course_id}`
    const current = lastActivity.get(key)
    if (!current || String(p.updated_at) > current) lastActivity.set(key, String(p.updated_at))
  }
  const reviewed = new Set((reviewRows ?? []).map((r) => `${r.user_id}:${r.course_id}`))
  const followedUp = new Map<string, string>()
  for (const f of followups ?? []) {
    const key = `${f.action}:${f.entity_id}`
    if (!followedUp.has(key)) followedUp.set(key, f.created_at as string)
  }

  const inactive = enrollments
    .filter((e) => e.state === 'active' && e.progress_percent < 100)
    .map((e) => ({ ...e, last: lastActivity.get(`${e.user_id}:${e.course_id}`) ?? e.created_at }))
    .filter((e) => now - new Date(e.last).getTime() > INACTIVE_DAYS * DAY)
    .sort((a, b) => a.last.localeCompare(b.last))
    .slice(0, 100)

  const reviewAsks = enrollments
    .filter((e) => e.progress_percent >= 80 && !reviewed.has(`${e.user_id}:${e.course_id}`))
    .slice(0, 100)

  const pendingValue = abandoned.reduce((sum, o) => sum + o.total_cents, 0)

  return (
    <>
      <PageHeader
        title="Relances"
        description="Les ventes et les apprenants qui méritent un message. Chaque relance part de votre WhatsApp ou de votre messagerie, avec un texte déjà rédigé."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Paiements non aboutis"
          value={abandoned.length}
          hint={`${formatPrice(pendingValue || null)} à récupérer`}
          icon={ShoppingCart}
          tone="brand"
        />
        <StatCard
          label="Apprenants décrochés"
          value={inactive.length}
          hint={`sans activité depuis ${INACTIVE_DAYS} jours`}
          icon={UserRoundX}
        />
        <StatCard
          label="Avis à demander"
          value={reviewAsks.length}
          hint="parcours terminé à 80 % ou plus"
          icon={MessageSquareHeart}
          tone="accent"
        />
      </div>

      {/* ---------- Paiements ---------------------------------------------- */}
      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold">Paiements non aboutis</h2>
        <p className="mb-4 text-sm text-fg-muted">
          Commandes des {ORDER_WINDOW_DAYS} derniers jours, jamais payées, pour une offre que la
          personne ne possède toujours pas.
        </p>
        {abandoned.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Rien à relancer" description="Tous les paiements récents ont abouti." />
        ) : (
          <ul className="space-y-3">
            {abandoned.map((order) => {
              const title = order.items?.[0]?.title_snapshot ?? 'votre commande'
              const isProduct = order.items?.[0]?.item_type === 'product'
              const message =
                order.status === 'awaiting_payment'
                  ? `Bonjour ${firstName(order.customer_name)}, nous avons bien reçu votre commande « ${title} » (${formatPrice(order.total_cents, order.currency)}). Avez-vous pu effectuer le dépôt ? Envoyez-nous la preuve ici et votre accès est ouvert dans la foulée.`
                  : `Bonjour ${firstName(order.customer_name)}, votre paiement pour « ${title} » n’a pas abouti. Souhaitez-vous que nous vous aidions à finaliser ? Vous pouvez aussi réessayer ici : ${base}/${isProduct ? 'boutique' : 'formations'}`
              return (
                <li
                  key={order.id}
                  className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 lg:flex-row lg:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-fg">{order.customer_name}</span>
                      <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                    </p>
                    <p className="mt-0.5 text-sm text-fg-muted">
                      {title} · <strong className="text-fg">{formatPrice(order.total_cents, order.currency)}</strong>
                    </p>
                    <p className="mt-0.5 text-xs text-fg-subtle">
                      <Link href={`/admin/commandes/${order.id}`} className="font-mono hover:text-primary-text">
                        {order.reference}
                      </Link>{' '}
                      · {formatDateTime(order.created_at)} ({ago(order.created_at)})
                      {!order.customer_phone && ' · pas de téléphone'}
                    </p>
                  </div>
                  <FollowUpActions
                    kind="order"
                    entityId={order.id}
                    whatsappHref={whatsappLink(order.customer_phone, message)}
                    mailHref={mailto(order.customer_email, `Votre commande ${order.reference}`, message)}
                    followedUpAt={followedUp.get(`followup.order:${order.id}`) ?? null}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ---------- Apprenants inactifs --------------------------------------- */}
      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold">Apprenants décrochés</h2>
        <p className="mb-4 text-sm text-fg-muted">
          Inscrits qui n’ont ouvert aucune leçon depuis {INACTIVE_DAYS} jours. Un message
          d’encouragement suffit souvent à relancer un parcours — et un apprenant qui termine est
          celui qui recommande.
        </p>
        {inactive.length === 0 ? (
          <EmptyState icon={UserRoundX} title="Personne n’a décroché" description="Tous vos apprenants sont actifs." />
        ) : (
          <ul className="space-y-3">
            {inactive.map((e) => {
              const message = `Bonjour ${firstName(e.profile!.full_name)}, comment avance votre formation « ${e.course!.title} » ? Vous en êtes à ${e.progress_percent} %. Reprenez là où vous vous êtes arrêté : ${base}/compte — et n’hésitez pas si une étape vous bloque, nous sommes là.`
              return (
                <li
                  key={e.id}
                  className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 lg:flex-row lg:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg">
                      <Link href={`/admin/clients/${e.user_id}`} className="hover:text-primary-text">
                        {e.profile!.full_name ?? e.profile!.email}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-sm text-fg-muted">{e.course!.title}</p>
                    <div className="mt-2 flex max-w-sm items-center gap-3">
                      <ProgressBar value={e.progress_percent} showLabel className="flex-1" />
                    </div>
                    <p className="mt-1 text-xs text-fg-subtle">Dernière activité {ago(e.last)}</p>
                  </div>
                  <FollowUpActions
                    kind="learner"
                    entityId={e.id}
                    whatsappHref={whatsappLink(e.profile!.phone, message)}
                    mailHref={mailto(e.profile!.email, `Votre formation « ${e.course!.title} »`, message)}
                    followedUpAt={followedUp.get(`followup.learner:${e.id}`) ?? null}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ---------- Avis ---------------------------------------------------- */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">Avis à demander</h2>
        <p className="mb-4 text-sm text-fg-muted">
          Apprenants arrivés à 80 % ou plus sans avoir laissé d’avis. Les témoignages sont votre
          meilleur argument de vente.
        </p>
        {reviewAsks.length === 0 ? (
          <EmptyState icon={MessageSquareHeart} title="Aucun avis en attente" />
        ) : (
          <ul className="space-y-3">
            {reviewAsks.map((e) => {
              const message = `Bonjour ${firstName(e.profile!.full_name)}, bravo pour votre avancée sur « ${e.course!.title} » ! Votre avis compte beaucoup pour les prochains participants : pourriez-vous nous laisser quelques mots ici ? ${base}/compte/avis?formation=${encodeURIComponent(e.course!.slug)} Cela prend une minute. Merci !`
              return (
                <li
                  key={e.id}
                  className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 lg:flex-row lg:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg">{e.profile!.full_name ?? e.profile!.email}</p>
                    <p className="mt-0.5 text-sm text-fg-muted">
                      {e.course!.title} · {e.progress_percent} %
                      {e.state === 'completed' && ' · terminée'}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-subtle">Inscrit le {formatDate(e.created_at)}</p>
                  </div>
                  <FollowUpActions
                    kind="review"
                    entityId={e.id}
                    whatsappHref={whatsappLink(e.profile!.phone, message)}
                    mailHref={mailto(e.profile!.email, 'Votre avis nous intéresse', message)}
                    followedUpAt={followedUp.get(`followup.review:${e.id}`) ?? null}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
