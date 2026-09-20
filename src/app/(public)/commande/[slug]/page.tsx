import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'

import { CheckoutForm } from '@/components/checkout/checkout-form'
import { getCourseBySlug, getSiteSettings } from '@/lib/queries'
import { getCurrentUser, hasCourseAccess } from '@/lib/auth'
import { env } from '@/lib/env'
import { asArray, formatPrice } from '@/lib/utils'

export const metadata: Metadata = { title: 'Commande' }

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const course = await getCourseBySlug(slug)

  if (!course || course.status !== 'published') notFound()

  const user = await getCurrentUser()
  if (!user) {
    redirect(`/connexion?suivant=${encodeURIComponent(`/commande/${slug}`)}`)
  }

  // Déjà inscrit : on renvoie vers la formation plutôt que de refacturer.
  if (await hasCourseAccess(user.id, course.id)) {
    redirect(`/compte/formations/${slug}`)
  }

  const settings = await getSiteSettings()
  const whatYouGet = asArray<string>(course.what_you_get)

  return (
    <div className="bg-surface-900">
      <div className="container-page py-12 sm:py-16">
        <Link
          href={`/formations/${slug}`}
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-onDark-md transition-colors hover:text-brand-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour à la formation
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <div className="min-w-0">
            <h1 className="mb-2 text-3xl">Finaliser votre commande</h1>
            <p className="mb-8 text-onDark-md">
              Accès immédiat après confirmation du paiement Mobile Money.
            </p>

            <CheckoutForm
              courseSlug={course.slug}
              courseTitle={course.title}
              courseId={course.id}
              priceCents={course.price_cents}
              currency={course.currency}
              customerName={user.profile.full_name ?? ''}
              customerEmail={user.email}
              customerPhone={user.profile.phone ?? ''}
              kkiapayPublicKey={env.kkiapayPublicKey}
              kkiapaySandbox={env.kkiapaySandbox}
              kkiapayEnabled={settings.payments_kkiapay_enabled && Boolean(env.kkiapayPublicKey)}
              transferEnabled={settings.payments_transfer_enabled}
              transferInstructions={settings.bank_transfer_instructions}
            />
          </div>

          {/* Rappel de l'offre */}
          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-card border border-surface-700 bg-surface-800">
              {course.cover_url && (
                <img src={course.cover_url} alt="" className="aspect-[16/9] w-full object-cover" />
              )}
              <div className="p-6">
                <h2 className="text-lg font-semibold text-onDark-hi">{course.title}</h2>
                {course.subtitle && (
                  <p className="mt-1 text-sm text-onDark-md">{course.subtitle}</p>
                )}

                <p className="mt-4 text-2xl font-bold text-brand-300">
                  {formatPrice(course.price_cents, course.currency)}
                </p>
                {course.access_label && (
                  <p className="mt-0.5 text-sm text-onDark-lo">{course.access_label}</p>
                )}

                {whatYouGet.length > 0 && (
                  <ul className="mt-5 space-y-2.5 border-t border-surface-700 pt-5">
                    {whatYouGet.map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-onDark-md">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" aria-hidden />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-5 flex items-start gap-2 border-t border-surface-700 pt-5 text-xs leading-relaxed text-onDark-lo">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" aria-hidden />
                  Paiement sécurisé par KkiaPay. Nous ne stockons aucune donnée bancaire.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
