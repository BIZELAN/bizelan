import { requireAdmin } from '@/lib/auth'
import { getSiteSettings } from '@/lib/queries'
import { AdminChrome } from '@/components/admin/admin-chrome'
import { SIDEBAR_SCRIPT } from '@/lib/sidebar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireAdmin(), getSiteSettings()])

  return (
    <>
      {/* Applique le repli mémorisé avant la peinture : sans cela la barre
          s'afficherait dépliée puis se rétracterait à chaque navigation. */}
      <script dangerouslySetInnerHTML={{ __html: SIDEBAR_SCRIPT }} />

      <AdminChrome
        siteName={settings.site_name}
        userName={user.profile.full_name ?? user.email}
        userRole={user.profile.role}
      >
        {children}
      </AdminChrome>
    </>
  )
}
