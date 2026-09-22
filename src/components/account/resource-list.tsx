'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import type { Resource } from '@/lib/types'
import { formatFileSize } from '@/lib/utils'

function iconFor(mime: string | null) {
  if (!mime) return FileText
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet
  return FileText
}

/**
 * Les fichiers sont dans un bucket privé : on demande au serveur une URL
 * signée de courte durée, qui n'est générée que si l'accès est vérifié.
 */
export function ResourceList({ resources }: { resources: Resource[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download(resourceId: string) {
    setLoadingId(resourceId)
    setError(null)
    try {
      const response = await fetch(`/api/ressources/${resourceId}`)
      const payload = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !payload.url) {
        setError(payload.error ?? 'Téléchargement impossible.')
        return
      }
      window.location.href = payload.url
    } catch {
      setError('Téléchargement impossible. Vérifiez votre connexion.')
    } finally {
      setLoadingId(null)
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
          const Icon = iconFor(resource.mime_type)
          const busy = loadingId === resource.id
          return (
            <li key={resource.id}>
              <button
                type="button"
                onClick={() => download(resource.id)}
                disabled={busy}
                className="flex w-full items-center gap-3.5 py-3 text-left transition-colors hover:text-primary-hover disabled:opacity-60"
              >
                <Icon className="h-5 w-5 shrink-0 text-primary-text" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-medium text-fg">
                    {resource.title}
                  </span>
                  {(resource.description || resource.file_size) && (
                    <span className="block text-xs text-fg-subtle">
                      {resource.description}
                      {resource.description && resource.file_size ? ' · ' : ''}
                      {resource.file_size ? formatFileSize(resource.file_size) : ''}
                    </span>
                  )}
                </span>
                {busy ? (
                  <Loader2 className="h-[1.125rem] w-[1.125rem] shrink-0 animate-spin text-fg-subtle" aria-hidden />
                ) : (
                  <Download className="h-[1.125rem] w-[1.125rem] shrink-0 text-fg-subtle" aria-hidden />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
