'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signUp, type AuthState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending}>
      {pending ? 'Création du compte…' : 'Créer mon compte'}
    </Button>
  )
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState | null, FormData>(signUp, null)

  if (state?.ok) {
    return (
      <Alert tone="success" title="Compte créé">
        {state.message}
      </Alert>
    )
  }

  return (
    <form action={action} className="space-y-5 rounded-lg border border-line bg-surface p-7">
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}

      <input type="hidden" name="next" value={next} />

      <Field label="Nom complet" htmlFor="fullName" required>
        <Input id="fullName" name="fullName" required autoComplete="name" autoFocus />
      </Field>

      <Field label="Adresse e-mail" htmlFor="email" required>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>

      <Field label="Téléphone" htmlFor="phone" help="Utile pour vous joindre en cas de souci de paiement.">
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+229 …" />
      </Field>

      <Field label="Mot de passe" htmlFor="password" required help="8 caractères minimum.">
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>

      <Submit />
    </form>
  )
}
