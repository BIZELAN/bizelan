import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Mail, MessageCircle, Phone, User } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  StatusBadge,
} from '@/components/ui/badge'
import { Alert } from '@/components/ui/misc'
import { OrderActions } from '@/components/admin/order-actions'
import { formatDateTime, formatPrice, orderLinePrice, whatsappLink } from '@/lib/utils'
import { SASPAY_NETWORKS } from '@/lib/saspay-networks'
import type { OrderWithItems, Profile } from '@/lib/types'

const ITEM_TYPE_LABELS: Record<string, string> = {
  course: 'formation',
  product: 'produit',
  service: 'service',
}

function networkLabel(code: string) {
  return SASPAY_NETWORKS.find((n) => n.code === code)?.label ?? code
}

/** Message WhatsApp pré-rempli selon l'état de la commande. */
function followUpMessage(order: OrderWithItems): string {
  const firstName = order.customer_name.split(/\s+/)[0] ?? ''
  const title = order.items?.[0]?.title_snapshot ?? 'votre commande'
  const amount = formatPrice(order.total_cents, order.currency)
  switch (order.status) {
    case 'paid':
      return `Bonjour ${firstName}, merci pour votre achat « ${title} » (réf. ${order.reference}). Votre accès est ouvert. N’hésitez pas si vous avez la moindre question.`
    case 'awaiting_payment':
      return `Bonjour ${firstName}, nous avons bien reçu votre commande « ${title} » (réf. ${order.reference}, ${amount}). Avez-vous pu effectuer le dépôt ? Dès réception, votre accès est ouvert.`
    case 'failed':
    case 'pending':
      return `Bonjour ${firstName}, votre paiement pour « ${title} » (${amount}) ne semble pas avoir abouti. Souhaitez-vous que nous vous aidions à finaliser ?`
    default:
      return `Bonjour ${firstName}, au sujet de votre commande ${order.reference}.`
  }
}

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
                        ({ITEM_TYPE_LABELS[item.item_type] ?? item.item_type})
                      </span>
                    </td>
                    <td className="py-3 text-right tabular-nums text-fg">
                      {formatPrice(
                        orderLinePrice(
                          item.unit_price_cents,
                          order.items?.length ?? 1,
                          order.discount_cents,
                        ),
                        order.currency,
                      )}
                    </td>
                  </tr>
                ))}
                {order.discount_cents > 0 && (
                  <tr className="border-b border-line">
                    <td className="py-3 text-primary-text">
                      Remise {order.coupon_code ? `(${order.coupon_code})` : ''}
                    </td>
                    <td className="py-3 text-right tabular-nums text-primary-text">
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
              {order.saspay_network && (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">Réseau</dt>
                  <dd className="text-fg">{networkLabel(order.saspay_network)}</dd>
                </div>
              )}
              {order.saspay_payment_id && (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">Paiement SasPay</dt>
                  <dd className="break-all font-mono text-xs text-fg">{order.saspay_payment_id}</dd>
                </div>
              )}
              {order.kkiapay_transaction_id && (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">Transaction KkiaPay (historique)</dt>
                  <dd className="break-all font-mono text-xs text-fg">{order.kkiapay_transaction_id}</dd>
                </div>
              )}
              {order.chariow_sale_id && (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">Vente Chariow (historique)</dt>
                  <dd className="break-all font-mono text-xs text-fg">{order.chariow_sale_id}</dd>
                </div>
              )}
              {order.payment_reference && (
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-subtle">Référence de paiement</dt>
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
                  className="break-all text-primary-text hover:underline"
                >
                  {order.customer_email}
                </a>
              </li>
              {order.customer_phone && (
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                  <a
                    href={`tel:${order.customer_phone.replace(/\s/g, '')}`}
                    className="text-primary-text hover:underline"
                  >
                    {order.customer_phone}
                  </a>
                </li>
              )}
            </ul>

            {order.customer_phone && whatsappLink(order.customer_phone, followUpMessage(order)) && (
              <a
                href={whatsappLink(order.customer_phone, followUpMessage(order))!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border border-line-control px-4 py-2.5 text-sm font-medium text-fg transition-colors duration-fast hover:bg-canvas-subtle"
              >
                <MessageCircle className="h-4 w-4 text-success" aria-hidden />
                {order.status === 'paid' ? 'Remercier sur WhatsApp' : 'Relancer sur WhatsApp'}
              </a>
            )}

            {profile && (
              <Link
                href={`/admin/clients/${profile.id}`}
                className="mt-4 block text-sm font-medium text-primary-text hover:underline"
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
