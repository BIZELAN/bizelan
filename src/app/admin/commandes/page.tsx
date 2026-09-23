import type { Metadata } from 'next'
import Link from 'next/link'
import { Receipt } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, StatCard, Table, Td, Th } from '@/components/admin/shell'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  StatusBadge,
} from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { formatDateTime, formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Order } from '@/lib/types'

export const metadata: Metadata = { title: 'Commandes' }
export const dynamic = 'force-dynamic'

const FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'awaiting_payment', label: 'À valider' },
  { value: 'paid', label: 'Payées' },
  { value: 'pending', label: 'En cours' },
  { value: 'failed', label: 'Échouées' },
  { value: 'refunded', label: 'Remboursées' },
]

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>
}) {
  const { statut } = await searchParams
  const supabase = createAdminClient()

  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (statut) query = query.eq('status', statut)

  const [{ data }, { data: allPaid }, { count: awaiting }] = await Promise.all([
    query,
    supabase.from('orders').select('total_cents').eq('status', 'paid'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'awaiting_payment'),
  ])

  const orders = (data as Order[]) ?? []
  const revenue = (allPaid ?? []).reduce((sum, o) => sum + (o.total_cents ?? 0), 0)

  return (
    <>
      <PageHeader
        title="Commandes"
        description="Suivez vos ventes et validez les paiements reçus par dépôt manuel."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Chiffre d’affaires encaissé" value={formatPrice(revenue)} tone="brand" />
        <StatCard label="Commandes payées" value={allPaid?.length ?? 0} />
        <StatCard
          label="En attente de validation"
          value={awaiting ?? 0}
          hint={awaiting ? 'Action requise' : 'Rien à traiter'}
          tone={awaiting ? 'accent' : 'neutral'}
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = (statut ?? '') === filter.value
          return (
            <Link
              key={filter.value}
              href={filter.value ? `/admin/commandes?statut=${filter.value}` : '/admin/commandes'}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-fg'
                  : 'border border-line bg-surface text-fg-muted hover:bg-canvas-subtle',
              )}
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={Receipt} title="Aucune commande dans cette vue" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Référence</Th>
              <Th>Client</Th>
              <Th>Montant</Th>
              <Th>Moyen</Th>
              <Th>Statut</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <Td>
                  <Link
                    href={`/admin/commandes/${order.id}`}
                    className="font-mono text-xs font-semibold text-primary-text hover:underline"
                  >
                    {order.reference}
                  </Link>
                </Td>
                <Td>
                  <span className="block text-fg">{order.customer_name}</span>
                  <span className="block text-xs text-fg-subtle">{order.customer_email}</span>
                </Td>
                <Td className="whitespace-nowrap font-semibold tabular-nums">
                  {formatPrice(order.total_cents, order.currency)}
                </Td>
                <Td className="whitespace-nowrap text-xs text-fg-muted">
                  {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
                </Td>
                <Td>
                  <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                </Td>
                <Td className="whitespace-nowrap text-xs text-fg-subtle">
                  {formatDateTime(order.created_at)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
