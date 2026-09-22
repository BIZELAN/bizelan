import type { Metadata } from 'next'
import { Receipt } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/misc'
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, StatusBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { formatDateTime, formatPrice } from '@/lib/utils'
import type { OrderWithItems } from '@/lib/types'

export const metadata: Metadata = { title: 'Mes commandes' }

export default async function OrdersPage() {
  const user = await requireUser('/compte/commandes')
  const supabase = await createClient()

  const { data } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const orders = (data as OrderWithItems[]) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Mes commandes</h1>
        <p className="mt-1 text-fg-muted">L’historique de vos achats et leur statut.</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Aucune commande pour le moment"
          description="Vos achats apparaîtront ici."
          action={<ButtonLink href="/formations">Voir les formations</ButtonLink>}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-fg">{order.reference}</p>
                  <p className="mt-0.5 text-sm text-fg-subtle">
                    {formatDateTime(order.created_at)} ·{' '}
                    {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                  <p className="mt-1.5 font-bold text-fg">
                    {formatPrice(order.total_cents, order.currency)}
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
                {order.items?.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 text-sm text-fg-muted">
                    <span>{item.title_snapshot}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatPrice(item.unit_price_cents, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              {order.status === 'awaiting_payment' && (
                <p className="mt-4 rounded-md bg-warning-subtle px-4 py-3 text-sm text-warning">
                  Nous attendons la confirmation de votre paiement. Votre accès s’ouvre dès
                  validation — généralement sous quelques heures ouvrées.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
