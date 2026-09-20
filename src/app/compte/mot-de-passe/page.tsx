import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { PasswordForm } from '@/components/account/password-form'
import { Alert } from '@/components/ui/misc'

export const metadata: Metadata = { title: 'Nouveau mot de passe' }

/** Page d'arrivée du lien de réinitialisation envoyé par e-mail. */
export default async function ResetPasswordPage() {
  await requireUser('/compte/mot-de-passe')

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl">Choisir un nouveau mot de passe</h1>
        <p className="mt-1 text-onDark-md">
          Vous êtes connecté via le lien reçu par e-mail. Définissez votre nouveau mot de passe.
        </p>
      </div>

      <Alert tone="info">
        Après validation, ce nouveau mot de passe remplacera l’ancien pour toutes vos connexions.
      </Alert>

      <div className="rounded-card border border-surface-700 bg-surface-800 p-6">
        <PasswordForm />
      </div>
    </div>
  )
}
