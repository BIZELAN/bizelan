'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, Film, Loader2, Pencil, Search, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { MediaField, MediaThumb } from '@/components/admin/media-input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { mediaKind, type MediaKind } from '@/lib/media'
import { describeUploadError, uploadToLibrary } from '@/lib/media-upload'
import { cn, formatDate, formatFileSize } from '@/lib/utils'
import type { MediaItem } from '@/lib/types'

const FILTERS: { value: 'all' | MediaKind; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Vidéos' },
  { value: 'document', label: 'Documents' },
  { value: 'audio', label: 'Audio' },
  { value: 'other', label: 'Autres' },
]

/**
 * Médiathèque : tous les fichiers publics du site.
 *
 * Images, vidéos, PDF, documents, audio, archives — sans restriction de
 * format. Chaque fichier a une adresse publique à copier, réutilisable dans
 * n'importe quel champ ou bloc. Les vidéos peuvent recevoir une miniature.
 */
export function MediaLibrary({ items }: { items: MediaItem[] }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [queue, setQueue] = useState<{ name: string; done: boolean; error?: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | MediaKind>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<MediaItem | null>(null)
  const [dragging, setDragging] = useState(false)
  const router = useRouter()

  const uploading = queue.some((q) => !q.done)

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      const kind = mediaKind(item.mime_type, item.file_name)
      map.set(kind, (map.get(kind) ?? 0) + 1)
    }
    return map
  }, [items])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(
      (item) =>
        (filter === 'all' || mediaKind(item.mime_type, item.file_name) === filter) &&
        (!q || item.file_name.toLowerCase().includes(q)),
    )
  }, [items, filter, query])

  async function copy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      setError('Copie impossible. Sélectionnez l’adresse manuellement.')
    }
  }

  async function uploadAll(files: File[]) {
    if (!files.length) return
    setError(null)
    setQueue(files.map((f) => ({ name: f.name, done: false })))
    // L'un après l'autre : vingt envois simultanés saturent une connexion
    // mobile et échouent tous, au lieu de réussir un par un.
    for (let i = 0; i < files.length; i++) {
      try {
        await uploadToLibrary(files[i])
        setQueue((prev) => prev.map((q, j) => (j === i ? { ...q, done: true } : q)))
      } catch (cause) {
        setQueue((prev) => prev.map((q, j) => (j === i ? { ...q, done: true, error: describeUploadError(cause) } : q)))
      }
    }
    router.refresh()
  }

  async function remove(item: MediaItem) {
    if (
      !window.confirm(
        `Supprimer « ${item.file_name} » ? Les pages qui l’utilisent afficheront un fichier manquant.`,
      )
    ) {
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

  const failed = queue.filter((q) => q.error)

  return (
    <div>
      {error && (
        <Alert tone="error" className="mb-5">
          {error}
        </Alert>
      )}

      {/* Zone de dépôt : bouton ou glisser-déposer, plusieurs fichiers à la fois. */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void uploadAll(Array.from(e.dataTransfer.files ?? []))
        }}
        className={cn(
          'mb-6 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragging ? 'border-primary-text bg-primary-subtle' : 'border-line-strong bg-canvas-subtle',
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-primary-text" aria-hidden />
            <p className="text-sm font-medium text-fg">
              Téléversement {queue.filter((q) => q.done).length + 1} sur {queue.length}…
            </p>
            <p className="max-w-md truncate text-xs text-fg-subtle">
              {queue.find((q) => !q.done)?.name}
            </p>
          </>
        ) : (
          <>
            <Upload className="h-7 w-7 text-fg-subtle" aria-hidden />
            <p className="text-sm text-fg-muted">
              Glissez vos fichiers ici — images, vidéos, PDF, documents, audio, archives (jusqu’à 2 Go).
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
              <Upload className="h-4 w-4" aria-hidden />
              Choisir des fichiers
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  void uploadAll(Array.from(e.target.files ?? []))
                  e.target.value = ''
                }}
              />
            </label>
          </>
        )}
      </div>

      {!uploading && failed.length > 0 && (
        <Alert tone="error" className="mb-5" title="Certains fichiers n’ont pas été envoyés">
          <ul className="list-disc pl-5">
            {failed.map((f) => (
              <li key={f.name}>
                {f.name} — {f.error}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Filtres */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Type de fichier">
          {FILTERS.filter((f) => f.value === 'all' || counts.get(f.value)).map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.value
                  ? 'border-primary-text bg-primary-subtle text-primary-text'
                  : 'border-line text-fg-muted hover:bg-canvas-subtle hover:text-fg',
              )}
            >
              {f.label}
              <span className="ml-1 opacity-70">{f.value === 'all' ? items.length : counts.get(f.value)}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un fichier…"
            className="pl-9"
            aria-label="Chercher un fichier"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-fg-subtle">Aucun fichier ne correspond.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((item) => {
            const kind = mediaKind(item.mime_type, item.file_name)
            return (
              <figure key={item.id} className="group overflow-hidden rounded-lg border border-line bg-surface">
                <a href={item.public_url ?? '#'} target="_blank" rel="noreferrer" className="block" title="Ouvrir">
                  <MediaThumb item={item} />
                </a>

                <figcaption className="p-3">
                  <p className="truncate text-xs font-medium text-fg" title={item.file_name}>
                    {item.file_name}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    {formatFileSize(item.file_size)} · {formatDate(item.created_at)}
                  </p>

                  <div className="mt-2.5 flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 px-2"
                      onClick={() => item.public_url && copy(item.public_url, item.id)}
                    >
                      {copied === item.id ? (
                        <Check className="h-3.5 w-3.5 text-primary-text" aria-hidden />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {copied === item.id ? 'Copié' : 'Lien'}
                    </Button>
                    {(kind === 'video' || kind === 'image') && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(item)}
                        aria-label="Modifier"
                        title={kind === 'video' ? 'Miniature et description' : 'Description'}
                      >
                        {kind === 'video' ? <Film className="h-3.5 w-3.5" aria-hidden /> : <Pencil className="h-3.5 w-3.5" aria-hidden />}
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(item)} aria-label="Supprimer" title="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </figcaption>
              </figure>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <EditMedia
            item={editing}
            onDone={() => {
              setEditing(null)
              router.refresh()
            }}
          />
        )}
      </Dialog>
    </div>
  )
}

/** Description (texte alternatif) et, pour une vidéo, miniature. */
function EditMedia({ item, onDone }: { item: MediaItem; onDone: () => void }) {
  const isVideo = mediaKind(item.mime_type, item.file_name) === 'video'
  const [alt, setAlt] = useState(item.alt ?? '')
  const [poster, setPoster] = useState(item.poster_url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    const response = await fetch(`/api/admin/medias/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isVideo ? { alt, poster_url: poster } : { alt }),
    })
    setSaving(false)
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string }
      setError(payload.error ?? 'Enregistrement impossible.')
      return
    }
    onDone()
  }

  return (
    <DialogContent title={item.file_name} size="lg">
      <div className="space-y-5">
        {isVideo && item.public_url && (
          <video
            src={item.public_url}
            poster={poster || undefined}
            controls
            preload="metadata"
            className="aspect-video w-full rounded-md bg-canvas"
          />
        )}

        {isVideo && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-fg">Miniature</p>
            <p className="mb-2 text-xs text-fg-subtle">
              Image affichée avant la lecture. Sans miniature, c’est la première image de la vidéo.
            </p>
            <MediaField value={poster} onChange={setPoster} accept="image" height="h-28" />
          </div>
        )}

        <div>
          <label htmlFor="media-alt" className="mb-1.5 block text-sm font-medium text-fg">
            Description
          </label>
          <Input
            id="media-alt"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Ce que montre le fichier, pour les lecteurs d’écran et le référencement"
          />
        </div>

        {item.public_url && (
          <a
            href={item.public_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary-text hover:underline"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Ouvrir le fichier
          </a>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <DialogFooter className="-mx-5 -mb-5 mt-5">
        <Button type="button" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
