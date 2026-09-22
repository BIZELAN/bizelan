'use client'

import { useState } from 'react'
import { Check, Copy, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/misc'
import { formatDate, formatFileSize } from '@/lib/utils'
import type { MediaItem } from '@/lib/types'

export function MediaLibrary({ items }: { items: MediaItem[] }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function copy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      setError('Copie impossible. Sélectionnez l’adresse manuellement.')
    }
  }

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
      router.refresh()
    } catch {
      setError('Téléversement impossible. Vérifiez votre connexion.')
    } finally {
      setUploading(false)
    }
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(`Supprimer « ${item.file_name} » ? Les pages qui l’utilisent afficheront une image manquante.`)) {
      return
    }

    const response = await fetch(`/api/admin/medias/${item.id}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string }
      setError(payload.error ?? 'Suppression impossible.')
      return
    }
    router.refresh()
  }

  return (
    <div>
      {error && (
        <Alert tone="error" className="mb-5">
          {error}
        </Alert>
      )}

      <div className="mb-6">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface">
          <Upload className="h-4 w-4" aria-hidden />
          {uploading ? 'Téléversement…' : 'Téléverser des images'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? [])
              for (const file of files) await upload(file)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <figure
            key={item.id}
            className="group overflow-hidden rounded-lg border border-line bg-surface"
          >
            <div className="aspect-[4/3] bg-surface">
              {item.public_url && (
                <img
                  src={item.public_url}
                  alt={item.alt ?? ''}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>

            <figcaption className="p-3">
              <p className="truncate text-xs font-medium text-fg" title={item.file_name}>
                {item.file_name}
              </p>
              <p className="mt-0.5 text-xs text-fg-subtle">
                {formatFileSize(item.file_size)} · {formatDate(item.created_at)}
              </p>

              <div className="mt-2.5 flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => item.public_url && copy(item.public_url, item.id)}
                >
                  {copied === item.id ? (
                    <Check className="h-3.5 w-3.5 text-primary-text" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {copied === item.id ? 'Copié' : 'Copier'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(item)}
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
