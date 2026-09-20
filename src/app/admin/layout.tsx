import { requireAdmin } from '@/lib/auth'
import { getSiteSettings } from '@/lib/queries'
import { AdminChrome } from '@/components/admin/admin-chrome'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireAdmin(), getSiteSettings()])

  return (
    <AdminChrome
      siteName={settings.site_name}
      userName={user.profile.full_name ?? user.email}
      userRole={user.profile.role}
    >
      {children}
    </AdminChrome>
  )
}
