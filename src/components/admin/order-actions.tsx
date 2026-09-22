'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Save } from 'lucide-react'

import { changeOrderStatus, saveOrderNote, validateOrder } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Field, Select, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import type { OrderStatus } from '@/lib/types'

export function OrderActions({
  orderId,
  status,
  adminNote,
  amount,
}: {
  orderId: string
  status: OrderStatus
  adminNote: string | null
  amount: string
}) {
  const [note, setNote] = useState(adminNote ?? '')
  const [newStatus, setNewStatus] = useState<string>('')
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    startTransition(async () => {
      const result = await fn()
      setFeedback({ ok: result.ok, message: result.message ?? (result.ok ? 'Fait.' : 'Échec.') })
      if (result.ok) router.refresh()
    })
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h2 className="mb-4 text-lg font-semibold">Actions</h2>

      {feedback && (
        <Alert tone={feedback.ok ? 'success' : 'error'} className="mb-4">
          {feedback.message}
        </Alert>
      )}

      {status !== 'paid' && (
        <div className="mb-5">
          <Button
            type="button"
            size="lg"
            disabled={pending}
            onClick={() =>
              run(
                () => validateOrder(orderId, note),
                `Confirmer la réception de ${amount} et ouvrir l’accès du client ?`,
              )
            }
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            )}
            Valider le paiement et ouvrir l’accès
          </Button>
          <p className="mt-2 text-xs text-fg-subtle">
            Le client recevra automatiquement son e-mail de confirmation.
          </p>
        </div>
      )}

      <div className="space-y-4 border-t border-line pt-5">
        <Field label="Note interne" help="Visible uniquement dans l’administration.">
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dépôt MTN reçu le 12/09 à 14h32, référence 884512…"
          />
        </Field>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => saveOrderNote(orderId, note))}
        >
          <Save className="h-4 w-4" aria-hidden />
          Enregistrer la note
        </Button>
      </div>

      <div className="mt-5 space-y-3 border-t border-line pt-5">
        <Field label="Changer le statut manuellement">
          <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
            <option value="">Choisir…</option>
            <option value="pending">En cours</option>
            <option value="awaiting_payment">En attente de paiement</option>
            <option value="failed">Échouée</option>
            <option value="cancelled">Annulée (retire l’accès)</option>
            <option value="refunded">Remboursée (retire l’accès)</option>
          </Select>
        </Field>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || !newStatus}
          onClick={() =>
            run(
              () => changeOrderStatus(orderId, newStatus as 'pending'),
              newStatus === 'refunded' || newStatus === 'cancelled'
                ? 'Cette action retirera l’accès du client aux formations de cette commande. Continuer ?'
                : undefined,
            )
          }
        >
          Appliquer
        </Button>
      </div>
    </section>
  )
}
