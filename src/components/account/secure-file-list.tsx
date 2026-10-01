'use client'

import { useState } from 'react'
import {
  BookOpen,
  Download,
  Eye,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Loader2,
  Play,
  Presentation,
  X,
} from 'lucide-react'

import {
  DOCUMENT_KIND_LABELS,
  documentKind,
  isPlayableInline,
  isReadableInline,
  type DocumentKind,
} from '@/lib/uploads'
import { cn, formatFileSize } from '@/lib/utils'

/**
 * Liste de fichiers privés : supports de cours ou fichiers d'un produit acheté.
 *
 * Les fichiers vivent dans un bucket privé. Chaque action demande au serveur
 * une URL signée de courte durée, produite seulement après vérification du
 * droit d'accès — un lien recopié cesse de fonctionner en quelques minutes.
 *
 * Ce qui se lit dans la page s'y lit : PDF dans un cadre, vidéo et audio dans
 * le lecteur natif. Word, Excel et PowerPoint n'ont pas de rendu fiable dans
 * un navigateur sans exposer le fichier à un service tiers ; ils se
 * téléchargent, et l'interface le dit au lieu d'afficher un cadre vide.
 */

export interface SecureFile {
  id: string
  title: string
  description?: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
}

const ICONS: Record<DocumentKind, typeof FileText> = {
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  slides: Presentation,
  archive: FileArchive,
  ebook: BookOpen,
  video: FileVideo,
  audio: FileAudio,
  image: FileImage,
  other: FileText,
}

export function SecureFileList({
  files,
  endpoint,
  emptyLabel,
}: {
  files: SecureFile[]
  /** Route qui signe : `${endpoint}/${id}` doit répondre `{ url }`. */
  endpoint: string
  emptyLabel?: string
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<{ id: string; url: string; kind: DocumentKind } | null>(null)

  async function signedUrl(fileId: string, mode: 'view' | 'download'): Promise<string | null> {
    setBusyId(fileId)
    setError(null)
    try {
      const response = await fetch(`${endpoint}/${fileId}?mode=${mode}`, { cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !payload.url) {
        setError(payload.error ?? 'Accès au fichier impossible.')
        return null
      }
      return payload.url
    } catch {
      setError('Accès impossible. Vérifiez votre connexion puis réessayez.')
      return null
    } finally {
      setBusyId(null)
    }
  }

  if (!files.length) {
    return emptyLabel ? <p className="text-sm text-fg-subtle">{emptyLabel}</p> : null
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="divide-y divide-line">
        {files.map((file) => {
          const kind = documentKind(file.mime_type, file.file_name)
          const Icon = ICONS[kind]
          const busy = busyId === file.id
          const viewable = isReadableInline(kind) || isPlayableInline(kind)
          const isOpen = open?.id === file.id

          return (
            <li key={file.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3.5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary-text">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-medium text-fg">{file.title}</p>
                  <p className="truncate text-xs text-fg-subtle">
                    {[
                      file.description,
                      DOCUMENT_KIND_LABELS[kind],
                      file.file_size ? formatFileSize(file.file_size) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                {viewable && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (isOpen) {
                        setOpen(null)
                        return
                      }
                      const url = await signedUrl(file.id, 'view')
                      if (url) setOpen({ id: file.id, url, kind })
                    }}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium',
                      'text-primary-text transition-colors duration-fast hover:bg-primary-subtle',
                      'disabled:opacity-60',
                    )}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : isPlayableInline(kind) ? (
                      <Play className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                    <span className="hidden sm:inline">
                      {isOpen ? 'Fermer' : isPlayableInline(kind) ? 'Lire' : 'Ouvrir'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const url = await signedUrl(file.id, 'download')
                    if (url) window.location.href = url
                  }}
                  aria-label={`Télécharger ${file.title}`}
                  title="Télécharger"
                  className={cn(
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
                    'text-fg-subtle transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg',
                    'disabled:opacity-60',
                  )}
                >
                  {busy && !viewable ? (
                    <Loader2 className="h-[1.125rem] w-[1.125rem] animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                  )}
                </button>
              </div>

              {/* Le lecteur se déplie sous la ligne plutôt que dans une fenêtre
                  superposée : on garde le contexte sous les yeux, et sur mobile
                  un plein écran ferait perdre le fil. */}
              {isOpen && open && (
                <div className="mt-3 overflow-hidden rounded-md border border-line bg-canvas">
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
                    <p className="min-w-0 truncate text-sm font-medium text-fg">{file.title}</p>
                    <button
                      type="button"
                      onClick={() => setOpen(null)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg"
                      aria-label="Fermer"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>

                  {open.kind === 'video' ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                      src={open.url}
                      controls
                      controlsList="nodownload"
                      playsInline
                      autoPlay
                      className="aspect-video w-full bg-black"
                    />
                  ) : open.kind === 'audio' ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <audio src={open.url} controls autoPlay className="w-full p-4" />
                  ) : (
                    <iframe
                      src={open.url}
                      title={file.title}
                      className="h-[70vh] w-full border-0 bg-canvas-subtle"
                    />
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
