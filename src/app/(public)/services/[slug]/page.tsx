import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'

import { Accordion } from '@/components/ui/accordion'
import { RichContentView } from '@/components/ui/rich-content'
import { parseRichContent } from '@/lib/rich-content'
import { QuoteForm } from '@/components/public/quote-form'
import { getServiceBySlug } from '@/lib/queries'
import { asArray, formatPrice, truncate } from '@/lib/utils'
import type { FaqItem, ProcessStep } from '@/lib/types'
import { offerState } from '@/lib/scarcity'
import { OfferUrgency } from '@/components/public/offer-urgency'
import { PresentationBlocks, hasPresentationBlocks } from '@/components/public/presentation-blocks'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) return { title: 'Service introuvable' }

  return {
    title: service.seo_title ?? service.title,
    description: service.seo_description ?? truncate(service.summary, 160),
  }
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = await getServiceBySlug(slug)

  if (!service || service.status !== 'published') notFound()

  const features = asArray<string>(service.features)
  const steps = asArray<ProcessStep>(service.process_steps)
  const deliverables = asArray<string>(service.deliverables)
  const faq = asArray<FaqItem>(service.faq)
  const offer = offerState(service)
  const withBlocks = hasPresentationBlocks(service.blocks)

  return (
    <>
      <section className="bg-canvas text-fg-muted">
        <div className="container-page py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary-text">
              Service
            </p>
            <h1 className="text-4xl font-bold leading-tight text-fg sm:text-5xl">
              {service.title}
            </h1>
            {service.subtitle && <p className="mt-4 text-xl text-primary-text">{service.subtitle}</p>}
            {service.summary && (
              <p className="mt-5 text-lg leading-relaxed text-fg-subtle">{service.summary}</p>
            )}
            <p className="mt-7 text-lg font-semibold text-fg">
              {service.pricing === 'quote'
                ? (service.price_label ?? 'Sur devis')
                : formatPrice(service.price_cents, service.currency)}
            </p>
            <OfferUrgency state={offer} className="mt-6 max-w-md" />
          </div>
        </div>
      </section>

      {/* Présentation composée par blocs, pleine largeur. */}
      <PresentationBlocks blocks={service.blocks} context={{ service }} />

      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-12">
          {!withBlocks && service.description && (
            <section>
              <h2 className="mb-5 text-2xl">En quoi consiste cette prestation</h2>
              <RichContentView content={parseRichContent(service.description)} />
            </section>
          )}

          {steps.length > 0 && (
            <section>
              <h2 className="mb-6 text-2xl">Comment nous procédons</h2>
              <ol className="space-y-4">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-4 rounded-lg border border-line bg-surface p-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-fg">{step.title}</h3>
                      {step.description && (
                        <p className="mt-1 text-[0.9375rem] leading-relaxed text-fg-muted">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {deliverables.length > 0 && (
            <section>
              <h2 className="mb-5 text-2xl">Vos livrables</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {deliverables.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border border-primary-text/25 bg-primary-subtle p-4 text-[0.9375rem] text-fg"
                  >
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary-text" aria-hidden />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {faq.length > 0 && (
            <section>
              <h2 className="mb-5 text-2xl">Questions fréquentes</h2>
              <Accordion items={faq} />
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {features.length > 0 && (
            <div className="rounded-lg border border-line bg-surface p-6">
              <h3 className="mb-4 text-base font-semibold">Ce qui est inclus</h3>
              <ul className="space-y-2.5">
                {features.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-fg-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <section className="section bg-canvas-subtle">
        <div className="container-page">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl">Demander un devis</h2>
            <p className="mt-4 text-lg leading-relaxed text-fg-muted">
              Décrivez votre situation : nous revenons vers vous sous 48 h ouvrées.
            </p>
          </div>
          <div className="mx-auto max-w-2xl">
            <QuoteForm serviceId={service.id} serviceName={service.title} />
          </div>
        </div>
      </section>
    </>
  )
}
