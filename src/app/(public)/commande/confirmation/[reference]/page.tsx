import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSiteSettings } from '@/lib/queries'
import { ButtonLink } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import type { OrderWithItems } from '@/lib/types'

export const metadata: Metadata = { title: 'Confirmation de commande' }

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
  const paid = data.status === 'paid'

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-lg text-center">
        {paid ? (
          <CheckCircle2 className="mx-auto h-16 w-16 text-brand-400" aria-hidden />
        ) : (
          <Clock className="mx-auto h-16 w-16 text-amber-500" aria-hidden />
        )}

        <h1 className="mt-6 text-3xl">
          {paid ? 'Paiement confirmé' : 'Commande enregistrée'}
        </h1>

        <p className="mt-3 text-lg text-onDark-md">
          {paid
            ? 'Votre accès est ouvert. Vous pouvez commencer dès maintenant.'
            : 'Nous attendons la confirmation de votre paiement pour ouvrir votre accès.'}
        </p>

        <div className="mt-8 rounded-card border border-surface-700 bg-surface-800 p-6 text-left">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-onDark-lo">Référence</dt>
              <dd className="font-mono font-semibold text-onDark-hi">{data.reference}</dd>
            </div>
            {data.items?.map((item) => (
              <div key={item.id} className="flex justify-between gap-4">
                <dt className="text-onDark-lo">{item.title_snapshot}</dt>
                <dd className="shrink-0 tabular-nums text-onDark-hi">
                  {formatPrice(item.unit_price_cents, data.currency)}
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-surface-700 pt-3 font-bold">
              <dt className="text-onDark-hi">Total</dt>
              <dd className="shrink-0 tabular-nums text-onDark-hi">
                {formatPrice(data.total_cents, data.currency)}
              </dd>
            </div>
          </dl>
        </div>

        {!paid && settings.bank_transfer_instructions && (
          <div className="mt-6 rounded-card bg-brand-400/10 p-5 text-left text-sm leading-relaxed text-brand-900">
            <p className="mb-2 font-semibold">Pour finaliser votre paiement</p>
            {settings.bank_transfer_instructions}
            <p className="mt-3">
              Indiquez bien la référence <strong>{data.reference}</strong> lors de votre dépôt.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/compte" size="lg">
            {paid ? 'Accéder à ma formation' : 'Voir mon espace'}
          </ButtonLink>
          <ButtonLink href="/compte/commandes" variant="outline" size="lg">
            Mes commandes
          </ButtonLink>
        </div>

        {settings.email && (
          <p className="mt-8 text-sm text-onDark-lo">
            Une question ?{' '}
            <a
              href={`mailto:${settings.email}?subject=Commande ${data.reference}`}
              className="underline underline-offset-4 hover:text-brand-300"
            >
              Écrivez-nous
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
