'use client'

import { useActionState, useState } from 'react'
import { saveCoupon, type AdminResult } from '@/app/actions/admin'
import { ActionFeedback, SaveButton } from '@/components/admin/form-bits'
import { Checkbox, Field, Input, Select } from '@/components/ui/field'

export function CouponForm({
  courses,
  products = [],
}: {
  courses: { id: string; title: string }[]
  products?: { id: string; title: string }[]
}) {
  const [state, action] = useActionState<AdminResult | null, FormData>(saveCoupon, null)
  const [type, setType] = useState<'percent' | 'amount'>('percent')

  return (
    <form action={action} className="rounded-lg border border-line bg-surface p-6 lg:sticky lg:top-6">
      <h2 className="mb-5 text-lg font-semibold">Nouveau code promo</h2>

      <ActionFeedback state={state} />

      <div className="space-y-4">
        <Field label="Code" required help="En majuscules, sans espace.">
          <Input
            name="code"
            required
            placeholder="LANCEMENT40"
            className="font-mono uppercase"
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase().replace(/\s/g, '')
            }}
          />
        </Field>

        <Field label="Description interne">
          <Input name="description" placeholder="Offre de lancement" />
        </Field>

        <Field label="Type de réduction">
          <Select
            name="discount_type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="percent">Pourcentage</option>
            <option value="amount">Montant fixe</option>
          </Select>
        </Field>

        <Field
          label={type === 'percent' ? 'Pourcentage de remise' : 'Montant de remise (FCFA)'}
          required
        >
          <Input
            key={type}
            name="discount_value"
            type="number"
            min={1}
            max={type === 'percent' ? 100 : undefined}
            required
            defaultValue={type === 'percent' ? 20 : 5000}
          />
        </Field>

        <Field label="S’applique à" help="Tout le catalogue, une formation ou un produit précis.">
          <Select name="target" defaultValue="">
            <option value="">Tout le catalogue (formations et produits)</option>
            {courses.length > 0 && (
              <optgroup label="Formations">
                {courses.map((c) => (
                  <option key={c.id} value={`course:${c.id}`}>
                    {c.title}
                  </option>
                ))}
              </optgroup>
            )}
            {products.length > 0 && (
              <optgroup label="Produits de la boutique">
                {products.map((p) => (
                  <option key={p.id} value={`product:${p.id}`}>
                    {p.title}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        </Field>

        <Field label="Nombre maximum d’utilisations" help="Vide = illimité.">
          <Input name="max_redemptions" type="number" min={1} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Début">
            <Input name="starts_at" type="date" />
          </Field>
          <Field label="Fin">
            <Input name="ends_at" type="date" />
          </Field>
        </div>

        <Checkbox name="active" defaultChecked label="Code actif" />

        <SaveButton label="Créer le code" />
      </div>
    </form>
  )
}
