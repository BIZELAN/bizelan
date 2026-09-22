import type { Metadata } from 'next'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { ContactForm } from '@/components/public/contact-form'
import { getSiteSettings } from '@/lib/queries'
import { asArray, whatsappLink } from '@/lib/utils'
import type { OpeningHour } from '@/lib/types'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez le cabinet BIZELAN : téléphone, e-mail, WhatsApp et adresse.',
}

export default async function ContactPage() {
  const settings = await getSiteSettings()
  const hours = asArray<OpeningHour>(settings.opening_hours)
  const whatsapp = whatsappLink(settings.whatsapp, 'Bonjour, je vous écris depuis votre site.')

  return (
    <>
      <section className="border-b border-line bg-canvas-subtle">
        <div className="container-page py-16 sm:py-20">
          <p className="eyebrow mb-3">Contact</p>
          <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl">Parlons de votre projet</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-fg-muted">
            Une question sur une formation, un besoin d’accompagnement ? Écrivez-nous, nous
            répondons sous 48 h ouvrées.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-8">
            <div className="space-y-5">
              {settings.phone && (
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle">
                    <Phone className="h-5 w-5 text-primary-text" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-fg-subtle">Téléphone</p>
                    <a
                      href={`tel:${settings.phone.replace(/\s/g, '')}`}
                      className="text-[0.9375rem] text-fg hover:text-primary-text"
                    >
                      {settings.phone}
                    </a>
                  </div>
                </div>
              )}

              {settings.email && (
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle">
                    <Mail className="h-5 w-5 text-primary-text" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-fg-subtle">E-mail</p>
                    <a
                      href={`mailto:${settings.email}`}
                      className="break-all text-[0.9375rem] text-fg hover:text-primary-text"
                    >
                      {settings.email}
                    </a>
                  </div>
                </div>
              )}

              {settings.address && (
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle">
                    <MapPin className="h-5 w-5 text-primary-text" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-fg-subtle">Adresse</p>
                    <p className="text-[0.9375rem] text-fg">{settings.address}</p>
                  </div>
                </div>
              )}

              {hours.length > 0 && (
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle">
                    <Clock className="h-5 w-5 text-primary-text" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-fg-subtle">Horaires</p>
                    <ul className="mt-1 space-y-1 text-[0.9375rem] text-fg">
                      {hours.map((h, i) => (
                        <li key={i}>
                          <span className="text-fg-muted">{h.label} :</span> {h.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-primary"
              >
                <MessageCircle className="h-5 w-5" aria-hidden />
                Discuter sur WhatsApp
              </a>
            )}

            {settings.map_embed_url && (
              <div className="overflow-hidden rounded-lg border border-line">
                <iframe
                  src={settings.map_embed_url}
                  title="Localisation du cabinet"
                  className="h-64 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  )
}
