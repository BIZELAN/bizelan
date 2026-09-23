import Link from 'next/link'
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Youtube,
  type LucideIcon,
} from 'lucide-react'

import { NewsletterForm } from '@/components/public/newsletter-form'
import { Panel } from '@/components/ui/surface'
import type { NavLink, OpeningHour, SiteSettings } from '@/lib/types'
import { asArray, whatsappLink } from '@/lib/utils'

/** Réseaux reconnus. Une clé inconnue en base est simplement ignorée. */
const SOCIALS: Record<string, { icon: LucideIcon; label: string }> = {
  facebook: { icon: Facebook, label: 'Facebook' },
  linkedin: { icon: Linkedin, label: 'LinkedIn' },
  youtube: { icon: Youtube, label: 'YouTube' },
  instagram: { icon: Instagram, label: 'Instagram' },
}

/**
 * Replis, employés tant que l'administration n'a rien saisi.
 *
 * Ils ne sont plus la source : les menus se règlent dans Paramètres >
 * Navigation. Les garder évite qu'un pied de page se vide le jour de la
 * migration, avant que quiconque ait ouvert le formulaire.
 */
const FALLBACK_NAV = [
  { href: '/formations', label: 'Formations' },
  { href: '/services', label: 'Services' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
  { href: '/compte', label: 'Mon espace' },
]

const FALLBACK_LEGAL = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/conditions', label: 'CGV' },
]

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const hours = asArray<OpeningHour>(settings.opening_hours)

  const navLinks = asArray<NavLink>(settings.nav_links)
  const nav = navLinks.length > 0 ? navLinks : FALLBACK_NAV
  const legalLinks = asArray<NavLink>(settings.legal_links)
  const legal = legalLinks.length > 0 ? legalLinks : FALLBACK_LEGAL
  const whatsapp = whatsappLink(settings.whatsapp, 'Bonjour, je vous écris depuis votre site.')
  const year = new Date().getFullYear()

  const socials = Object.entries(settings.social_links ?? {})
    .filter(([key, url]) => SOCIALS[key] && typeof url === 'string' && url.trim())
    .map(([key, url]) => ({ ...SOCIALS[key], url: url.trim() }))

  return (
    <footer className="mt-auto bg-canvas">
      <div className="container-page">
        <hr className="hairline" />
      </div>

      {/* Bandeau d'inscription : détaché du reste pour ne pas se noyer
          dans la colonne de liens, où il finit toujours ignoré. */}
      <div className="container-page pt-14">
        <Panel
          elevation="raised"
          className="flex flex-col gap-6 p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="max-w-md">
            <h2 className="text-lg text-fg">Recevez nos analyses</h2>
            <p className="mt-2 text-base text-fg-muted">
              Conseils concrets sur le financement, la structuration et la gestion d’entreprise.
              Pas de publicité, désinscription en un clic.
            </p>
          </div>
          <div className="w-full lg:max-w-sm">
            <NewsletterForm />
          </div>
        </Panel>
      </div>

      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={settings.site_name} className="h-9 w-auto" />
          ) : (
            <p className="text-lg font-bold tracking-[0.12em] text-fg">
              {settings.site_name}
            </p>
          )}
          {settings.tagline && (
            <p className="mt-4 text-base leading-relaxed text-fg-subtle">{settings.tagline}</p>
          )}

          {socials.length > 0 && (
            <ul className="mt-6 flex gap-2">
              {socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface text-fg-muted ring-1 ring-line transition-colors hover:bg-canvas-subtle hover:text-fg"
                  >
                    <social.icon className="h-4 w-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <FooterColumn title="Navigation">
          <ul className="space-y-3 text-base">
            {nav.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-fg">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </FooterColumn>

        <FooterColumn title="Contact">
          <ul className="space-y-3 text-base">
            {settings.phone && (
              <li className="flex items-start gap-2.5">
                <Phone className="mt-1 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
                <a
                  href={`tel:${settings.phone.replace(/\s/g, '')}`}
                  className="hover:text-fg"
                >
                  {settings.phone}
                </a>
              </li>
            )}
            {settings.email && (
              <li className="flex items-start gap-2.5">
                <Mail className="mt-1 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
                <a href={`mailto:${settings.email}`} className="break-all hover:text-fg">
                  {settings.email}
                </a>
              </li>
            )}
            {settings.address && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
                <span>{settings.address}</span>
              </li>
            )}
            {whatsapp && (
              <li className="pt-1">
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Écrire sur WhatsApp
                </a>
              </li>
            )}
          </ul>
        </FooterColumn>

        {hours.length > 0 && (
          <FooterColumn title="Horaires">
            <ul className="space-y-3 text-base">
              {hours.map((hour, index) => (
                <li key={index} className="flex justify-between gap-3">
                  <span className="text-fg-subtle">{hour.label}</span>
                  <span className="text-right text-fg-muted">{hour.value}</span>
                </li>
              ))}
            </ul>
          </FooterColumn>
        )}
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-xs text-fg-subtle sm:flex-row">
          <p>
            © {year} {settings.site_name} · Tous droits réservés
          </p>
          <div className="flex flex-wrap justify-center gap-5">
            {legal.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-fg-muted">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-fg">
        {title}
      </h3>
      {children}
    </div>
  )
}
