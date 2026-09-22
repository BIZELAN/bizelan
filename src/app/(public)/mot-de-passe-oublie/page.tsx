'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { requestPasswordReset, type AuthState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending}>
      {pending ? 'Envoi…' : 'Recevoir le lien de réinitialisation'}
    </Button>
  )
}

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<AuthState | null, FormData>(requestPasswordReset, null)

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl">Mot de passe oublié</h1>
          <p className="mt-2 text-fg-muted">
            Indiquez votre adresse e-mail : nous vous envoyons un lien pour en choisir un nouveau.
          </p>
        </div>

        {state?.ok ? (
          <Alert tone="success" title="Lien envoyé">
            {state.message}
          </Alert>
        ) : (
          <form action={action} className="space-y-5 rounded-lg border border-line bg-surface p-7">
            {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
            <Field label="Adresse e-mail" htmlFor="email" required>
              <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
            </Field>
            <Submit />
          </form>
        )}

        <p className="mt-6 text-center text-sm text-fg-muted">
          <Link href="/connexion" className="underline underline-offset-4 hover:text-primary-text">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
