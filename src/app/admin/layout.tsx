import { requireAdmin } from '@/lib/auth'
import { getSiteSettings } from '@/lib/queries'
import { AdminChrome } from '@/components/admin/admin-chrome'
import { ConsoleScope } from '@/components/admin/console-scope'
import { CONSOLE_SCRIPT, SIDEBAR_SCRIPT } from '@/lib/sidebar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireAdmin(), getSiteSettings()])

  return (
    <>
      {/* Applique le repli mémorisé avant la peinture : sans cela la barre
          s'afficherait dépliée puis se rétracterait à chaque navigation. */}
      <script dangerouslySetInnerHTML={{ __html: SIDEBAR_SCRIPT }} />

      {/* Bascule <html> sur la palette de la console avant peinture, pour que
          les portails Radix en héritent aussi. Voir `lib/sidebar.ts`. */}
      <script dangerouslySetInnerHTML={{ __html: CONSOLE_SCRIPT }} />
      <ConsoleScope />

      <AdminChrome
        siteName={settings.site_name}
        logoUrl={settings.logo_url}
        userName={user.profile.full_name ?? user.email}
        userRole={user.profile.role}
      >
        {children}
      </AdminChrome>
    </>
  )
}
