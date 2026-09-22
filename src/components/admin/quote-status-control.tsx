'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { updateQuoteStatus } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Select, Textarea } from '@/components/ui/field'
import type { QuoteStatus } from '@/lib/types'

export function QuoteStatusControl({
  id,
  status,
  note,
}: {
  id: string
  status: QuoteStatus
  note: string | null
}) {
  const [current, setCurrent] = useState<QuoteStatus>(status)
  const [text, setText] = useState(note ?? '')
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  function save() {
    startTransition(async () => {
      const result = await updateQuoteStatus(id, current, text)
      if (result.ok) {
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-40">
        <label className="mb-1 block text-xs font-medium text-fg-muted">Statut</label>
        <Select value={current} onChange={(e) => setCurrent(e.target.value as QuoteStatus)}>
          <option value="new">Nouvelle</option>
          <option value="in_progress">En cours</option>
          <option value="won">Gagnée</option>
          <option value="lost">Perdue</option>
        </Select>
      </div>

      <div className="min-w-56 flex-1">
        <label className="mb-1 block text-xs font-medium text-fg-muted">Note interne</label>
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      <Button type="button" variant="outline" size="sm" onClick={save} disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {saved ? 'Enregistré' : 'Enregistrer'}
      </Button>
    </div>
  )
}
