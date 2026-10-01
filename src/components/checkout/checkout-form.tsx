'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, Gift, Loader2, Smartphone, Tag } from 'lucide-react'

import { checkCoupon, confirmSaspayPayment, createOrder } from '@/app/actions/checkout'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
// Le module client : `lib/saspay` importe `node:crypto` et ne peut pas
// atteindre le navigateur.
import { SASPAY_NETWORKS } from '@/lib/saspay-networks'
import { cn, formatPrice } from '@/lib/utils'

type Method = 'saspay' | 'bank_transfer'

export interface CheckoutProps {
  /** Formation ou produit de la boutique. */
  itemType: 'course' | 'product'
  slug: string
  title: string
  /** Montant dû avant remise ; 0 pour une offre gratuite. */
  priceCents: number
  currency: string
  customerName: string
  customerEmail: string
  customerPhone: string
  onlineEnabled: boolean
  transferEnabled: boolean
  transferInstructions: string | null
}

/**
 * Tunnel d'achat.
 *
 * L'acheteur ne quitte PAS le site. Les trois réseaux béninois — MTN, Moov,
 * Celtiis — fonctionnent en push : SasPay envoie une demande de validation sur
 * le téléphone, et cette page reste ouverte pendant qu'il compose son code.
 * C'est ce qui avait été demandé dès le départ, et que la passerelle
 * précédente ne pouvait pas tenir : sa page de paiement répondait
 * `frame-ancestors 'none'` et refusait toute intégration.
 *
 * Un repli existe malgré tout. La documentation prévient qu'un même réseau
 * peut basculer vers une page hébergée sans préavis selon le routage : quand
 * la réponse porte une adresse de paiement, on y conduit l'acheteur plutôt que
 * de le laisser attendre un appel qui ne viendra jamais.
 */
export function CheckoutForm(props: CheckoutProps) {
  const router = useRouter()
  const [method, setMethod] = useState<Method>(
    props.onlineEnabled ? 'saspay' : 'bank_transfer',
  )
  const [coupon, setCoupon] = useState('')
  const [couponState, setCouponState] = useState<{ valid: boolean; message: string; discountCents: number } | null>(null)
  const [checkingCoupon, startCouponCheck] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [network, setNetwork] = useState<string>(SASPAY_NETWORKS[0].code)
  /** Demande poussée sur le téléphone : on attend que le client valide. */
  const [pushed, setPushed] = useState<{ orderId: string; instructions: string | null } | null>(
    null,
  )
  const [phone, setPhone] = useState(props.customerPhone)
  const [name, setName] = useState(props.customerName)

  const pendingOrder = useRef<{ id: string; reference: string } | null>(null)

  const discount = couponState?.valid ? couponState.discountCents : 0
  const total = Math.max(0, props.priceCents - discount)
  const isFree = total === 0
  const noMethod = !isFree && !props.onlineEnabled && !props.transferEnabled

  /**
   * Relit l'état du paiement auprès du serveur.
   *
   * Le webhook reste le canal de livraison — il survit à un onglet fermé.
   * Cette relecture sert à ne pas faire patienter quelqu'un dont le paiement
   * vient d'aboutir sous ses yeux.
   */
  const check = useCallback(
    async (orderId: string, reference: string) => {
      const result = await confirmSaspayPayment(orderId)
      if (result.ok) {
        setPushed(null)
        router.push(`/commande/confirmation/${result.reference ?? reference}`)
        return true
      }
      if (!result.pending) {
        setPushed(null)
        setError(result.message)
        return true
      }
      return false
    },
    [router],
  )

  /* Interrogation pendant que le client compose son code. */
  useEffect(() => {
    const order = pendingOrder.current
    if (!pushed || !order) return

    let stopped = false
    // Toutes les quatre secondes : assez pour que la confirmation paraisse
    // immédiate, assez peu pour ne pas marteler l'API pendant deux minutes.
    const poll = window.setInterval(() => {
      if (stopped) return
      void check(order.id, order.reference).then((done) => {
        if (done) window.clearInterval(poll)
      })
    }, 4000)

    // Une validation mobile money aboutit ou expire en quelques minutes.
    // Au-delà, on cesse d'interroger et on s'en remet au webhook plutôt que
    // de laisser un compteur tourner indéfiniment dans un onglet oublié.
    const giveUp = window.setTimeout(() => {
      stopped = true
      window.clearInterval(poll)
      setPushed(null)
      setError(
        'Aucune confirmation reçue. Si vous avez validé le paiement, l’accès s’ouvrira ' +
          'automatiquement et vous recevrez un e-mail. Sinon, réessayez.',
      )
    }, 180_000)

    return () => {
      stopped = true
      window.clearInterval(poll)
      window.clearTimeout(giveUp)
    }
  }, [pushed, check])

  function applyCoupon() {
    const formData = new FormData()
    formData.set('code', coupon)
    formData.set('itemType', props.itemType)
    formData.set('slug', props.slug)

    startCouponCheck(async () => {
      const result = await checkCoupon(null, formData)
      setCouponState(result)
    })
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const formData = new FormData()
    formData.set('itemType', props.itemType)
    formData.set('slug', props.slug)
    formData.set('method', method)
    formData.set('name', name)
    formData.set('phone', phone)
    formData.set('network', network)
    if (couponState?.valid) formData.set('coupon', coupon)

    const result = await createOrder(null, formData)
    setSubmitting(false)

    // Le dépôt manuel et le gratuit redirigent côté serveur : on n'arrive ici
    // que pour SasPay, ou sur une erreur.
    if (!result.ok || !result.order) {
      setError(result.message ?? 'La commande n’a pas pu être créée.')
      return
    }

    pendingOrder.current = { id: result.order.id, reference: result.order.reference }

    if (result.push) {
      // Cas courant au Bénin : la demande est sur le téléphone, la page reste.
      setPushed({ orderId: result.order.id, instructions: result.push.instructions })
      return
    }

    if (result.checkoutUrl) {
      // Le réseau a basculé sur une page hébergée. Rare ici, mais la
      // documentation prévient que cela peut arriver sans préavis.
      window.location.href = result.checkoutUrl
      return
    }

    setError('Le paiement n’a pas pu être lancé. Réessayez ou choisissez le dépôt bancaire.')
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

        {pushed && (
          <Alert tone="info">
            <span className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" aria-hidden />
              <span>
                <span className="block font-medium">
                  Validez le paiement sur votre téléphone.
                </span>
                <span className="mt-1 block">
                  {pushed.instructions ??
                    'Une demande vient d’être envoyée au ' +
                      `${phone}. Composez votre code secret pour confirmer — ` +
                      'cette page se met à jour toute seule.'}
                </span>
              </span>
            </span>
          </Alert>
        )}

        {/* Coordonnées */}
        <div className="rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-5 text-lg font-semibold">Vos coordonnées</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom complet" htmlFor="co-name" required>
              <Input
                id="co-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </Field>
            <Field
              label="Téléphone"
              htmlFor="co-phone"
              required={!isFree && method === 'saspay'}
              help={
                isFree
                  ? 'Facultatif. Utile pour vous joindre en cas de besoin.'
                  : 'Numéro Mobile Money à 10 chiffres, ex. 01 97 00 00 00.'
              }
            >
              <Input
                id="co-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                autoComplete="tel"
                placeholder="+229 …"
              />
            </Field>
          </div>
          <p className="mt-4 text-sm text-fg-subtle">
            Facture envoyée à <strong className="text-fg-muted">{props.customerEmail}</strong>
          </p>
        </div>

        {noMethod && (
          <Alert tone="warning" title="Paiement momentanément indisponible">
            Aucun moyen de paiement n’est ouvert pour le moment. Contactez-nous pour finaliser
            votre commande.
          </Alert>
        )}

        {/* Moyen de paiement — sans objet pour une offre gratuite */}
        {!isFree && !noMethod && (
        <div className="rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-5 text-lg font-semibold">Moyen de paiement</h2>
          <div className="space-y-3">
            {props.onlineEnabled && (
              <PaymentOption
                selected={method === 'saspay'}
                onSelect={() => setMethod('saspay')}
                icon={Smartphone}
                title="Mobile Money"
                description="MTN, Moov ou Celtiis. Vous validez sur votre téléphone, sans quitter cette page."
              />
            )}
            {props.transferEnabled && (
              <PaymentOption
                selected={method === 'bank_transfer'}
                onSelect={() => setMethod('bank_transfer')}
                icon={Banknote}
                title="Dépôt manuel / virement"
                description="Vous payez de votre côté, nous ouvrons l’accès après vérification."
              />
            )}
          </div>

          {method === 'saspay' && (
            <div className="mt-5">
              <p className="mb-2.5 text-sm font-medium text-fg">Votre opérateur</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {SASPAY_NETWORKS.map((option) => {
                  const selected = network === option.code
                  return (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => setNetwork(option.code)}
                      aria-pressed={selected}
                      className={cn(
                        'rounded-md border-2 px-4 py-3 text-sm font-medium transition-colors duration-fast',
                        selected
                          ? 'border-primary-text bg-primary-subtle text-primary-text'
                          : 'border-line bg-surface text-fg-muted hover:border-line-control hover:bg-canvas-subtle',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2.5 text-xs text-fg-subtle">
                Le numéro saisi plus haut recevra la demande de validation.
              </p>
            </div>
          )}

          {method === 'bank_transfer' && props.transferInstructions && (
            <div className="mt-5 whitespace-pre-line rounded-md bg-primary-subtle px-4 py-3.5 text-sm leading-relaxed text-primary-text">
              {props.transferInstructions}
            </div>
          )}
        </div>
        )}

        {/* Code promo — inutile quand l'offre est gratuite d'emblée */}
        {props.priceCents > 0 && (
        <div className="rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Tag className="h-5 w-5 text-primary-text" aria-hidden />
            Code promo
          </h2>
          <div className="flex gap-3">
            <Input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Votre code"
              aria-label="Code promo"
            />
            <Button
              type="button"
              variant="outline"
              onClick={applyCoupon}
              disabled={checkingCoupon || !coupon}
            >
              {checkingCoupon ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Appliquer'}
            </Button>
          </div>
          {couponState?.message && (
            <p
              className={cn(
                'mt-2.5 text-sm',
                couponState.valid ? 'font-medium text-primary-text' : 'text-danger',
              )}
            >
              {couponState.message}
            </p>
          )}
        </div>
        )}

        {/* Récapitulatif */}
        <div className="rounded-lg border-2 border-primary-text/40 bg-primary-subtle p-6">
          <h2 className="mb-4 text-lg font-semibold text-primary-text">Récapitulatif</h2>
          <dl className="space-y-2.5 text-[0.9375rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-muted">{props.title}</dt>
              <dd className="shrink-0 tabular-nums text-fg">
                {formatPrice(props.priceCents, props.currency)}
              </dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-primary-text">Remise</dt>
                <dd className="shrink-0 tabular-nums text-primary-text">
                  -{formatPrice(discount, props.currency)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-primary-text/25 pt-3 text-lg font-bold">
              <dt className="text-primary-text">Total</dt>
              <dd className="shrink-0 tabular-nums text-primary-text">
                {formatPrice(total, props.currency)}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <Button
              type="submit"
              size="lg"
              variant="accent"
              fullWidth
              disabled={submitting || Boolean(pushed) || noMethod}
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                isFree && <Gift className="h-5 w-5" aria-hidden />
              )}
              {submitting
                ? 'Traitement…'
                : isFree
                  ? props.itemType === 'product'
                    ? 'Obtenir gratuitement'
                    : 'Accéder gratuitement'
                  : method === 'saspay'
                    ? `Payer ${formatPrice(total, props.currency)}`
                    : 'Enregistrer ma commande'}
            </Button>
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-primary-text">
            En validant, vous acceptez nos{' '}
            <a href="/conditions" target="_blank" className="underline underline-offset-2">
              conditions générales de vente
            </a>
            .{!isFree && method === 'saspay' && ' Vérifiez toujours le montant avant de confirmer sur votre téléphone.'}
          </p>
        </div>
      </form>
    </>
  )
}

function PaymentOption({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full gap-4 rounded-lg border-2 p-4 text-left transition-colors',
        selected
          ? 'border-primary-text bg-primary-subtle'
          : 'border-line bg-surface hover:border-line-control hover:bg-canvas-subtle',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-primary-text' : 'border-line-strong',
        )}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
      <Icon className={cn('h-6 w-6 shrink-0', selected ? 'text-primary-text' : 'text-fg-subtle')} aria-hidden />
      <span className="min-w-0">
        <span className="block font-semibold text-fg">{title}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-fg-muted">{description}</span>
      </span>
    </button>
  )
}
