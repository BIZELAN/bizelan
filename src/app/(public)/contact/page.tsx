import type { Metadata } from 'next'
import { Clock, ExternalLink, Mail, MapPin, Phone } from 'lucide-react'
import { ContactForm } from '@/components/public/contact-form'
import { getSiteSettings } from '@/lib/queries'
import { mapsLinkFor, safeMapEmbedSrc } from '@/lib/map-embed'
import { asArray, whatsappLink } from '@/lib/utils'
import type { OpeningHour } from '@/lib/types'
import { WhatsAppIcon } from '@/components/ui/brand-icons'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez le cabinet BIZELAN : téléphone, e-mail, WhatsApp et adresse.',
}

export default async function ContactPage() {
  const settings = await getSiteSettings()
  const hours = asArray<OpeningHour>(settings.opening_hours)
  const whatsapp = whatsappLink(settings.whatsapp, 'Bonjour, je vous écris depuis votre site.')
  const mapSrc = safeMapEmbedSrc(settings.map_embed_url)
  const mapsHref = mapsLinkFor(settings)

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
                    {mapsHref && (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-text hover:underline"
                      >
                        Itinéraire sur Google Maps
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
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
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
              >
                <WhatsAppIcon size={20} aria-hidden />
                Discuter sur WhatsApp
              </a>
            )}

          </div>

          <ContactForm />
        </div>
      </section>

      {/* ---------- Carte ------------------------------------------------
          Elle occupait une bande de 256 px au fond de la colonne latérale,
          sous le bouton WhatsApp : trop petite pour situer quoi que ce soit,
          et reléguée derrière le formulaire. Elle prend maintenant toute la
          largeur, en fin de page — là où l'on cherche « comment venir »
          une fois le reste lu.

          La valeur repasse par `safeMapEmbedSrc` bien qu'elle soit déjà
          normalisée à l'enregistrement : les réglages saisis avant cette
          validation sont toujours en base, et un `src` d'iframe ne se sert
          pas sur la foi de ce qui a été écrit un jour. */}
      {mapSrc && (
        <section className="border-t border-line">
          <h2 className="sr-only">Nous situer</h2>
          <iframe
            src={mapSrc}
            title={`Localisation${settings.address ? ` : ${settings.address}` : ''}`}
            className="block h-[22rem] w-full border-0 sm:h-[26rem]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>
      )}
    </>
  )
}
