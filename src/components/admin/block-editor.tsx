'use client'

import { useMemo, useRef, useState } from 'react'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import { RichEditor } from '@/components/admin/rich-editor'
import { parseRichContent } from '@/lib/rich-content'
import {
  BLOCK_DEFS,
  createBlock,
  getBlockDef,
  type Block,
  type BlockType,
  type FieldDef,
} from '@/lib/blocks'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Select, Textarea } from '@/components/ui/field'
import { EmptyState } from '@/components/ui/misc'
import { cn } from '@/lib/utils'

/**
 * Éditeur de page par blocs.
 * L'ensemble des blocs est sérialisé en JSON dans un champ caché `blocks`,
 * envoyé avec le formulaire de la page.
 */
export function BlockEditor({
  name = 'blocks',
  defaultValue = [],
}: {
  name?: string
  defaultValue?: Block[]
}) {
  const [blocks, setBlocks] = useState<Block[]>(defaultValue)
  const [openId, setOpenId] = useState<string | null>(defaultValue[0]?.id ?? null)
  const [picker, setPicker] = useState(false)

  const groups = useMemo(() => {
    const map = new Map<string, typeof BLOCK_DEFS>()
    for (const def of BLOCK_DEFS) {
      const list = map.get(def.group) ?? []
      list.push(def)
      map.set(def.group, list)
    }
    return Array.from(map.entries())
  }, [])

  function add(type: BlockType) {
    const block = createBlock(type)
    setBlocks((prev) => [...prev, block])
    setOpenId(block.id)
    setPicker(false)
  }

  function update(id: string, data: Record<string, unknown>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, data } : b)))
  }

  function move(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function duplicate(id: string) {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id)
      if (index === -1) return prev
      const copy: Block = {
        ...structuredClone(prev[index]),
        id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      }
      const next = [...prev]
      next.splice(index + 1, 0, copy)
      return next
    })
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />

      {blocks.length === 0 ? (
        <EmptyState
          icon={Icons.LayoutTemplate}
          title="Page vide"
          description="Ajoutez des blocs pour composer votre page : bannière, arguments, offre, FAQ…"
          action={
            <Button type="button" onClick={() => setPicker(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Ajouter un bloc
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {blocks.map((block, index) => {
            const def = getBlockDef(block.type)
            const isOpen = openId === block.id
            const Icon = def
              ? ((Icons as unknown as Record<string, LucideIcon>)[
                  def.icon
                    .split('-')
                    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                    .join('')
                ] ?? Icons.Square)
              : Icons.Square

            return (
              <div
                key={block.id}
                className={cn(
                  'overflow-hidden rounded-lg border bg-surface transition-colors',
                  isOpen ? 'border-primary shadow-e1' : 'border-line',
                  block.hidden && 'opacity-60',
                )}
              >
                <div className="flex items-center gap-2 bg-canvas-subtle px-3 py-2.5">
                  <GripVertical className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />

                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : block.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    aria-expanded={isOpen}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-fg">
                        {def?.label ?? block.type}
                      </span>
                      <span className="block truncate text-xs text-fg-subtle">
                        {summarize(block)}
                      </span>
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center">
                    <IconButton
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      label="Monter"
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      onClick={() => move(index, 1)}
                      disabled={index === blocks.length - 1}
                      label="Descendre"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      onClick={() =>
                        setBlocks((prev) =>
                          prev.map((b) => (b.id === block.id ? { ...b, hidden: !b.hidden } : b)),
                        )
                      }
                      label={block.hidden ? 'Afficher' : 'Masquer'}
                    >
                      {block.hidden ? (
                        <EyeOff className="h-4 w-4" aria-hidden />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden />
                      )}
                    </IconButton>
                    <IconButton onClick={() => duplicate(block.id)} label="Dupliquer">
                      <Copy className="h-4 w-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        if (window.confirm('Supprimer ce bloc ?')) {
                          setBlocks((prev) => prev.filter((b) => b.id !== block.id))
                        }
                      }}
                      label="Supprimer"
                      danger
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </IconButton>
                  </div>
                </div>

                {isOpen && def && (
                  <div className="space-y-4 border-t border-line p-5">
                    {def.description && (
                      <p className="text-xs leading-relaxed text-fg-subtle">{def.description}</p>
                    )}
                    {def.fields.map((field) => (
                      <BlockField
                        key={field.key}
                        field={field}
                        value={block.data?.[field.key]}
                        onChange={(value) =>
                          update(block.id, { ...block.data, [field.key]: value })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <Button type="button" variant="outline" onClick={() => setPicker(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter un bloc
          </Button>
        </div>
      )}

      {/* Sélecteur de blocs */}
      {picker && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-canvas/50 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Choisir un bloc"
        >
          <div className="w-full max-w-3xl rounded-lg bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg font-semibold">Ajouter un bloc</h2>
              <button
                type="button"
                onClick={() => setPicker(false)}
                className="rounded-md p-2 text-fg-subtle hover:bg-canvas-subtle"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5">
              {groups.map(([group, defs]) => (
                <div key={group}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                    {group}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {defs.map((def) => (
                      <button
                        key={def.type}
                        type="button"
                        onClick={() => add(def.type)}
                        className="rounded-md border border-line p-3.5 text-left transition-colors hover:border-primary hover:bg-primary-subtle"
                      >
                        <span className="block text-sm font-semibold text-fg">{def.label}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-fg-subtle">
                          {def.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* --- Champ générique piloté par la définition du bloc --------------------- */

function BlockField({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: unknown
  onChange: (value: unknown) => void
}) {
  const label = (
    <label className="mb-1.5 block text-sm font-medium text-fg">{field.label}</label>
  )

  switch (field.type) {
    case 'richtext':
      return (
        <div>
          {label}
          <RichEditor
            defaultValue={parseRichContent(value)}
            onChange={onChange}
            minHeight="min-h-[16rem]"
            placeholder={field.placeholder ?? 'Rédigez le contenu de ce bloc…'}
          />
          {field.help && <p className="mt-1 text-xs text-fg-subtle">{field.help}</p>}
        </div>
      )

    case 'textarea':
      return (
        <div>
          {label}
          <Textarea
            rows={3}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {field.help && <p className="mt-1 text-xs text-fg-subtle">{field.help}</p>}
        </div>
      )

    case 'number':
      return (
        <div>
          {label}
          <Input
            type="number"
            value={Number(value ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="max-w-32"
          />
        </div>
      )

    case 'boolean':
      return (
        <div>
          <Checkbox
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            label={field.label}
          />
          {field.help && <p className="ml-6 mt-1 text-xs text-fg-subtle">{field.help}</p>}
        </div>
      )

    case 'select':
      return (
        <div>
          {label}
          <Select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      )

    case 'image':
      return (
        <div>
          {label}
          <InlineImage value={String(value ?? '')} onChange={onChange} />
        </div>
      )

    case 'stringList': {
      const items = Array.isArray(value) ? (value as string[]) : []
      return (
        <div>
          {label}
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) =>
                    onChange(items.map((v, i) => (i === index ? e.target.value : v)))
                  }
                  placeholder={`${field.itemLabel ?? 'Élément'} ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
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
            onClick={() => onChange([...items, ''])}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter
          </Button>
        </div>
      )
    }

    case 'objectList': {
      const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : []
      const subFields = field.fields ?? []

      return (
        <div>
          {label}
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="rounded-md border border-line bg-canvas-subtle/60 p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-fg-muted">
                    {field.itemLabel ?? 'Élément'} {index + 1}
                  </span>
                  <div className="flex gap-1">
                    {index > 0 && (
                      <IconButton
                        onClick={() => {
                          const next = [...items]
                          ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                          onChange(next)
                        }}
                        label="Monter"
                      >
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                    )}
                    {index < items.length - 1 && (
                      <IconButton
                        onClick={() => {
                          const next = [...items]
                          ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                          onChange(next)
                        }}
                        label="Descendre"
                      >
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                    )}
                    <IconButton
                      onClick={() => onChange(items.filter((_, i) => i !== index))}
                      label="Retirer"
                      danger
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </IconButton>
                  </div>
                </div>

                <div className="space-y-3">
                  {subFields.map((sub) => (
                    <BlockField
                      key={sub.key}
                      field={sub}
                      value={item[sub.key]}
                      onChange={(v) =>
                        onChange(items.map((it, i) => (i === index ? { ...it, [sub.key]: v } : it)))
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() =>
              onChange([
                ...items,
                Object.fromEntries(
                  subFields.map((f) => [f.key, f.type === 'stringList' ? [] : '']),
                ),
              ])
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter
          </Button>
        </div>
      )
    }

    default:
      return (
        <div>
          {label}
          <Input
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {field.help && <p className="mt-1 text-xs text-fg-subtle">{field.help}</p>}
        </div>
      )
  }
}

/**
 * Champ image d'un bloc : téléverse et renvoie directement l'URL au bloc,
 * sans passer par un champ de formulaire nommé.
 */
function InlineImage({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      body.set('file', file)
      body.set('bucket', 'public-media')

      const response = await fetch('/api/admin/upload', { method: 'POST', body })
      const payload = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !payload.url) {
        setError(payload.error ?? 'Téléversement impossible.')
        return
      }
      onChange(payload.url)
    } catch {
      setError('Téléversement impossible. Vérifiez votre connexion.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt=""
            className="h-24 w-auto max-w-full rounded-md border border-line object-cover"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -right-2 -top-2 rounded-full bg-canvas p-1 text-primary-fg transition-colors hover:bg-red-600"
            aria-label="Retirer l’image"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-full max-w-xs items-center justify-center gap-2 rounded-md border-2 border-dashed border-line-strong bg-canvas-subtle text-sm text-fg-subtle transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Icons.Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Téléversement…
            </>
          ) : (
            <>
              <Icons.ImagePlus className="h-5 w-5" aria-hidden />
              Choisir une image
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…ou collez une URL d’image"
        className="mt-2 text-xs"
      />

      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}

function IconButton({
  children,
  onClick,
  label,
  disabled,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'rounded-md p-1.5 transition-colors disabled:opacity-30',
        danger
          ? 'text-fg-subtle hover:bg-danger-subtle hover:text-danger'
          : 'text-fg-subtle hover:bg-canvas-subtle hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

/** Aperçu textuel court d'un bloc, affiché dans la liste. */
function summarize(block: Block): string {
  const data = block.data ?? {}
  for (const key of ['title', 'text', 'content', 'url', 'alt']) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) {
      return value.length > 70 ? `${value.slice(0, 70)}…` : value
    }
  }
  const items = data.items
  if (Array.isArray(items)) return `${items.length} élément(s)`
  return '—'
}
