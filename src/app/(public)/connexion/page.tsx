import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SignInForm } from '@/components/auth/sign-in-form'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Connexion' }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ suivant?: string }>
}) {
  const { suivant } = await searchParams
  const user = await getCurrentUser()
  if (user) redirect(suivant ?? '/compte')

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl">Connexion</h1>
          <p className="mt-2 text-fg-muted">Accédez à vos formations et à votre suivi.</p>
        </div>

        <SignInForm next={suivant ?? '/compte'} />

        <p className="mt-6 text-center text-sm text-fg-muted">
          Pas encore de compte ?{' '}
          <Link
            href={`/inscription${suivant ? `?suivant=${encodeURIComponent(suivant)}` : ''}`}
            className="font-medium text-primary-text underline underline-offset-4 hover:text-primary-hover"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
