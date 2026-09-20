import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getSiteSettings } from '@/lib/queries'
import { env } from '@/lib/env'

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
  themeColor: '#1c5d46',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
