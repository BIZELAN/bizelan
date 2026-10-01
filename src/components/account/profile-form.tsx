'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateProfile, type AuthState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import type { Profile } from '@/lib/types'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Enregistrement…' : 'Enregistrer'}
    </Button>
  )
}

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [state, action] = useActionState<AuthState | null, FormData>(updateProfile, null)

  return (
    <form action={action} className="space-y-5">
      {state && (
        <Alert tone={state.ok ? 'success' : 'error'}>{state.message}</Alert>
      )}

      <Field label="Adresse e-mail" help="L’adresse de connexion ne peut pas être modifiée ici.">
        <Input value={email} disabled readOnly />
      </Field>

      <Field label="Nom complet" htmlFor="fullName">
        <Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ''} autoComplete="name" />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ''} autoComplete="tel" />
        </Field>
        <Field label="Ville" htmlFor="city">
          <Input id="city" name="city" defaultValue={profile.city ?? ''} />
        </Field>
      </div>

      <Field
        label="Votre activité"
        htmlFor="activity"
        help="Par exemple : production maraîchère, transformation agroalimentaire…"
      >
        <Input id="activity" name="activity" defaultValue={profile.activity ?? ''} />
      </Field>

      <Submit />
    </form>
  )
}
