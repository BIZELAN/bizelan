'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updatePassword, type AuthState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Mise à jour…' : 'Changer le mot de passe'}
    </Button>
  )
}

export function PasswordForm() {
  const [state, action] = useActionState<AuthState | null, FormData>(updatePassword, null)

  return (
    <form action={action} className="space-y-5">
      {state && <Alert tone={state.ok ? 'success' : 'error'}>{state.message}</Alert>}

      <Field label="Nouveau mot de passe" htmlFor="new-password" required help="8 caractères minimum.">
        <Input
          id="new-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>

      <Field label="Confirmer le mot de passe" htmlFor="confirm-password" required>
        <Input
          id="confirm-password"
          name="confirm"
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
