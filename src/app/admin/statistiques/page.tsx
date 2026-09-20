import type { Metadata } from 'next'
import { Eye, GraduationCap, TrendingUp, Users } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, StatCard, Table, Td, Th } from '@/components/admin/shell'
import { RevenueChart } from '@/components/admin/revenue-chart'
import { EmptyState, ProgressBar } from '@/components/ui/misc'
import { formatPrice } from '@/lib/utils'

export const metadata: Metadata = { title: 'Statistiques' }
export const dynamic = 'force-dynamic'

export default async function AdminStatsPage() {
  const supabase = createAdminClient()
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString()

  const [
    { data: paidOrders },
    { data: courseSales },
    { data: enrollments },
    { count: viewCount },
    { data: topPages },
    { data: allOrders },
  ] = await Promise.all([
    supabase.from('orders').select('total_cents, paid_at').eq('status', 'paid').gte('paid_at', ninetyDaysAgo),
    supabase.from('v_course_sales').select('*'),
    supabase.from('enrollments').select('progress_percent, course_id').in('state', ['active', 'completed']),
    supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', ninetyDaysAgo),
    supabase.from('page_views').select('path').gte('created_at', ninetyDaysAgo).limit(2000),
    supabase.from('orders').select('status'),
  ])

  const revenue90 = (paidOrders ?? []).reduce((sum, o) => sum + (o.total_cents ?? 0), 0)

  // Série quotidienne sur 90 jours
  const byDay = new Map<string, number>()
  for (let i = 89; i >= 0; i--) {
    byDay.set(new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10), 0)
  }
  for (const order of paidOrders ?? []) {
    if (!order.paid_at) continue
    const day = order.paid_at.slice(0, 10)
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + (order.total_cents ?? 0))
  }
  const chartData = Array.from(byDay.entries()).map(([day, value]) => ({ day, value }))

  // Taux de conversion approximatif : commandes payées / total des commandes
  const totalOrders = allOrders?.length ?? 0
  const paidCount = (allOrders ?? []).filter((o) => o.status === 'paid').length
  const conversion = totalOrders ? Math.round((paidCount / totalOrders) * 100) : 0

  // Progression moyenne par formation
  const progressByCourse = new Map<string, { total: number; count: number }>()
  for (const e of enrollments ?? []) {
    const current = progressByCourse.get(e.course_id) ?? { total: 0, count: 0 }
    current.total += e.progress_percent ?? 0
    current.count += 1
    progressByCourse.set(e.course_id, current)
  }

  // Pages les plus vues
  const pageCounts = new Map<string, number>()
  for (const view of topPages ?? []) {
    pageCounts.set(view.path, (pageCounts.get(view.path) ?? 0) + 1)
  }
  const rankedPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const sales = (courseSales as { course_id: string; course_title: string; units_sold: number; revenue_cents: number }[]) ?? []

  return (
    <>
      <PageHeader
        title="Statistiques"
        description="Vos indicateurs sur les 90 derniers jours."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenus (90 jours)"
          value={formatPrice(revenue90)}
          icon={TrendingUp}
          tone="brand"
        />
        <StatCard
          label="Commandes payées"
          value={paidCount}
          hint={`sur ${totalOrders} commandes créées`}
          icon={GraduationCap}
        />
        <StatCard
          label="Taux de conversion"
          value={`${conversion} %`}
          hint="commandes payées / commandes créées"
          icon={Users}
          tone="accent"
        />
        <StatCard
          label="Pages vues (90 jours)"
          value={viewCount ?? 0}
          icon={Eye}
        />
      </div>

      <section className="mt-6 rounded-card border border-surface-700 bg-surface-800 p-6">
        <h2 className="mb-5 text-lg font-semibold">Revenus sur 90 jours</h2>
        <RevenueChart data={chartData} />
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Ventes par formation</h2>
        {sales.length === 0 ? (
          <EmptyState title="Aucune vente enregistrée" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Formation</Th>
                <Th>Ventes</Th>
                <Th>Revenus</Th>
                <Th>Progression moyenne</Th>
              </tr>
            </thead>
            <tbody>
              {sales
                .slice()
                .sort((a, b) => Number(b.revenue_cents) - Number(a.revenue_cents))
                .map((row) => {
                  const progress = progressByCourse.get(row.course_id)
                  const average = progress?.count
                    ? Math.round(progress.total / progress.count)
                    : 0
                  return (
                    <tr key={row.course_id} className="hover:bg-surface-800">
                      <Td className="font-medium text-onDark-hi">{row.course_title}</Td>
                      <Td className="tabular-nums text-onDark-md">{Number(row.units_sold)}</Td>
                      <Td className="font-semibold tabular-nums">
                        {formatPrice(Number(row.revenue_cents))}
                      </Td>
                      <Td className="min-w-40">
                        <ProgressBar value={average} showLabel />
                      </Td>
                    </tr>
                  )
                })}
            </tbody>
          </Table>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Pages les plus consultées</h2>
        {rankedPages.length === 0 ? (
          <EmptyState
            title="Pas encore de données de visite"
            description="Les statistiques de consultation se remplissent au fur et à mesure des visites."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Page</Th>
                <Th>Vues</Th>
              </tr>
            </thead>
            <tbody>
              {rankedPages.map(([path, count]) => (
                <tr key={path} className="hover:bg-surface-800">
                  <Td className="font-mono text-xs text-onDark-hi">{path}</Td>
                  <Td className="tabular-nums text-onDark-md">{count}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </>
  )
}
