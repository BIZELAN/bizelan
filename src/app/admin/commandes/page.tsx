import type { Metadata } from 'next'
import Link from 'next/link'
import { Receipt } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, StatCard, Table, Td, Th } from '@/components/admin/shell'
import { ExportButton } from '@/components/admin/export-button'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  StatusBadge,
} from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { formatDateTime, formatPrice, sanitizeSearch } from '@/lib/utils'
import { Input } from '@/components/ui/field'
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
  { value: 'cancelled', label: 'Annulées' },
  { value: 'refunded', label: 'Remboursées' },
]

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string }>
}) {
  const { statut, q } = await searchParams
  const supabase = createAdminClient()
  const search = sanitizeSearch(q)

  let query = supabase
    .from('orders')
    .select('*, items:order_items(title_snapshot, item_type)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (statut && FILTERS.some((f) => f.value === statut)) query = query.eq('status', statut)
  if (search) {
    query = query.or(
      `reference.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%`,
    )
  }

  const [{ data }, { data: allPaid }, { count: awaiting }] = await Promise.all([
    query,
    supabase.from('orders').select('total_cents').eq('status', 'paid'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'awaiting_payment'),
  ])

  const orders = (data as (Order & { items: { title_snapshot: string; item_type: string }[] })[]) ?? []
  const revenue = (allPaid ?? []).reduce((sum, o) => sum + (o.total_cents ?? 0), 0)

  return (
    <>
      <PageHeader
        title="Commandes"
        description="Suivez vos ventes et validez les paiements reçus par dépôt manuel."
        actions={<ExportButton type="commandes" />}
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

      <form className="mb-4 flex max-w-md gap-2">
        {statut && <input type="hidden" name="statut" value={statut} />}
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Référence, nom, e-mail ou téléphone…"
          aria-label="Rechercher une commande"
        />
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = (statut ?? '') === filter.value
          const params = new URLSearchParams()
          if (filter.value) params.set('statut', filter.value)
          if (search) params.set('q', search)
          const qs = params.toString()
          return (
            <Link
              key={filter.value}
              href={qs ? `/admin/commandes?${qs}` : '/admin/commandes'}
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
              <Th>Article</Th>
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
                <Td className="max-w-[16rem] text-sm text-fg-muted">
                  <span className="line-clamp-2">
                    {(order.items ?? []).map((i) => i.title_snapshot).join(', ') || '—'}
                  </span>
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
