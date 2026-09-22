'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { signIn, type AuthState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending}>
      {pending ? 'Connexion…' : 'Se connecter'}
    </Button>
  )
}

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState | null, FormData>(signIn, null)

  return (
    <form action={action} className="space-y-5 rounded-lg border border-line bg-surface p-7">
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}

      <input type="hidden" name="next" value={next} />

      <Field label="Adresse e-mail" htmlFor="email" required>
        <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
      </Field>

      <Field label="Mot de passe" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </Field>

      <div className="text-right">
        <Link
          href="/mot-de-passe-oublie"
          className="text-sm text-fg-muted underline underline-offset-4 hover:text-primary-text"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <Submit />
    </form>
  )
}
