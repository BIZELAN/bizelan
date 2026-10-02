'use client'

import { useState } from 'react'

import { Countdown } from '@/components/ui/countdown'
import { Checkbox, Field, Input } from '@/components/ui/field'
import { isoToLocalInput, localInputToIso } from '@/lib/datetime'
import type { Scarcity } from '@/lib/types'

/**
 * Compte à rebours et quantité restante d'une offre.
 *
 * La date part en ISO (champ caché) : saisie dans l'heure locale de
 * l'administrateur, elle est convertie dans son navigateur — le serveur, en
 * UTC, ne réinterprète rien. La quantité diminue toute seule à chaque vente
 * payée ; à zéro, l'offre affiche « Complet » et ne peut plus être achetée.
 */
export function ScarcityFields({
  item,
  unitHint = 'places restantes',
  sellable = true,
}: {
  item: Scarcity | null | undefined
  /** Libellé par défaut de la quantité : « places », « exemplaires »… */
  unitHint?: string
  /** Faux pour un service sur devis : rien n'est bloqué, seulement affiché. */
  sellable?: boolean
}) {
  const [endsAt, setEndsAt] = useState(item?.countdown_ends_at ?? '')
  const [stock, setStock] = useState(item?.stock_remaining == null ? '' : String(item.stock_remaining))

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <input type="hidden" name="countdown_ends_at" value={endsAt} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Fin du compte à rebours" help="Vide : pas de compte à rebours.">
            <Input
              type="datetime-local"
              value={isoToLocalInput(endsAt)}
              onChange={(e) => setEndsAt(localInputToIso(e.target.value))}
            />
          </Field>
          <Field label="Texte au-dessus du compteur">
            <Input
              name="countdown_label"
              defaultValue={item?.countdown_label ?? ''}
              placeholder="L’offre se termine dans"
              maxLength={120}
            />
          </Field>
        </div>
        {sellable && (
          <Checkbox
            name="countdown_closes_sale"
            defaultChecked={Boolean(item?.countdown_closes_sale)}
            label="Fermer les inscriptions à la fin du compte à rebours (sinon, seul le compteur disparaît)"
          />
        )}
        {endsAt && (
          <div className="rounded-md border border-line bg-canvas-subtle p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Aperçu</p>
            <Countdown endsAt={endsAt} size="sm" expiredText="Date passée : le compteur n’est plus affiché." />
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Quantité restante"
          help={
            sellable
              ? 'Vide : illimité. Diminue d’une unité à chaque vente payée ; à zéro, l’offre est « Complet ».'
              : 'Vide : rien n’est affiché. À mettre à jour vous-même.'
          }
        >
          <Input
            name="stock_remaining"
            type="number"
            min={0}
            step={1}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Illimité"
          />
        </Field>
        <Field label="Libellé de la quantité">
          <Input name="stock_label" defaultValue={item?.stock_label ?? ''} placeholder={unitHint} maxLength={80} />
        </Field>
      </div>
    </div>
  )
}
