import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Banknote,
  GraduationCap,
  Inbox,
  Receipt,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, StatCard, Table, Td, Th } from '@/components/admin/shell'
import { ORDER_STATUS_LABELS, StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { RevenueChart } from '@/components/admin/revenue-chart'
import { formatDateTime, formatPrice } from '@/lib/utils'
import type { Order } from '@/lib/types'

export const metadata: Metadata = { title: 'Tableau de bord' }
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = createAdminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [
    paidOrders,
    monthOrders,
    pendingOrders,
    students,
    courses,
    quotes,
    reviews,
    recentOrders,
    dailyRevenue,
  ] = await Promise.all([
    supabase.from('orders').select('total_cents').eq('status', 'paid'),
    supabase.from('orders').select('total_cents').eq('status', 'paid').gte('paid_at', startOfMonth),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'awaiting_payment'),
    supabase.from('enrollments').select('user_id', { count: 'exact', head: true }).in('state', ['active', 'completed']),
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('orders')
      .select('id, reference, customer_name, total_cents, currency, status, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('orders')
      .select('paid_at, total_cents')
      .eq('status', 'paid')
      .gte('paid_at', thirtyDaysAgo)
      .order('paid_at'),
  ])

  const totalRevenue = (paidOrders.data ?? []).reduce((sum, o) => sum + (o.total_cents ?? 0), 0)
  const monthRevenue = (monthOrders.data ?? []).reduce((sum, o) => sum + (o.total_cents ?? 0), 0)

  // Agrégation quotidienne pour le graphique
  const byDay = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10)
    byDay.set(day, 0)
  }
  for (const order of dailyRevenue.data ?? []) {
    if (!order.paid_at) continue
    const day = order.paid_at.slice(0, 10)
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + (order.total_cents ?? 0))
  }
  const chartData = Array.from(byDay.entries()).map(([day, value]) => ({ day, value }))

  const alerts = [
    (pendingOrders.count ?? 0) > 0 && {
      href: '/admin/commandes?statut=awaiting_payment',
      label: `${pendingOrders.count} commande${(pendingOrders.count ?? 0) > 1 ? 's' : ''} en attente de validation`,
      icon: Banknote,
    },
    (quotes.count ?? 0) > 0 && {
      href: '/admin/demandes',
      label: `${quotes.count} nouvelle${(quotes.count ?? 0) > 1 ? 's' : ''} demande${(quotes.count ?? 0) > 1 ? 's' : ''} de devis`,
      icon: Inbox,
    },
    (reviews.count ?? 0) > 0 && {
      href: '/admin/avis',
      label: `${reviews.count} avis à relire`,
      icon: Star,
    },
  ].filter(Boolean) as { href: string; label: string; icon: React.ElementType }[]

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d’ensemble de votre activité sur les 30 derniers jours."
      />

      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert) => (
            <Link
              key={alert.href}
              href={alert.href}
              className="flex items-center gap-3 rounded-control border border-amber-200 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100"
            >
              <alert.icon className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden />
              <span className="flex-1">{alert.label}</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Chiffre d’affaires total"
          value={formatPrice(totalRevenue)}
          icon={TrendingUp}
          tone="brand"
        />
        <StatCard
          label="Ce mois-ci"
          value={formatPrice(monthRevenue)}
          hint={`${monthOrders.data?.length ?? 0} commande(s) payée(s)`}
          icon={Receipt}
          tone="accent"
        />
        <StatCard label="Apprenants" value={students.count ?? 0} icon={Users} />
        <StatCard label="Formations publiées" value={courses.count ?? 0} icon={GraduationCap} />
      </div>

      <section className="mt-6 rounded-card border border-surface-700 bg-surface-800 p-6">
        <h2 className="mb-5 text-lg font-semibold">Revenus des 30 derniers jours</h2>
        <RevenueChart data={chartData} />
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dernières commandes</h2>
          <Link
            href="/admin/commandes"
            className="text-sm font-medium text-brand-300 hover:text-brand-200"
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
                  <tr key={order.id} className="hover:bg-surface-800">
                    <Td>
                      <Link
                        href={`/admin/commandes/${order.id}`}
                        className="font-mono text-xs font-semibold text-brand-300 hover:underline"
                      >
                        {order.reference}
                      </Link>
                    </Td>
                    <Td className="text-onDark-hi">{order.customer_name}</Td>
                    <Td className="font-semibold tabular-nums">
                      {formatPrice(order.total_cents, order.currency)}
                    </Td>
                    <Td>
                      <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-onDark-lo">
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
