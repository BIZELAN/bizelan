'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, CreditCard, ExternalLink, Loader2, Tag } from 'lucide-react'

import { checkCoupon, confirmChariowPayment, createOrder } from '@/app/actions/checkout'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { cn, formatPrice } from '@/lib/utils'

type Method = 'chariow' | 'bank_transfer'

export interface CheckoutProps {
  courseSlug: string
  courseTitle: string
  courseId: string
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
 * La page de paiement de Chariow ne peut PAS être intégrée : son prestataire
 * répond `Content-Security-Policy: frame-ancestors 'none'`, une protection
 * anti-détournement de clic qu'aucun réglage de notre côté ne contourne. Une
 * iframe n'afficherait qu'un cadre vide.
 *
 * Le paiement s'ouvre donc dans une FENÊTRE SECONDAIRE : la page du site reste
 * affichée derrière, avec l'état du paiement, et reprend la main dès que la
 * fenêtre se referme. C'est ce qui s'approche le plus de « ne pas quitter le
 * site » sans mentir au visiteur sur l'endroit où il saisit son paiement.
 *
 * La fenêtre est ouverte AVANT l'appel serveur, dans le fil du clic : ouverte
 * après, le navigateur la traiterait comme une pop-up non sollicitée et la
 * bloquerait. Si elle est tout de même bloquée, on bascule sur une navigation
 * classique plutôt que de laisser l'acheteur sans issue.
 */
export function CheckoutForm(props: CheckoutProps) {
  const router = useRouter()
  const [method, setMethod] = useState<Method>(
    props.onlineEnabled ? 'chariow' : 'bank_transfer',
  )
  const [coupon, setCoupon] = useState('')
  const [couponState, setCouponState] = useState<{ valid: boolean; message: string; discountCents: number } | null>(null)
  const [checkingCoupon, startCouponCheck] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Fenêtre de paiement ouverte : on attend son retour. */
  const [awaiting, setAwaiting] = useState<{ orderId: string; url: string } | null>(null)
  const [phone, setPhone] = useState(props.customerPhone)
  const [name, setName] = useState(props.customerName)

  const pendingOrder = useRef<{ id: string; reference: string } | null>(null)
  const popup = useRef<Window | null>(null)

  const discount = couponState?.valid ? couponState.discountCents : 0
  const total = Math.max(0, props.priceCents - discount)

  /**
   * Relit l'état de la commande auprès du serveur.
   *
   * Le webhook reste le canal de livraison : il survit à un acheteur qui ferme
   * son onglet. Cette relecture ne sert qu'à ne pas faire patienter quelqu'un
   * dont le paiement vient d'aboutir.
   */
  const check = useCallback(
    async (orderId: string, reference: string) => {
      const result = await confirmChariowPayment(orderId)
      if (result.ok) {
        setAwaiting(null)
        router.push(`/commande/confirmation/${result.reference ?? reference}`)
        return true
      }
      if (!result.pending) {
        setAwaiting(null)
        setError(result.message)
        return true
      }
      return false
    },
    [router],
  )

  /* Surveillance de la fenêtre de paiement. */
  useEffect(() => {
    const order = pendingOrder.current
    if (!awaiting || !order) return

    let stopped = false

    // Deux horloges, parce que les deux fins sont possibles : la fenêtre se
    // referme, ou le webhook arrive pendant qu'elle est encore ouverte.
    const closed = window.setInterval(() => {
      if (stopped) return
      if (popup.current?.closed) {
        window.clearInterval(closed)
        void check(order.id, order.reference)
      }
    }, 800)

    const poll = window.setInterval(() => {
      if (stopped) return
      void check(order.id, order.reference).then((done) => {
        if (done) window.clearInterval(poll)
      })
    }, 5000)

    return () => {
      stopped = true
      window.clearInterval(closed)
      window.clearInterval(poll)
    }
  }, [awaiting, check])

  function applyCoupon() {
    const formData = new FormData()
    formData.set('code', coupon)
    formData.set('courseId', props.courseId)
    formData.set('subtotal', String(props.priceCents))

    startCouponCheck(async () => {
      const result = await checkCoupon(null, formData)
      setCouponState(result)
    })
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    // La fenêtre est ouverte MAINTENANT, dans le fil du clic. Ouverte après
    // l'appel serveur, elle serait tenue pour une pop-up non sollicitée et
    // bloquée par le navigateur.
    const window_ = method === 'chariow' ? window.open('', '_blank', 'width=540,height=780') : null
    popup.current = window_
    window_?.document.write(
      '<!doctype html><meta charset="utf-8"><title>Paiement</title>' +
        '<body style="font:16px system-ui;display:grid;place-items:center;height:100vh;margin:0">' +
        'Ouverture du paiement…</body>',
    )

    const formData = new FormData()
    formData.set('courseSlug', props.courseSlug)
    formData.set('method', method)
    formData.set('name', name)
    formData.set('phone', phone)
    if (couponState?.valid) formData.set('coupon', coupon)

    const result = await createOrder(null, formData)

    // Le dépôt manuel redirige côté serveur : on n'arrive ici que pour Chariow.
    if (!result.ok || !result.order || !result.checkoutUrl) {
      window_?.close()
      popup.current = null
      setSubmitting(false)
      setError(result.message ?? 'La commande n’a pas pu être créée.')
      return
    }

    pendingOrder.current = { id: result.order.id, reference: result.order.reference }
    setSubmitting(false)

    if (window_ && !window_.closed) {
      window_.location.href = result.checkoutUrl
      window_.focus()
      setAwaiting({ orderId: result.order.id, url: result.checkoutUrl })
      return
    }

    // Fenêtre bloquée : plutôt que de laisser l'acheteur devant un écran mort,
    // on navigue dans l'onglet courant. Chariow ramènera sur la confirmation.
    window.location.href = result.checkoutUrl
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

        {awaiting && (
          <Alert tone="info">
            <span className="block font-medium">Paiement en cours dans une autre fenêtre.</span>
            <span className="mt-1 block">
              Terminez-y votre paiement : cette page se mettra à jour toute seule. Si la fenêtre
              s’est fermée par erreur,{' '}
              <a
                href={awaiting.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-4"
              >
                rouvrez-la
                <ExternalLink className="ml-1 inline h-3.5 w-3.5" aria-hidden />
              </a>
              .
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
              required
              help="Nécessaire au paiement en ligne. Format local, ex. 01 97 00 00 00."
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

        {/* Moyen de paiement */}
        <div className="rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-5 text-lg font-semibold">Moyen de paiement</h2>
          <div className="space-y-3">
            {props.onlineEnabled && (
              <PaymentOption
                selected={method === 'chariow'}
                onSelect={() => setMethod('chariow')}
                icon={CreditCard}
                title="Paiement en ligne"
                description="Mobile Money ou carte bancaire — accès ouvert dès le paiement confirmé."
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

          {method === 'bank_transfer' && props.transferInstructions && (
            <div className="mt-5 rounded-md bg-primary-subtle px-4 py-3.5 text-sm leading-relaxed text-primary-text">
              {props.transferInstructions}
            </div>
          )}
        </div>

        {/* Code promo */}
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

        {/* Récapitulatif */}
        <div className="rounded-lg border-2 border-primary-text/40 bg-primary-subtle p-6">
          <h2 className="mb-4 text-lg font-semibold text-primary-text">Récapitulatif</h2>
          <dl className="space-y-2.5 text-[0.9375rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-muted">{props.courseTitle}</dt>
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
            <Button type="submit" size="lg" variant="accent" fullWidth disabled={submitting}>
              {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
              {submitting
                ? 'Traitement…'
                : method === 'chariow'
                  ? `Payer ${formatPrice(total, props.currency)}`
                  : 'Enregistrer ma commande'}
            </Button>
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-primary-text">
            En validant, vous acceptez nos conditions générales de vente. Vérifiez toujours le
            montant avant de confirmer sur votre téléphone.
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
