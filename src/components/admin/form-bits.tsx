'use client'

import * as React from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Save, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { cn } from '@/lib/utils'

/* --- Bouton d'enregistrement --------------------------------------------- */

export function SaveButton({ label = 'Enregistrer' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Save className="h-4 w-4" aria-hidden />
      )}
      {pending ? 'Enregistrement…' : label}
    </Button>
  )
}

/* --- Retour d'action ------------------------------------------------------ */

export function ActionFeedback({ state }: { state: { ok: boolean; message?: string } | null }) {
  if (!state?.message) return null
  return (
    <Alert tone={state.ok ? 'success' : 'error'} className="mb-5">
      {state.message}
    </Alert>
  )
}

/* --- Suppression avec confirmation ---------------------------------------- */

export function DeleteButton({
  action,
  label = 'Supprimer',
  confirmText = 'Confirmer la suppression ? Cette action est définitive.',
  redirectTo,
  size = 'sm',
  variant = 'danger',
}: {
  action: () => Promise<{ ok: boolean; message?: string }>
  label?: string
  confirmText?: string
  redirectTo?: string
  size?: 'sm' | 'md'
  variant?: 'danger' | 'ghost' | 'outline'
}) {
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  function run() {
    if (!window.confirm(confirmText)) return
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.message ?? 'Suppression impossible.')
        return
      }
      if (redirectTo) router.push(redirectTo)
      else router.refresh()
    })
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button type="button" variant={variant} size={size} onClick={run} disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="h-4 w-4" aria-hidden />
        )}
        {label}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  )
}

/* --- Bouton d'action générique (validation, changement de statut…) -------- */

export function ActionButton({
  action,
  children,
  confirmText,
  variant = 'outline',
  size = 'sm',
  className,
}: {
  action: () => Promise<{ ok: boolean; message?: string }>
  children: React.ReactNode
  confirmText?: string
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'accent' | 'secondary'
  size?: 'sm' | 'md'
  className?: string
}) {
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  function run() {
    if (confirmText && !window.confirm(confirmText)) return
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.message ?? 'Action impossible.')
        return
      }
      setError(null)
      router.refresh()
    })
  }

  return (
    <span className={cn('inline-flex flex-col gap-1', className)}>
      <Button type="button" variant={variant} size={size} onClick={run} disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  )
}

/* --- Liste de chaînes (une ligne par élément) ----------------------------- */

export function StringListEditor({
  name,
  defaultValue = [],
  itemLabel = 'Élément',
  placeholder,
}: {
  name: string
  defaultValue?: string[]
  itemLabel?: string
  placeholder?: string
}) {
  const [items, setItems] = React.useState<string[]>(
    defaultValue.length ? defaultValue : [''],
  )

  const update = (index: number, value: string) =>
    setItems((prev) => prev.map((item, i) => (i === index ? value : item)))

  const remove = (index: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : ['']))

  return (
    <div>
      {/* Valeur envoyée au serveur : une ligne par élément */}
      <input type="hidden" name={name} value={items.filter(Boolean).join('\n')} />

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => update(index, e.target.value)}
              placeholder={placeholder ?? `${itemLabel} ${index + 1}`}
              aria-label={`${itemLabel} ${index + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              aria-label="Retirer"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => setItems((prev) => [...prev, ''])}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter
      </Button>
    </div>
  )
}

/* --- Liste d'objets (FAQ, étapes…) : sérialisée en JSON ------------------- */

export interface ObjectFieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'stringList'
  placeholder?: string
}

export function ObjectListEditor({
  name,
  fields,
  defaultValue = [],
  itemLabel = 'Élément',
}: {
  name: string
  fields: ObjectFieldDef[]
  defaultValue?: Record<string, unknown>[]
  itemLabel?: string
}) {
  const [items, setItems] = React.useState<Record<string, unknown>[]>(defaultValue)

  const blank = () =>
    Object.fromEntries(fields.map((f) => [f.key, f.type === 'stringList' ? [] : '']))

  const update = (index: number, key: string, value: unknown) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)))

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="rounded-md border border-line bg-canvas-subtle/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-fg-muted">
                {itemLabel} {index + 1}
              </span>
              <div className="flex gap-1">
                {index > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setItems((prev) => {
                        const next = [...prev]
                        ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                        return next
                      })
                    }
                    aria-label="Monter"
                  >
                    ↑
                  </Button>
                )}
                {index < items.length - 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setItems((prev) => {
                        const next = [...prev]
                        ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                        return next
                      })
                    }
                    aria-label="Descendre"
                  >
                    ↓
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Retirer"
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      rows={3}
                      value={String(item[field.key] ?? '')}
                      onChange={(e) => update(index, field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : field.type === 'stringList' ? (
                    <Textarea
                      rows={3}
                      value={(Array.isArray(item[field.key]) ? (item[field.key] as string[]) : []).join('\n')}
                      onChange={(e) =>
                        update(
                          index,
                          field.key,
                          e.target.value.split('\n').map((l) => l.trim()).filter(Boolean),
                        )
                      }
                      placeholder="Un élément par ligne"
                    />
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={String(item[field.key] ?? '')}
                      onChange={(e) =>
                        update(
                          index,
                          field.key,
                          field.type === 'number' ? Number(e.target.value) : e.target.value,
                        )
                      }
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => setItems((prev) => [...prev, blank()])}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter {itemLabel.toLowerCase()}
      </Button>
    </div>
  )
}
