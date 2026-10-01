import Link from 'next/link'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'

import { CheckoutForm, type CheckoutProps } from '@/components/checkout/checkout-form'
import { formatPrice } from '@/lib/utils'

/**
 * Gabarit commun du tunnel d'achat : formulaire à gauche, rappel de l'offre à
 * droite. Partagé par les formations et les produits de la boutique, pour que
 * les deux parcours d'achat restent strictement identiques.
 */
export function CheckoutShell({
  backHref,
  backLabel,
  coverUrl,
  subtitle,
  accessLabel,
  highlights,
  onlineEnabled,
  form,
}: {
  backHref: string
  backLabel: string
  coverUrl: string | null
  subtitle: string | null
  accessLabel: string | null
  highlights: string[]
  onlineEnabled: boolean
  form: CheckoutProps
}) {
  const isFree = form.priceCents === 0

  return (
    <div className="bg-canvas-subtle">
      <div className="container-page py-12 sm:py-16">
        <Link
          href={backHref}
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-primary-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <div className="min-w-0">
            <h1 className="mb-2 text-3xl">
              {isFree ? 'Obtenir votre accès' : 'Finaliser votre commande'}
            </h1>
            <p className="mb-8 text-fg-muted">
              {isFree
                ? 'Accès immédiat, sans paiement.'
                : 'Accès immédiat après confirmation du paiement.'}
            </p>

            <CheckoutForm {...form} />
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-e1">
              {coverUrl && (
                <img src={coverUrl} alt="" className="aspect-[16/9] w-full object-cover" />
              )}
              <div className="p-6">
                <h2 className="text-lg font-semibold text-fg">{form.title}</h2>
                {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}

                <p className="mt-4 text-2xl font-bold text-primary-text">
                  {formatPrice(form.priceCents, form.currency)}
                </p>
                {accessLabel && <p className="mt-0.5 text-sm text-fg-subtle">{accessLabel}</p>}

                {highlights.length > 0 && (
                  <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
                    {highlights.map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-fg-muted">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {!isFree && (
                  <p className="mt-5 flex items-start gap-2 border-t border-line pt-5 text-xs leading-relaxed text-fg-subtle">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
                    {onlineEnabled
                      ? 'Paiement Mobile Money sécurisé par SasPay (MTN, Moov, Celtiis). Nous ne stockons aucune donnée de paiement.'
                      : 'Votre accès est ouvert dès que notre équipe a vérifié votre paiement.'}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
