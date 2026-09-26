import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getSiteSettings } from '@/lib/queries'
import { signOut } from '@/app/actions/auth'
import { AccountNav } from '@/components/account/account-nav'
import { SiteLogo } from '@/components/ui/site-logo'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { initials } from '@/lib/utils'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSiteSettings()])
  const isAdmin = ['admin', 'editor'].includes(user.profile.role)

  return (
    <div className="flex min-h-screen flex-col bg-canvas-subtle">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <SiteLogo siteName={settings.site_name} logoUrl={settings.logo_url} height="h-9" />
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle className="hidden sm:inline-flex" />
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden rounded-md border border-primary-text/40 px-3 py-1.5 text-sm font-medium text-primary-text transition-colors hover:bg-primary-subtle sm:block"
              >
                Administration
              </Link>
            )}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary-text">
              {initials(user.profile.full_name ?? user.email)}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Se déconnecter">
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="container-page flex-1 py-8">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <AccountNav />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
