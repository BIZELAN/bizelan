'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Award, Loader2 } from 'lucide-react'

import { requestCertificate, type CertificateResult } from '@/app/actions/certificates'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Award className="h-4 w-4" aria-hidden />}
      {pending ? 'Préparation du certificat…' : 'Obtenir mon certificat'}
    </Button>
  )
}

/**
 * Demande de certificat : l'apprenant confirme le nom à imprimer.
 *
 * Le nom du profil est souvent incomplet (prénom seul, surnom). Un certificat
 * se présente à un employeur ou à un financeur : c'est ici, et une seule fois,
 * qu'on le fait vérifier.
 */
export function CertificateRequestForm({ courseId, defaultName }: { courseId: string; defaultName: string }) {
  const [state, action] = useActionState<CertificateResult | null, FormData>(requestCertificate, null)
  const [name, setName] = useState(defaultName)
  const [confirmed, setConfirmed] = useState(false)

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
      <input type="hidden" name="courseId" value={courseId} />

      <Field
        label="Nom à inscrire sur le certificat"
        htmlFor={`cert-name-${courseId}`}
        help="Prénom(s) et nom complets, tels qu’ils figurent sur vos pièces officielles."
      >
        <Input
          id={`cert-name-${courseId}`}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={3}
          maxLength={120}
          required
          autoComplete="name"
        />
      </Field>

      <Checkbox
        checked={confirmed}
        onChange={(e) => setConfirmed(e.target.checked)}
        label="Je confirme que ce nom est correctement orthographié."
      />

      <Submit disabled={!confirmed || name.trim().length < 3} />
    </form>
  )
}
