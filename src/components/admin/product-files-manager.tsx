'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Eye, EyeOff, FileText, Loader2, Pencil, Save, Trash2, X } from 'lucide-react'

import {
  deleteProductFile,
  moveProductFile,
  registerProductFile,
  updateProductFile,
} from '@/app/actions/products'
import { FileUploader } from '@/components/admin/file-uploader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input } from '@/components/ui/field'
import { Alert, EmptyState } from '@/components/ui/misc'
import { DOCUMENT_KIND_LABELS, documentKind } from '@/lib/uploads'
import { formatFileSize } from '@/lib/utils'
import type { ProductFile } from '@/lib/types'

/**
 * Fichiers vendus avec un produit.
 *
 * Le fichier part DIRECTEMENT vers le stockage privé (jusqu'à 2 Go) : la page
 * ne fait que signer un jeton de dépôt, puis enregistre la ligne en base une
 * fois l'envoi terminé. Un fichier marqué « extrait » est téléchargeable par
 * tous depuis la fiche produit — c'est l'échantillon qui fait vendre.
 */
export function ProductFilesManager({
  productId,
  files,
  downloadsByFile,
}: {
  productId: string
  files: ProductFile[]
  downloadsByFile: Record<string, number>
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [busy, startTransition] = useTransition()
  const [editing, setEditing] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')

  function run(task: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await task()
      if (result.message) setFeedback({ ok: result.ok, message: result.message })
      if (result.ok) router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <Alert tone={feedback.ok ? 'success' : 'error'}>{feedback.message}</Alert>
      )}

      <div className="rounded-md border border-line bg-canvas-subtle/60 p-4">
        <p className="mb-3 text-sm font-semibold text-fg">Ajouter un fichier</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre affiché" help="Laissez vide pour reprendre le nom du fichier.">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Guide complet (PDF)" />
          </Field>
          <Field label="Précision" help="Facultatif : « Version 2026 », « Chapitre 3 »…">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <Checkbox
          className="mt-3"
          checked={isPreview}
          onChange={(e) => setIsPreview(e.target.checked)}
          label="Extrait offert — téléchargeable sans achat depuis la fiche produit"
        />
        <div className="mt-4">
          <FileUploader
            target="product"
            help="PDF, EPUB, Word, Excel, PowerPoint, ZIP, MP4, MP3… jusqu’à 2 Go. Le fichier reste privé."
            onUploaded={(file) =>
              run(async () => {
                const result = await registerProductFile({
                  productId,
                  title: title.trim() || file.fileName.replace(/\.[^.]+$/, ''),
                  description: description.trim() || null,
                  storagePath: file.path,
                  fileName: file.fileName,
                  fileSize: file.size,
                  mimeType: file.mimeType,
                  isPreview,
                })
                if (result.ok) {
                  setTitle('')
                  setDescription('')
                  setIsPreview(false)
                }
                return result
              })
            }
          />
        </div>
      </div>

      {files.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun fichier"
          description="Ajoutez au moins un fichier avant de publier : c’est ce que reçoit l’acheteur."
        />
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {files.map((file, index) => {
            const kind = documentKind(file.mime_type, file.file_name)
            const downloads = downloadsByFile[file.id] ?? 0
            return (
              <li key={file.id} className="flex flex-wrap items-center gap-3 p-3.5">
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => run(() => moveProductFile(file.id, productId, 'up'))}
                    className="rounded-sm p-1 text-fg-subtle hover:text-fg disabled:opacity-30"
                    aria-label="Monter"
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === files.length - 1}
                    onClick={() => run(() => moveProductFile(file.id, productId, 'down'))}
                    className="rounded-sm p-1 text-fg-subtle hover:text-fg disabled:opacity-30"
                    aria-label="Descendre"
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  {editing === file.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        aria-label="Titre du fichier"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          run(() => updateProductFile(file.id, productId, { title: draftTitle }))
                          setEditing(null)
                        }}
                        aria-label="Enregistrer le titre"
                      >
                        <Save className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(null)}
                        aria-label="Annuler"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  ) : (
                    <p className="flex flex-wrap items-center gap-2 font-medium text-fg">
                      {file.title}
                      {file.is_preview && <Badge tone="accent">Extrait offert</Badge>}
                    </p>
                  )}
                  <p className="mt-0.5 truncate text-xs text-fg-subtle">
                    {[
                      file.file_name,
                      DOCUMENT_KIND_LABELS[kind],
                      formatFileSize(file.file_size),
                      `${downloads} téléchargement${downloads > 1 ? 's' : ''}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setEditing(file.id)
                      setDraftTitle(file.title)
                    }}
                    aria-label="Renommer"
                    title="Renommer"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run(() => updateProductFile(file.id, productId, { isPreview: !file.is_preview }))
                    }
                    aria-label={file.is_preview ? 'Retirer des extraits offerts' : 'Proposer en extrait offert'}
                    title={file.is_preview ? 'Retirer des extraits offerts' : 'Proposer en extrait offert'}
                  >
                    {file.is_preview ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`Supprimer « ${file.title} » ? Les acheteurs n’y auront plus accès.`)) return
                      run(() => deleteProductFile(file.id, productId))
                    }}
                    aria-label="Supprimer le fichier"
                    title="Supprimer"
                    className="text-danger hover:bg-danger-subtle hover:text-danger"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
