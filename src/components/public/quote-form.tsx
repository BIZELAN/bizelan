'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Send } from 'lucide-react'
import { submitQuoteRequest, type ActionResult } from '@/app/actions/public'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'

const BUDGETS = [
  'Moins de 250 000 FCFA',
  '250 000 – 500 000 FCFA',
  '500 000 – 1 000 000 FCFA',
  'Plus de 1 000 000 FCFA',
  'À définir ensemble',
]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} size="lg" fullWidth>
      <Send className="h-4 w-4" aria-hidden />
      {pending ? 'Envoi en cours…' : 'Envoyer ma demande'}
    </Button>
  )
}

export function QuoteForm({
  serviceId,
  serviceName,
}: {
  serviceId: string | null
  serviceName: string | null
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(submitQuoteRequest, null)

  if (state?.ok) {
    return <Alert tone="success" title="Demande transmise">{state.message}</Alert>
  }

  return (
    <form action={action} className="space-y-5 rounded-lg border border-line bg-surface p-6 sm:p-8">
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}

      <input type="hidden" name="serviceId" value={serviceId ?? ''} />
      <input type="hidden" name="serviceName" value={serviceName ?? ''} />

      {serviceName && (
        <p className="rounded-md bg-primary-subtle px-4 py-3 text-sm text-primary-text">
          Demande concernant : <strong>{serviceName}</strong>
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom complet" htmlFor="quote-name" required>
          <Input id="quote-name" name="name" required autoComplete="name" />
        </Field>
        <Field label="E-mail" htmlFor="quote-email" required>
          <Input id="quote-email" name="email" type="email" required autoComplete="email" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="quote-phone">
          <Input id="quote-phone" name="phone" type="tel" autoComplete="tel" placeholder="+229 …" />
        </Field>
        <Field label="Structure / entreprise" htmlFor="quote-company">
          <Input id="quote-company" name="company" autoComplete="organization" />
        </Field>
      </div>

      <Field label="Budget envisagé" htmlFor="quote-budget">
        <Select id="quote-budget" name="budget" defaultValue="">
          <option value="">Je ne sais pas encore</option>
          {BUDGETS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Décrivez votre besoin"
        htmlFor="quote-message"
        help="Plus votre description est précise, plus notre proposition sera juste."
      >
        <Textarea id="quote-message" name="message" rows={5} />
      </Field>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <SubmitButton />
    </form>
  )
}
