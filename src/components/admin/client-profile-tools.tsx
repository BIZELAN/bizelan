'use client'

import { useActionState, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck, StickyNote } from 'lucide-react'

import { changeUserRole, saveClientNote, type AdminResult } from '@/app/actions/admin'
import { ActionFeedback, SaveButton } from '@/components/admin/form-bits'
import { Select, Textarea } from '@/components/ui/field'
import { ROLE_LABELS } from '@/components/ui/badge'

/**
 * Note interne sur un client.
 *
 * La colonne `bz_profiles.notes` existait depuis le premier schéma, décrite
 * comme « note interne visible admin uniquement » — mais aucun écran ne
 * permettait de l'écrire ni de la lire.
 */
export function ClientNote({ userId, notes }: { userId: string; notes: string | null }) {
  const [state, action] = useActionState<AdminResult | null, FormData>(saveClientNote, null)
  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
        <StickyNote className="h-5 w-5 text-primary-text" aria-hidden />
        Note interne
      </h2>
      <p className="mb-4 text-xs text-fg-subtle">Visible par l’équipe uniquement, jamais par le client.</p>
      <ActionFeedback state={state} />
      <form action={action} className="space-y-3">
        <input type="hidden" name="user_id" value={userId} />
        <Textarea
          name="notes"
          rows={4}
          defaultValue={notes ?? ''}
          placeholder="Contexte, besoins exprimés, prochain contact prévu…"
          aria-label="Note interne"
        />
        <SaveButton label="Enregistrer la note" />
      </form>
    </section>
  )
}

/**
 * Changement de rôle.
 *
 * L'action serveur `changeUserRole` existait, et la fiche invitait à
 * « modifier le rôle depuis la liste des clients » — où rien ne le
 * permettait. Le contrôle est ici, là où l'on regarde le compte.
 */
export function RoleControl({
  userId,
  role,
  isSelf,
}: {
  userId: string
  role: 'client' | 'editor' | 'admin'
  isSelf: boolean
}) {
  const [value, setValue] = useState(role)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function apply(next: 'client' | 'editor' | 'admin') {
    if (next === role) return
    const label = ROLE_LABELS[next]?.label ?? next
    if (!window.confirm(`Donner le rôle « ${label} » à ce compte ?`)) {
      setValue(role)
      return
    }
    startTransition(async () => {
      const result = await changeUserRole(userId, next)
      setMessage({ ok: result.ok, text: result.message ?? '' })
      if (result.ok) router.refresh()
      else setValue(role)
    })
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <ShieldCheck className="h-5 w-5 text-primary-text" aria-hidden />
        Rôle
      </h2>
      <div className="flex items-center gap-2">
        <Select
          value={value}
          disabled={pending || isSelf}
          onChange={(e) => {
            const next = e.target.value as 'client' | 'editor' | 'admin'
            setValue(next)
            apply(next)
          }}
          aria-label="Rôle du compte"
        >
          <option value="client">Client</option>
          <option value="editor">Éditeur — gère le contenu</option>
          <option value="admin">Administrateur — accès complet</option>
        </Select>
        {pending && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-fg-subtle" aria-hidden />}
      </div>
      {isSelf && (
        <p className="mt-2 text-xs text-fg-subtle">Vous ne pouvez pas modifier votre propre rôle.</p>
      )}
      {message?.text && (
        <p className={`mt-2 text-xs ${message.ok ? 'text-success' : 'text-danger'}`}>{message.text}</p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
        Un éditeur gère le contenu, les commandes et les clients. Un administrateur peut en plus
        modifier les rôles.
      </p>
    </section>
  )
}
