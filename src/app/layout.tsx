import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { getSiteSettings } from '@/lib/queries'
import { env } from '@/lib/env'
import { THEME_SCRIPT } from '@/lib/theme'
import { buildThemeCss, parseTheme } from '@/lib/site-theme'
import { NavigationProgress } from '@/components/ui/navigation-progress'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  return {
    metadataBase: new URL(env.siteUrl),
    title: {
      default: settings.default_seo_title ?? settings.site_name,
      template: `%s — ${settings.site_name}`,
    },
    description: settings.default_seo_description ?? settings.tagline ?? undefined,
    icons: settings.favicon_url ? { icon: settings.favicon_url } : undefined,
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      siteName: settings.site_name,
      url: env.siteUrl,
    },
    robots: { index: true, follow: true },
  }
}

export const viewport: Viewport = {
  // La barre système du navigateur suit le thème : une barre verte foncée
  // au-dessus d'une interface claire jure, et inversement.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0a100d' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // L'apparence choisie dans l'administration est injectée APRÈS `globals.css`,
  // sous forme de surcharges de jetons. Les fonds, textes et bordures n'en
  // font pas partie : ce sont eux qui portent la lisibilité de l'ensemble.
  const settings = await getSiteSettings()
  const themeCss = buildThemeCss(parseTheme(settings.theme))

  return (
    // `suppressHydrationWarning` est requis : le script ci-dessous pose
    // `data-theme` sur cet élément avant que React n'hydrate, créant un écart
    // attendu entre le HTML du serveur et celui du navigateur.
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Chaîne vide quand rien n'est réglé : pas de balise superflue, et le
            site garde sa palette d'origine. Le contenu est entièrement
            construit à partir de couleurs validées — aucune saisie brute
            n'atteint la feuille de style. */}
        {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      </head>
      <body>
        {children}
        {/* Suspense : l'indicateur lit les paramètres d'URL, ce qui sans
            frontière rendrait toutes les pages dynamiques. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
      </body>
    </html>
  )
}
