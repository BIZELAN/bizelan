'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { Banknote, Loader2, Smartphone, Tag } from 'lucide-react'

import { checkCoupon, confirmKkiapayPayment, createOrder } from '@/app/actions/checkout'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { cn, formatPrice } from '@/lib/utils'

/* Le widget KkiaPay expose ces fonctions globales une fois le script chargé. */
declare global {
  interface Window {
    openKkiapayWidget?: (options: Record<string, unknown>) => void
    addSuccessListener?: (cb: (response: { transactionId: string }) => void) => void
    addFailedListener?: (cb: (response: unknown) => void) => void
    addKkiapayCloseListener?: (cb: () => void) => void
  }
}

type Method = 'kkiapay' | 'bank_transfer'

export interface CheckoutProps {
  courseSlug: string
  courseTitle: string
  courseId: string
  priceCents: number
  currency: string
  customerName: string
  customerEmail: string
  customerPhone: string
  kkiapayPublicKey: string
  kkiapaySandbox: boolean
  kkiapayEnabled: boolean
  transferEnabled: boolean
  transferInstructions: string | null
}

export function CheckoutForm(props: CheckoutProps) {
  const router = useRouter()
  const [method, setMethod] = useState<Method>(
    props.kkiapayEnabled ? 'kkiapay' : 'bank_transfer',
  )
  const [coupon, setCoupon] = useState('')
  const [couponState, setCouponState] = useState<{ valid: boolean; message: string; discountCents: number } | null>(null)
  const [checkingCoupon, startCouponCheck] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [widgetReady, setWidgetReady] = useState(false)
  const [phone, setPhone] = useState(props.customerPhone)
  const [name, setName] = useState(props.customerName)

  const pendingOrder = useRef<{ id: string; reference: string } | null>(null)

  const discount = couponState?.valid ? couponState.discountCents : 0
  const total = Math.max(0, props.priceCents - discount)

  /* Écoute des retours du widget KkiaPay */
  useEffect(() => {
    if (!widgetReady) return

    window.addSuccessListener?.(async (response) => {
      const order = pendingOrder.current
      if (!order) return

      setSubmitting(true)
      const result = await confirmKkiapayPayment(order.id, response.transactionId)
      setSubmitting(false)

      if (result.ok) {
        router.push(`/commande/confirmation/${result.reference ?? order.reference}`)
      } else {
        setError(result.message)
      }
    })

    window.addFailedListener?.(() => {
      setSubmitting(false)
      setError(
        'Le paiement n’a pas abouti. Vérifiez votre solde puis réessayez, ou choisissez le dépôt manuel.',
      )
    })

    window.addKkiapayCloseListener?.(() => setSubmitting(false))
  }, [widgetReady, router])

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

    const formData = new FormData()
    formData.set('courseSlug', props.courseSlug)
    formData.set('method', method)
    formData.set('name', name)
    formData.set('phone', phone)
    if (couponState?.valid) formData.set('coupon', coupon)

    const result = await createOrder(null, formData)

    // Le dépôt manuel redirige côté serveur : on n'arrive ici que pour KkiaPay.
    if (!result.ok || !result.order) {
      setSubmitting(false)
      setError(result.message ?? 'La commande n’a pas pu être créée.')
      return
    }

    pendingOrder.current = { id: result.order.id, reference: result.order.reference }

    if (!window.openKkiapayWidget) {
      setSubmitting(false)
      setError('Le module de paiement n’est pas encore chargé. Patientez un instant puis réessayez.')
      return
    }

    window.openKkiapayWidget({
      amount: result.order.totalCents,
      key: props.kkiapayPublicKey,
      sandbox: props.kkiapaySandbox,
      position: 'center',
      theme: '#1c5d46',
      phone: phone || undefined,
      email: props.customerEmail,
      name,
      data: result.order.reference,
      callback: '',
    })
  }

  return (
    <>
      {props.kkiapayEnabled && (
        <Script
          src="https://cdn.kkiapay.me/k.js"
          strategy="afterInteractive"
          onLoad={() => setWidgetReady(true)}
        />
      )}

      <form onSubmit={submit} className="space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

        {/* Coordonnées */}
        <div className="rounded-card border border-surface-700 bg-surface-800 p-6">
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
              label="Téléphone Mobile Money"
              htmlFor="co-phone"
              help="Le numéro qui sera débité."
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
          <p className="mt-4 text-sm text-onDark-lo">
            Facture envoyée à <strong className="text-onDark-md">{props.customerEmail}</strong>
          </p>
        </div>

        {/* Moyen de paiement */}
        <div className="rounded-card border border-surface-700 bg-surface-800 p-6">
          <h2 className="mb-5 text-lg font-semibold">Moyen de paiement</h2>
          <div className="space-y-3">
            {props.kkiapayEnabled && (
              <PaymentOption
                selected={method === 'kkiapay'}
                onSelect={() => setMethod('kkiapay')}
                icon={Smartphone}
                title="Mobile Money"
                description="MTN, Moov ou Celtiis — accès ouvert immédiatement après paiement."
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
            <div className="mt-5 rounded-control bg-brand-400/10 px-4 py-3.5 text-sm leading-relaxed text-brand-900">
              {props.transferInstructions}
            </div>
          )}
        </div>

        {/* Code promo */}
        <div className="rounded-card border border-surface-700 bg-surface-800 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Tag className="h-5 w-5 text-brand-300" aria-hidden />
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
                couponState.valid ? 'font-medium text-brand-300' : 'text-red-300',
              )}
            >
              {couponState.message}
            </p>
          )}
        </div>

        {/* Récapitulatif */}
        <div className="rounded-card border-2 border-brand-400/40 bg-brand-400/10 p-6">
          <h2 className="mb-4 text-lg font-semibold text-brand-900">Récapitulatif</h2>
          <dl className="space-y-2.5 text-[0.9375rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-onDark-md">{props.courseTitle}</dt>
              <dd className="shrink-0 tabular-nums text-onDark-hi">
                {formatPrice(props.priceCents, props.currency)}
              </dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-brand-300">Remise</dt>
                <dd className="shrink-0 tabular-nums text-brand-300">
                  -{formatPrice(discount, props.currency)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-brand-400/30 pt-3 text-lg font-bold">
              <dt className="text-brand-900">Total</dt>
              <dd className="shrink-0 tabular-nums text-brand-900">
                {formatPrice(total, props.currency)}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <Button type="submit" size="lg" variant="accent" fullWidth disabled={submitting}>
              {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
              {submitting
                ? 'Traitement…'
                : method === 'kkiapay'
                  ? `Payer ${formatPrice(total, props.currency)}`
                  : 'Enregistrer ma commande'}
            </Button>
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-brand-300">
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
        'flex w-full gap-4 rounded-card border-2 p-4 text-left transition-colors',
        selected
          ? 'border-brand-600 bg-brand-400/10'
          : 'border-surface-700 bg-surface-800 hover:border-surface-600 hover:bg-surface-800',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-brand-600' : 'border-surface-600',
        )}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
      </span>
      <Icon className={cn('h-6 w-6 shrink-0', selected ? 'text-brand-300' : 'text-onDark-lo')} aria-hidden />
      <span className="min-w-0">
        <span className="block font-semibold text-onDark-hi">{title}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-onDark-md">{description}</span>
      </span>
    </button>
  )
}
