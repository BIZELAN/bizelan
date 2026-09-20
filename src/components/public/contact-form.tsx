'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Send } from 'lucide-react'
import { submitContactMessage, type ActionResult } from '@/app/actions/public'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} size="lg" fullWidth>
      <Send className="h-4 w-4" aria-hidden />
      {pending ? 'Envoi en cours…' : label}
    </Button>
  )
}

export function ContactForm({ subjectDefault }: { subjectDefault?: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(submitContactMessage, null)

  if (state?.ok) {
    return <Alert tone="success" title="Message envoyé">{state.message}</Alert>
  }

  return (
    <form action={action} className="space-y-5 rounded-card border border-surface-700 bg-surface-800 p-6 sm:p-8">
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom complet" htmlFor="contact-name" required>
          <Input id="contact-name" name="name" required autoComplete="name" />
        </Field>
        <Field label="E-mail" htmlFor="contact-email" required>
          <Input id="contact-email" name="email" type="email" required autoComplete="email" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="contact-phone">
          <Input id="contact-phone" name="phone" type="tel" autoComplete="tel" placeholder="+229 …" />
        </Field>
        <Field label="Sujet" htmlFor="contact-subject">
          <Input id="contact-subject" name="subject" defaultValue={subjectDefault} />
        </Field>
      </div>

      <Field label="Votre message" htmlFor="contact-message" required>
        <Textarea id="contact-message" name="message" rows={5} required />
      </Field>

      {/* Champ pot de miel : invisible pour les humains */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <SubmitButton label="Envoyer le message" />
    </form>
  )
}
