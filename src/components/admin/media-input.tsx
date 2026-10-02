'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Film, ImagePlus, Images, Loader2, Music, Search, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/field'
import { ACCEPT_ATTR, isVideoUrl, mediaKind, type MediaAccept } from '@/lib/media'
import { describeUploadError, uploadToLibrary } from '@/lib/media-upload'
import { cn, formatFileSize } from '@/lib/utils'
import type { MediaItem } from '@/lib/types'

const ACCEPT_WORDING: Record<MediaAccept, { choose: string; paste: string }> = {
  image: { choose: 'Choisir une image', paste: '…ou collez l’adresse d’une image' },
  media: { choose: 'Choisir une image ou une vidéo', paste: '…ou collez l’adresse d’une image ou d’une vidéo' },
  any: { choose: 'Choisir un fichier', paste: '…ou collez l’adresse d’un fichier' },
}

function accepts(accept: MediaAccept, file: { type: string; name: string }): boolean {
  if (accept === 'any') return true
  const kind = mediaKind(file.type, file.name)
  return accept === 'image' ? kind === 'image' : kind === 'image' || kind === 'video'
}

/**
 * Champ média contrôlé : image, vidéo, ou tout fichier selon `accept`.
 *
 * Trois façons de le remplir : téléverser (bouton ou glisser-déposer),
 * reprendre un fichier de la médiathèque, ou coller une adresse. Le dépôt va
 * directement au stockage et inscrit le fichier dans la médiathèque.
 */
export function MediaField({
  value,
  onChange,
  accept = 'media',
  height = 'h-32',
}: {
  value: string
  onChange: (url: string) => void
  accept?: MediaAccept
  height?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [library, setLibrary] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wording = ACCEPT_WORDING[accept]

  const upload = useCallback(
    async (file: File) => {
      if (!accepts(accept, file)) {
        setError(accept === 'image' ? 'Ce champ attend une image.' : 'Ce champ attend une image ou une vidéo.')
        return
      }
      setUploading(true)
      setError(null)
      try {
        const { url } = await uploadToLibrary(file)
        onChange(url)
      } catch (cause) {
        setError(describeUploadError(cause))
      } finally {
        setUploading(false)
      }
    },
    [accept, onChange],
  )

  const isVideo = isVideoUrl(value)

  return (
    <div className="min-w-0">
      {value ? (
        <div className="relative inline-block max-w-full">
          {isVideo ? (
            <video
              src={value}
              className={cn(height, 'w-auto max-w-full rounded-md border border-line bg-canvas object-cover')}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
            />
          ) : mediaKind(null, value) === 'image' || accept !== 'any' ? (
            <img
              src={value}
              alt=""
              className={cn(height, 'w-auto max-w-full rounded-md border border-line object-cover')}
            />
          ) : (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md border border-line bg-canvas-subtle px-3 py-2 text-sm text-fg"
            >
              <FileText className="h-4 w-4 text-primary-text" aria-hidden />
              <span className="max-w-[16rem] truncate">{decodeURIComponent(value.split('/').pop() ?? value)}</span>
            </a>
          )}
          {isVideo && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-canvas/80 px-1.5 py-0.5 text-[0.6875rem] font-medium text-fg backdrop-blur">
              <Film className="h-3 w-3" aria-hidden /> Vidéo
            </span>
          )}
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -right-2 -top-2 rounded-full bg-danger p-1 text-danger-fg shadow-e1 transition-opacity hover:opacity-90"
            aria-label="Retirer"
            title="Retirer"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) void upload(file)
          }}
          className={cn(
            height,
            'flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 text-center text-sm transition-colors',
            dragging
              ? 'border-primary-text bg-primary-subtle text-primary-text'
              : 'border-line-strong bg-canvas-subtle text-fg-subtle',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-primary-text" aria-hidden />
              <span>Téléversement en cours…</span>
            </>
          ) : (
            <>
              {accept === 'image' ? (
                <ImagePlus className="h-6 w-6" aria-hidden />
              ) : (
                <span className="flex gap-1.5">
                  <ImagePlus className="h-5 w-5" aria-hidden />
                  {accept === 'media' ? <Film className="h-5 w-5" aria-hidden /> : <Music className="h-5 w-5" aria-hidden />}
                </span>
              )}
              <span className="hidden sm:block">Glissez un fichier ici, ou</span>
              <div className="flex flex-wrap justify-center gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Téléverser
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setLibrary(true)}>
                  <Images className="h-3.5 w-3.5" aria-hidden />
                  Médiathèque
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR[accept]}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />

      <div className="mt-2 flex max-w-md items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder={wording.paste}
          aria-label={wording.paste}
          className="text-xs"
        />
        {value && (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : 'Changer'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLibrary(true)} aria-label="Médiathèque">
              <Images className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}

      <MediaPickerDialog
        open={library}
        onOpenChange={setLibrary}
        accept={accept}
        onPick={(item) => {
          if (item.public_url) onChange(item.public_url)
          setLibrary(false)
        }}
      />
    </div>
  )
}

/**
 * Version formulaire : la valeur part dans un champ caché nommé, pour les
 * formulaires envoyés en Server Action.
 */
export function MediaInput({
  name,
  defaultValue,
  accept = 'media',
}: {
  name: string
  defaultValue?: string | null
  accept?: MediaAccept
}) {
  const [url, setUrl] = useState(defaultValue ?? '')
  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <MediaField value={url} onChange={setUrl} accept={accept} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sélecteur dans la médiathèque                                       */
/* ------------------------------------------------------------------ */

export function MediaPickerDialog({
  open,
  onOpenChange,
  accept,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  accept: MediaAccept
  onPick: (item: MediaItem) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <PickerBody accept={accept} onPick={onPick} />}
    </Dialog>
  )
}

function PickerBody({ accept, onPick }: { accept: MediaAccept; onPick: (item: MediaItem) => void }) {
  const [items, setItems] = useState<MediaItem[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const type = accept === 'any' ? 'all' : accept

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/medias?type=${type}&q=${encodeURIComponent(query)}`)
        const payload = (await response.json()) as { items?: MediaItem[]; error?: string }
        if (cancelled) return
        if (!response.ok) setError(payload.error ?? 'Lecture impossible.')
        else setItems(payload.items ?? [])
      } catch {
        if (!cancelled) setError('Médiathèque injoignable. Vérifiez votre connexion.')
      }
    }, query ? 250 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [type, query])

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const { item } = await uploadToLibrary(file)
      if (item) onPick(item)
    } catch (cause) {
      setError(describeUploadError(cause))
    } finally {
      setUploading(false)
    }
  }

  return (
    <DialogContent
      title="Médiathèque"
      description={
        accept === 'image'
          ? 'Choisissez une image déjà téléversée, ou ajoutez-en une.'
          : accept === 'media'
            ? 'Choisissez une image ou une vidéo déjà téléversée, ou ajoutez-en une.'
            : 'Choisissez un fichier déjà téléversé, ou ajoutez-en un.'
      }
      size="xl"
      className="flex max-h-[92dvh] flex-col [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-1 [&>div:last-child]:flex-col"
    >
      <div className="flex shrink-0 flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher par nom de fichier…"
            className="pl-9"
            aria-label="Chercher dans la médiathèque"
          />
        </div>
        <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
          {uploading ? 'Téléversement…' : 'Téléverser'}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR[accept]}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
      </div>

      {error && <p className="mt-2 shrink-0 text-sm text-danger">{error}</p>}

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {items === null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-fg-subtle">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-fg-subtle">
            {query ? `Aucun fichier pour « ${query} ».` : 'La médiathèque est vide pour ce type de fichier.'}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  className="group block w-full overflow-hidden rounded-md border border-line bg-surface text-left transition-colors hover:border-primary-text focus-visible:border-primary-text"
                >
                  <MediaThumb item={item} />
                  <span className="block truncate px-2 py-1.5 text-xs text-fg" title={item.file_name}>
                    {item.file_name}
                  </span>
                  <span className="block px-2 pb-1.5 text-[0.6875rem] text-fg-subtle">{formatFileSize(item.file_size)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DialogContent>
  )
}

/** Vignette d'un fichier de la médiathèque, quelle que soit sa nature. */
export function MediaThumb({ item, className }: { item: MediaItem; className?: string }) {
  const kind = mediaKind(item.mime_type, item.file_name)
  const Icon = kind === 'audio' ? Music : kind === 'video' ? Film : FileText
  return (
    <span className={cn('relative block aspect-[4/3] bg-canvas-subtle', className)}>
      {kind === 'image' && item.public_url ? (
        <img src={item.public_url} alt={item.alt ?? ''} loading="lazy" className="h-full w-full object-cover" />
      ) : kind === 'video' && item.public_url ? (
        item.poster_url ? (
          <img src={item.poster_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <video src={`${item.public_url}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        )
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-fg-subtle">
          <Icon className="h-8 w-8" aria-hidden />
          <span className="text-[0.6875rem] font-semibold uppercase">
            {item.file_name.split('.').pop()?.slice(0, 5)}
          </span>
        </span>
      )}
      {kind === 'video' && (
        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-canvas/85 px-1.5 py-0.5 text-[0.625rem] font-semibold text-fg">
          <Film className="h-3 w-3" aria-hidden /> Vidéo
        </span>
      )}
    </span>
  )
}
