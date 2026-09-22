import Link from 'next/link'
import { BookOpen, LogOut, Receipt, User } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getSiteSettings } from '@/lib/queries'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { initials } from '@/lib/utils'

const NAV = [
  { href: '/compte', label: 'Mes formations', icon: BookOpen },
  { href: '/compte/commandes', label: 'Mes commandes', icon: Receipt },
  { href: '/compte/profil', label: 'Mon profil', icon: User },
]

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSiteSettings()])
  const isAdmin = ['admin', 'editor'].includes(user.profile.role)

  return (
    <div className="flex min-h-screen flex-col bg-canvas-subtle">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-[0.12em] text-primary">
            {settings.site_name}
          </Link>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden rounded-md border border-primary/40 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary-subtle sm:block"
              >
                Administration
              </Link>
            )}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary">
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
          <nav aria-label="Navigation de l’espace membre">
            <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3.5 py-2.5 text-[0.9375rem] font-medium text-fg-muted transition-colors hover:bg-canvas-subtle hover:text-primary-hover"
                  >
                    <item.icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
