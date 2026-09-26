'use client'

import { useState } from 'react'
import {
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
  X,
} from 'lucide-react'

import { documentKind, isReadableInline, type DocumentKind } from '@/lib/uploads'
import { cn, formatFileSize } from '@/lib/utils'
import type { Resource } from '@/lib/types'

/**
 * Supports d'une leçon : lecture dans la page quand c'est possible,
 * téléchargement sinon.
 *
 * Les fichiers vivent dans un bucket privé. On demande au serveur une URL
 * signée de courte durée, qui n'est produite qu'après vérification de
 * l'inscription : un lien partagé cesse de fonctionner en quelques minutes.
 *
 * Seul le PDF s'affiche dans la page, et c'est une limite du NAVIGATEUR, pas
 * un choix de confort. Word, Excel et PowerPoint ne se rendent pas nativement ;
 * les afficher demanderait soit une conversion, soit un service tiers auquel il
 * faudrait exposer le fichier publiquement — ce qui viderait de son sens le
 * bucket privé. Ils se téléchargent donc, et l'interface le dit au lieu de
 * présenter un cadre vide.
 */

const ICONS: Record<DocumentKind, typeof FileText> = {
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  slides: Presentation,
  archive: FileArchive,
  other: FileText,
}

const LABELS: Record<DocumentKind, string> = {
  pdf: 'PDF',
  word: 'Document Word',
  excel: 'Tableur',
  slides: 'Présentation',
  archive: 'Archive',
  other: 'Fichier',
}

export function ResourceList({ resources }: { resources: Resource[] }) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState<{ id: string; title: string; url: string } | null>(null)

  /** Demande l'URL signée. `null` si le serveur refuse. */
  async function signedUrl(resourceId: string): Promise<string | null> {
    setBusyId(resourceId)
    setError(null)
    try {
      const response = await fetch(`/api/ressources/${resourceId}`)
      const payload = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !payload.url) {
        setError(payload.error ?? 'Accès au fichier impossible.')
        return null
      }
      return payload.url
    } catch {
      setError('Accès impossible. Vérifiez votre connexion.')
      return null
    } finally {
      setBusyId(null)
    }
  }

  if (!resources.length) return null

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <ul className="divide-y divide-line">
        {resources.map((resource) => {
          const kind = documentKind(resource.mime_type, resource.file_name)
          const Icon = ICONS[kind]
          const busy = busyId === resource.id
          const readable = isReadableInline(kind)

          return (
            <li key={resource.id} className="py-3">
              <div className="flex items-center gap-3.5">
                <Icon className="h-5 w-5 shrink-0 text-primary-text" aria-hidden />

                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-medium text-fg">{resource.title}</p>
                  <p className="text-xs text-fg-subtle">
                    {[
                      resource.description,
                      LABELS[kind],
                      resource.file_size ? formatFileSize(resource.file_size) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                {readable && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const url = await signedUrl(resource.id)
                      if (url) setReading({ id: resource.id, title: resource.title, url })
                    }}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium',
                      'text-primary-text transition-colors duration-fast hover:bg-primary-subtle',
                      'disabled:opacity-60',
                    )}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                    Lire
                  </button>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const url = await signedUrl(resource.id)
                    if (url) window.location.href = url
                  }}
                  aria-label={`Télécharger ${resource.title}`}
                  className={cn(
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
                    'text-fg-subtle transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg',
                    'disabled:opacity-60',
                  )}
                >
                  {busy && !readable ? (
                    <Loader2 className="h-[1.125rem] w-[1.125rem] animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                  )}
                </button>
              </div>

              {/* Le lecteur se déplie sous la ligne plutôt que dans une fenêtre
                  superposée : on garde la leçon sous les yeux, et sur mobile un
                  document en plein écran ferait perdre le fil. */}
              {reading?.id === resource.id && (
                <div className="mt-3 overflow-hidden rounded-md border border-line bg-canvas">
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
                    <p className="min-w-0 truncate text-sm font-medium text-fg">{reading.title}</p>
                    <button
                      type="button"
                      onClick={() => setReading(null)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg"
                      aria-label="Fermer le document"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  {/* L'URL est signée et expire : le cadre ne sert que pendant
                      la séance, et un lien recopié depuis l'inspecteur ne
                      fonctionnera plus au bout de quelques minutes. */}
                  <iframe
                    src={reading.url}
                    title={reading.title}
                    className="h-[70vh] w-full border-0 bg-canvas-subtle"
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
