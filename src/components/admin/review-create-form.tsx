'use client'

import { useActionState } from 'react'
import { createReview, type AdminResult } from '@/app/actions/admin'
import { ActionFeedback, SaveButton } from '@/components/admin/form-bits'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'

/** Saisie manuelle d'un témoignage recueilli hors du site (WhatsApp, oral…). */
export function ReviewCreateForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action] = useActionState<AdminResult | null, FormData>(createReview, null)

  return (
    <form action={action} className="rounded-card border border-surface-700 bg-surface-800 p-6 lg:sticky lg:top-6">
      <h2 className="mb-1 text-lg font-semibold">Ajouter un témoignage</h2>
      <p className="mb-5 text-sm text-onDark-md">
        Pour publier un retour reçu par message ou à l’oral.
      </p>

      <ActionFeedback state={state} />

      <div className="space-y-4">
        <Field label="Nom" required>
          <Input name="author_name" required />
        </Field>

        <Field label="Fonction / activité">
          <Input name="author_role" placeholder="Productrice d’ananas, Allada" />
        </Field>

        <Field label="Formation concernée">
          <Select name="course_id" defaultValue="">
            <option value="">Général (pas de formation précise)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Note">
          <Select name="rating" defaultValue="5">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} étoile{n > 1 ? 's' : ''}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Témoignage">
          <Textarea name="comment" rows={4} />
        </Field>

        <Checkbox name="featured" label="Mettre en avant sur le site" />

        <SaveButton label="Publier le témoignage" />
      </div>
    </form>
  )
}
