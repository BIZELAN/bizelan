import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSiteSettings } from '@/lib/queries'
import { ButtonLink } from '@/components/ui/button'
import { formatPrice, orderLinePrice } from '@/lib/utils'
import type { OrderWithItems } from '@/lib/types'

export const metadata: Metadata = { title: 'Confirmation de commande', robots: { index: false } }

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params
  const user = await requireUser(`/commande/confirmation/${reference}`)

  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('reference', reference)
    .eq('user_id', user.id)
    .maybeSingle<OrderWithItems>()

  if (!data) notFound()

  const settings = await getSiteSettings()
  const items = data.items ?? []
  const paid = data.status === 'paid'
  // Une commande échouée ou annulée s'affichait comme « en attente » : le
  // client patientait pour un paiement qui n'arriverait jamais.
  const failed = ['failed', 'cancelled', 'refunded'].includes(data.status)
  const awaitingTransfer = data.status === 'awaiting_payment'
  const onlyProducts = items.length > 0 && items.every((i) => i.item_type === 'product')
  const firstCourse = items.find((i) => i.item_type === 'course')
  const firstProduct = items.find((i) => i.item_type === 'product')

  const retryHref = firstProduct?.product_id
    ? '/boutique'
    : firstCourse?.course_id
      ? '/formations'
      : '/'

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-lg text-center">
        {paid ? (
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" aria-hidden />
        ) : failed ? (
          <XCircle className="mx-auto h-16 w-16 text-danger" aria-hidden />
        ) : (
          <Clock className="mx-auto h-16 w-16 text-warning" aria-hidden />
        )}

        <h1 className="mt-6 text-3xl">
          {paid
            ? data.total_cents === 0
              ? 'Votre accès est ouvert'
              : 'Paiement confirmé'
            : failed
              ? data.status === 'failed'
                ? 'Le paiement n’a pas abouti'
                : 'Commande annulée'
              : 'Commande enregistrée'}
        </h1>

        <p className="mt-3 text-lg text-fg-muted">
          {paid
            ? onlyProducts
              ? 'Vos fichiers sont disponibles dès maintenant dans votre espace.'
              : 'Vous pouvez commencer dès maintenant.'
            : failed
              ? data.status === 'failed'
                ? 'Aucun montant n’a été validé. Vous pouvez réessayer quand vous le souhaitez.'
                : 'Cette commande n’est plus active. Contactez-nous si vous pensez qu’il s’agit d’une erreur.'
              : awaitingTransfer
                ? 'Nous ouvrons votre accès dès réception de votre paiement.'
                : 'Nous attendons la confirmation de votre opérateur. Cette page se met à jour à la prochaine visite.'}
        </p>

        <div className="mt-8 rounded-lg border border-line bg-surface p-6 text-left">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-subtle">Référence</dt>
              <dd className="font-mono font-semibold text-fg">{data.reference}</dd>
            </div>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4">
                <dt className="text-fg-subtle">{item.title_snapshot}</dt>
                <dd className="shrink-0 tabular-nums text-fg">
                  {formatPrice(
                    orderLinePrice(item.unit_price_cents, items.length, data.discount_cents),
                    data.currency,
                  )}
                </dd>
              </div>
            ))}
            {data.discount_cents > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-fg-subtle">
                  Remise{data.coupon_code ? ` (${data.coupon_code})` : ''}
                </dt>
                <dd className="shrink-0 tabular-nums text-success">
                  −{formatPrice(data.discount_cents, data.currency)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-line pt-3 font-bold">
              <dt className="text-fg">Total</dt>
              <dd className="shrink-0 tabular-nums text-fg">
                {formatPrice(data.total_cents, data.currency)}
              </dd>
            </div>
          </dl>
        </div>

        {awaitingTransfer && settings.bank_transfer_instructions && (
          <div className="mt-6 rounded-lg bg-primary-subtle p-5 text-left text-sm leading-relaxed text-primary-text">
            <p className="mb-2 font-semibold">Pour finaliser votre paiement</p>
            <p className="whitespace-pre-line">{settings.bank_transfer_instructions}</p>
            <p className="mt-3">
              Indiquez bien la référence <strong>{data.reference}</strong> lors de votre dépôt.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {paid ? (
            <ButtonLink href={onlyProducts ? '/compte/produits' : '/compte'} size="lg">
              {onlyProducts ? 'Accéder à mes produits' : 'Accéder à ma formation'}
            </ButtonLink>
          ) : failed ? (
            <ButtonLink href={retryHref} size="lg">
              Réessayer
            </ButtonLink>
          ) : (
            <ButtonLink href="/compte" size="lg">
              Voir mon espace
            </ButtonLink>
          )}
          <ButtonLink href="/compte/commandes" variant="outline" size="lg">
            Mes commandes
          </ButtonLink>
        </div>

        {settings.email && (
          <p className="mt-8 text-sm text-fg-subtle">
            Une question ?{' '}
            <a
              href={`mailto:${settings.email}?subject=${encodeURIComponent(`Commande ${data.reference}`)}`}
              className="underline underline-offset-4 hover:text-primary-text"
            >
              Écrivez-nous
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
