import { SiteHeader } from '@/components/public/site-header'
import { SiteFooter } from '@/components/public/site-footer'
import { ViewTracker } from '@/components/public/view-tracker'
import { getSiteSettings } from '@/lib/queries'
import { getCurrentUser } from '@/lib/auth'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSiteSettings(), getCurrentUser()])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        siteName={settings.site_name}
        logoUrl={settings.logo_url}
        isLoggedIn={Boolean(user)}
        announcement={settings.announcement_active ? settings.announcement : null}
        navLinks={settings.nav_links}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      <ViewTracker />
    </div>
  )
}
