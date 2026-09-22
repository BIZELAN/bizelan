'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'

/**
 * Champ image : téléversement direct ou collage d'une URL.
 * La valeur finale (URL) est envoyée dans un champ caché au nom demandé.
 */
export function ImageInput({
  name,
  defaultValue,
  label = 'Image',
}: {
  name: string
  defaultValue?: string | null
  label?: string
}) {
  const [url, setUrl] = useState(defaultValue ?? '')
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
      setUrl(payload.url)
    } catch {
      setError('Téléversement impossible. Vérifiez votre connexion.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />

      {url ? (
        <div className="relative inline-block">
          <img
            src={url}
            alt=""
            className="h-32 w-auto max-w-full rounded-md border border-line object-cover"
          />
          <button
            type="button"
            onClick={() => setUrl('')}
            className="absolute -right-2 -top-2 rounded-full bg-canvas p-1 text-primary-fg shadow-e1 transition-colors hover:bg-red-600"
            aria-label="Retirer l’image"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-32 w-full max-w-xs flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line-strong bg-canvas-subtle text-sm text-fg-subtle transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              Téléversement…
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6" aria-hidden />
              Choisir une {label.toLowerCase()}
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

      <div className="mt-2 flex items-center gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="…ou collez une URL d’image"
          className="text-xs"
        />
        {url && (
          <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            Changer
          </Button>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}
