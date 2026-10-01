import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  GraduationCap,
  Inbox,
  Mail,
  MessageSquare,
  Package,
  Receipt,
  Repeat,
  ShoppingBasket,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, StatCard, Table, Td, Th } from '@/components/admin/shell'
import { ORDER_STATUS_LABELS, StatusBadge } from '@/components/ui/badge'
import { EmptyState, ProgressBar } from '@/components/ui/misc'
import { RevenueChart } from '@/components/admin/revenue-chart'
import { formatDateTime, formatPrice } from '@/lib/utils'
import type { Order } from '@/lib/types'

export const metadata: Metadata = { title: 'Tableau de bord' }
export const dynamic = 'force-dynamic'

const DAY = 86400000

/** Variation en % entre deux périodes ; `null` quand la base est nulle. */
function trend(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

export default async function AdminDashboard() {
  const supabase = createAdminClient()
  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * DAY).toISOString()
  const d60 = new Date(now.getTime() - 60 * DAY).toISOString()
  const d7 = new Date(now.getTime() - 7 * DAY).toISOString()

  const [
    paid60,
    pendingOrders,
    enrollments,
    quotes,
    reviews,
    contacts,
    recentOrders,
    newClients30,
    newClients60,
    subscribers,
    abandoned7,
    mismatches,
    products,
    productFiles,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, paid_at, total_cents, items:order_items(title_snapshot, item_type, course_id, product_id, unit_price_cents)')
      .eq('status', 'paid')
      .gte('paid_at', d60)
      .order('paid_at'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'awaiting_payment'),
    supabase.from('enrollments').select('state, progress_percent').in('state', ['active', 'completed']),
    supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('handled', false),
    supabase
      .from('orders')
      .select('id, reference, customer_name, total_cents, currency, status, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('bz_profiles').select('id', { count: 'exact', head: true }).gte('created_at', d30),
    supabase
      .from('bz_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', d60)
      .lt('created_at', d30),
    supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('unsubscribed', false),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'failed'])
      .gte('created_at', d7),
    supabase
      .from('activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'order.amount_mismatch')
      .gte('created_at', d30),
    supabase.from('products').select('id, title').eq('status', 'published'),
    supabase.from('product_files').select('product_id'),
  ])

  type PaidOrder = {
    id: string
    paid_at: string | null
    total_cents: number
    items: { title_snapshot: string; item_type: string; course_id: string | null; product_id: string | null; unit_price_cents: number }[]
  }
  const paid = (paid60.data ?? []) as PaidOrder[]
  const current = paid.filter((o) => o.paid_at && o.paid_at >= d30)
  const previous = paid.filter((o) => o.paid_at && o.paid_at < d30)

  const revenue30 = current.reduce((s, o) => s + (o.total_cents ?? 0), 0)
  const revenuePrev = previous.reduce((s, o) => s + (o.total_cents ?? 0), 0)
  // Le panier moyen ignore les commandes gratuites : elles le tireraient vers
  // zéro sans rien dire de ce que dépensent les clients qui paient.
  const payingCurrent = current.filter((o) => o.total_cents > 0)
  const payingPrevious = previous.filter((o) => o.total_cents > 0)
  const basket30 = payingCurrent.length ? Math.round(revenue30 / payingCurrent.length) : 0
  const basketPrev = payingPrevious.length ? Math.round(revenuePrev / payingPrevious.length) : 0

  const enrollmentRows = enrollments.data ?? []
  const completed = enrollmentRows.filter((e) => e.state === 'completed').length
  const completionRate = enrollmentRows.length ? Math.round((completed / enrollmentRows.length) * 100) : 0
  const avgProgress = enrollmentRows.length
    ? Math.round(enrollmentRows.reduce((s, e) => s + (e.progress_percent ?? 0), 0) / enrollmentRows.length)
    : 0

  // Série quotidienne sur 30 jours
  const byDay = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    byDay.set(new Date(now.getTime() - i * DAY).toISOString().slice(0, 10), 0)
  }
  for (const order of current) {
    const day = order.paid_at!.slice(0, 10)
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + (order.total_cents ?? 0))
  }
  const chartData = Array.from(byDay.entries()).map(([day, value]) => ({ day, value }))

  // Meilleures ventes des 30 derniers jours, formations et produits confondus.
  const tops = new Map<string, { title: string; type: string; units: number; revenue: number }>()
  for (const order of current) {
    for (const item of order.items ?? []) {
      const key = item.course_id ?? item.product_id ?? item.title_snapshot
      const entry = tops.get(key) ?? { title: item.title_snapshot, type: item.item_type, units: 0, revenue: 0 }
      entry.units += 1
      entry.revenue += item.unit_price_cents ?? 0
      tops.set(key, entry)
    }
  }
  const topSales = [...tops.values()].sort((a, b) => b.revenue - a.revenue || b.units - a.units).slice(0, 5)
  const topMax = topSales[0]?.revenue || 1

  const filesByProduct = new Set((productFiles.data ?? []).map((f) => f.product_id as string))
  const emptyProducts = (products.data ?? []).filter((p) => !filesByProduct.has(p.id as string))

  const alerts = [
    (mismatches.count ?? 0) > 0 && {
      href: '/admin/journal?type=order',
      label: `${mismatches.count} paiement${(mismatches.count ?? 0) > 1 ? 's' : ''} avec un montant inférieur au dû — à vérifier`,
      icon: AlertTriangle,
      tone: 'danger' as const,
    },
    (pendingOrders.count ?? 0) > 0 && {
      href: '/admin/commandes?statut=awaiting_payment',
      label: `${pendingOrders.count} commande${(pendingOrders.count ?? 0) > 1 ? 's' : ''} en attente de validation`,
      icon: Banknote,
      tone: 'warning' as const,
    },
    emptyProducts.length > 0 && {
      href: `/admin/produits/${emptyProducts[0].id}`,
      label: `${emptyProducts.length} produit${emptyProducts.length > 1 ? 's' : ''} en vente sans fichier à livrer`,
      icon: Package,
      tone: 'danger' as const,
    },
    (quotes.count ?? 0) > 0 && {
      href: '/admin/demandes',
      label: `${quotes.count} nouvelle${(quotes.count ?? 0) > 1 ? 's' : ''} demande${(quotes.count ?? 0) > 1 ? 's' : ''} de devis`,
      icon: Inbox,
      tone: 'warning' as const,
    },
    (contacts.count ?? 0) > 0 && {
      href: '/admin/demandes',
      label: `${contacts.count} message${(contacts.count ?? 0) > 1 ? 's' : ''} de contact non traité${(contacts.count ?? 0) > 1 ? 's' : ''}`,
      icon: MessageSquare,
      tone: 'warning' as const,
    },
    (reviews.count ?? 0) > 0 && {
      href: '/admin/avis',
      label: `${reviews.count} avis à relire`,
      icon: Star,
      tone: 'warning' as const,
    },
    (abandoned7.count ?? 0) > 0 && {
      href: '/admin/relances',
      label: `${abandoned7.count} paiement${(abandoned7.count ?? 0) > 1 ? 's' : ''} non abouti${(abandoned7.count ?? 0) > 1 ? 's' : ''} cette semaine — à relancer`,
      icon: Repeat,
      tone: 'info' as const,
    },
  ].filter(Boolean) as {
    href: string
    label: string
    icon: React.ElementType
    tone: 'danger' | 'warning' | 'info'
  }[]

  const ALERT_TONES = {
    danger: 'border-danger/30 bg-danger-subtle text-danger hover:border-danger/60',
    warning: 'border-warning/30 bg-warning-subtle text-warning hover:border-warning/60',
    info: 'border-info/30 bg-info-subtle text-info hover:border-info/60',
  }

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Votre activité des 30 derniers jours, comparée aux 30 jours précédents."
      />

      {alerts.length > 0 && (
        <section aria-label="À traiter" className="mb-6 space-y-2">
          {alerts.map((alert) => (
            <Link
              key={alert.label}
              href={alert.href}
              className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${ALERT_TONES[alert.tone]}`}
            >
              <alert.icon className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden />
              <span className="flex-1">{alert.label}</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          ))}
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Chiffre d’affaires (30 j)"
          value={formatPrice(revenue30 || null)}
          trend={trend(revenue30, revenuePrev)}
          hint="vs 30 jours précédents"
          icon={TrendingUp}
          tone="brand"
        />
        <StatCard
          label="Ventes payantes (30 j)"
          value={payingCurrent.length}
          trend={trend(payingCurrent.length, payingPrevious.length)}
          hint={current.length > payingCurrent.length ? `+ ${current.length - payingCurrent.length} gratuite(s)` : undefined}
          icon={Receipt}
          tone="accent"
        />
        <StatCard
          label="Panier moyen"
          value={formatPrice(basket30 || null)}
          trend={trend(basket30, basketPrev)}
          icon={ShoppingBasket}
        />
        <StatCard
          label="Nouveaux comptes (30 j)"
          value={newClients30.count ?? 0}
          trend={trend(newClients30.count ?? 0, newClients60.count ?? 0)}
          icon={UserPlus}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Apprenants inscrits" value={enrollmentRows.length} icon={Users} />
        <StatCard
          label="Taux d’achèvement"
          value={`${completionRate} %`}
          hint={`progression moyenne ${avgProgress} %`}
          icon={Target}
        />
        <StatCard
          label="Produits en vente"
          value={(products.data ?? []).length}
          icon={Package}
        />
        <StatCard label="Abonnés newsletter" value={subscribers.count ?? 0} icon={Mail} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-5 text-lg font-semibold">Revenus des 30 derniers jours</h2>
          <RevenueChart data={chartData} />
        </section>

        <section className="rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">Meilleures ventes (30 j)</h2>
          {topSales.length === 0 ? (
            <p className="text-sm text-fg-subtle">Aucune vente sur la période.</p>
          ) : (
            <ol className="space-y-4">
              {topSales.map((item) => (
                <li key={item.title}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      {item.type === 'product' ? (
                        <Package className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                      ) : (
                        <GraduationCap className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                      )}
                      <span className="truncate font-medium text-fg">{item.title}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-fg-muted">
                      {item.units} · {formatPrice(item.revenue || null)}
                    </span>
                  </div>
                  <ProgressBar value={(item.revenue / topMax) * 100} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dernières commandes</h2>
          <Link
            href="/admin/commandes"
            className="text-sm font-medium text-primary-text hover:text-primary-hover"
          >
            Tout voir →
          </Link>
        </div>

        {(recentOrders.data ?? []).length === 0 ? (
          <EmptyState icon={Receipt} title="Aucune commande pour l’instant" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Référence</Th>
                <Th>Client</Th>
                <Th>Montant</Th>
                <Th>Statut</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {((recentOrders.data ?? []) as Pick<Order, 'id' | 'reference' | 'customer_name' | 'total_cents' | 'currency' | 'status' | 'created_at'>[]).map(
                (order) => (
                  <tr key={order.id}>
                    <Td>
                      <Link
                        href={`/admin/commandes/${order.id}`}
                        className="font-mono text-xs font-semibold text-primary-text hover:underline"
                      >
                        {order.reference}
                      </Link>
                    </Td>
                    <Td className="text-fg">{order.customer_name}</Td>
                    <Td className="font-semibold tabular-nums">
                      {formatPrice(order.total_cents, order.currency)}
                    </Td>
                    <Td>
                      <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-fg-subtle">
                      {formatDateTime(order.created_at)}
                    </Td>
                  </tr>
                ),
              )}
            </tbody>
          </Table>
        )}
      </section>
    </>
  )
}
