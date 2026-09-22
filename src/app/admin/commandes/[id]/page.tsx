import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Mail, Phone, User } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  StatusBadge,
} from '@/components/ui/badge'
import { Alert } from '@/components/ui/misc'
import { OrderActions } from '@/components/admin/order-actions'
import { formatDateTime, formatPrice } from '@/lib/utils'
import type { OrderWithItems, Profile } from '@/lib/types'

export const metadata: Metadata = { title: 'Détail de la commande' }
export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .maybeSingle<OrderWithItems>()

  if (!order) notFound()

  const { data: profile } = order.user_id
    ? await supabase.from('bz_profiles').select('*').eq('id', order.user_id).maybeSingle<Profile>()
    : { data: null }

  return (
    <>
      <PageHeader
        title={`Commande ${order.reference}`}
        description={formatDateTime(order.created_at)}
        backHref="/admin/commandes"
        backLabel="Commandes"
        actions={<StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />}
      />

      {order.status === 'awaiting_payment' && (
        <Alert tone="warning" title="Paiement à vérifier" className="mb-6">
          Ce client a choisi le dépôt manuel. Vérifiez la réception du montant de{' '}
          <strong>{formatPrice(order.total_cents, order.currency)}</strong>, puis validez la
          commande : son accès s’ouvrira et il recevra un e-mail de confirmation.
        </Alert>
      )}

      {order.status === 'paid' && (
        <Alert tone="success" className="mb-6">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Payée le {formatDateTime(order.paid_at)}
            {order.kkiapay_transaction_id && (
              <span className="text-xs">· transaction {order.kkiapay_transaction_id}</span>
            )}
          </span>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold">Détail</h2>
            <table className="w-full text-sm">
              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.id} className="border-b border-line">
                    <td className="py-3 text-fg">
                      {item.title_snapshot}
                      <span className="ml-2 text-xs text-fg-subtle">
                        ({item.item_type === 'course' ? 'formation' : 'service'})
                      </span>
                    </td>
                    <td className="py-3 text-right tabular-nums text-fg">
                      {formatPrice(item.unit_price_cents, order.currency)}
                    </td>
                  </tr>
                ))}
                {order.discount_cents > 0 && (
                  <tr className="border-b border-line">
                    <td className="py-3 text-primary">
                      Remise {order.coupon_code ? `(${order.coupon_code})` : ''}
                    </td>
                    <td className="py-3 text-right tabular-nums text-primary">
                      −{formatPrice(order.discount_cents, order.currency)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-3 font-bold text-fg">Total</td>
                  <td className="py-3 text-right text-lg font-bold tabular-nums text-fg">
                    {formatPrice(order.total_cents, order.currency)}
                  </td>
                </tr>
              </tbody>
            </table>

            <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-fg-subtle">Moyen de paiement</dt>
                <dd className="text-fg">
                  {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
                </dd>
              </div>
              {order.payment_reference && (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">Référence client</dt>
                  <dd className="font-mono text-fg">{order.payment_reference}</dd>
                </div>
              )}
            </dl>
          </section>

          <OrderActions
            orderId={order.id}
            status={order.status}
            adminNote={order.admin_note}
            amount={formatPrice(order.total_cents, order.currency)}
          />
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold">Client</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                <span className="text-fg">{order.customer_name}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                <a
                  href={`mailto:${order.customer_email}`}
                  className="break-all text-primary hover:underline"
                >
                  {order.customer_email}
                </a>
              </li>
              {order.customer_phone && (
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                  <a
                    href={`tel:${order.customer_phone.replace(/\s/g, '')}`}
                    className="text-primary hover:underline"
                  >
                    {order.customer_phone}
                  </a>
                </li>
              )}
            </ul>

            {profile && (
              <Link
                href={`/admin/clients/${profile.id}`}
                className="mt-4 block text-sm font-medium text-primary hover:underline"
              >
                Voir la fiche client →
              </Link>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}
