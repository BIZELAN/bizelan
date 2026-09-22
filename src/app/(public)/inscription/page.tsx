import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Créer un compte' }

export default async function SignUpPage({
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
          <h1 className="text-3xl">Créer un compte</h1>
          <p className="mt-2 text-fg-muted">
            Votre espace personnel garde vos formations et votre progression.
          </p>
        </div>

        <SignUpForm next={suivant ?? '/compte'} />

        <p className="mt-6 text-center text-sm text-fg-muted">
          Vous avez déjà un compte ?{' '}
          <Link
            href={`/connexion${suivant ? `?suivant=${encodeURIComponent(suivant)}` : ''}`}
            className="font-medium text-primary underline underline-offset-4 hover:text-primary-hover"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
