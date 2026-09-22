'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Upload } from 'lucide-react'

import { deleteResource } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Alert, EmptyState } from '@/components/ui/misc'
import { DeleteButton } from '@/components/admin/form-bits'
import { formatFileSize } from '@/lib/utils'
import type { Resource } from '@/lib/types'

export function ResourceManager({
  courseId,
  resources,
}: {
  courseId: string
  resources: Resource[]
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const body = new FormData()
      body.set('file', file)
      body.set('bucket', 'resources')

      const uploadResponse = await fetch('/api/admin/upload', { method: 'POST', body })
      const uploaded = (await uploadResponse.json()) as {
        path?: string
        error?: string
        size?: number
        mimeType?: string
      }

      if (!uploadResponse.ok || !uploaded.path) {
        setError(uploaded.error ?? 'Téléversement impossible.')
        return
      }

      const registerResponse = await fetch('/api/admin/ressources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: title || file.name,
          description: description || null,
          storagePath: uploaded.path,
          fileName: file.name,
          fileSize: uploaded.size ?? file.size,
          mimeType: uploaded.mimeType ?? file.type,
          position: resources.length,
        }),
      })

      if (!registerResponse.ok) {
        const payload = (await registerResponse.json()) as { error?: string }
        setError(payload.error ?? 'Enregistrement impossible.')
        return
      }

      setTitle('')
      setDescription('')
      setSuccess('Support ajouté.')
      startTransition(() => router.refresh())
    } catch {
      setError('Téléversement impossible. Vérifiez votre connexion.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-5 text-lg font-semibold">Ajouter un support</h2>

        {error && <Alert tone="error" className="mb-4">{error}</Alert>}
        {success && <Alert tone="success" className="mb-4">{success}</Alert>}

        <div className="space-y-4">
          <Field label="Nom affiché au client" help="Si vide, le nom du fichier sera utilisé.">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Plan financier — tableur Excel"
            />
          </Field>

          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="À remplir après le module 2"
            />
          </Field>

          <Button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            variant="outline"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="h-4 w-4" aria-hidden />
            )}
            {uploading ? 'Téléversement…' : 'Choisir un fichier'}
          </Button>

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleUpload(file)
              e.target.value = ''
            }}
          />

          <p className="text-xs text-fg-subtle">
            Formats acceptés : Excel, Word, PowerPoint, PDF, ZIP… — 100 Mo maximum par fichier.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Supports en ligne ({resources.length})
        </h2>

        {resources.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun support"
            description="Ajoutez les tableurs et modèles que vos clients pourront télécharger."
          />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {resources.map((resource) => (
              <li key={resource.id} className="flex items-center gap-4 px-5 py-4">
                <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg">{resource.title}</p>
                  <p className="text-xs text-fg-subtle">
                    {resource.file_name}
                    {resource.file_size ? ` · ${formatFileSize(resource.file_size)}` : ''}
                  </p>
                </div>
                <DeleteButton
                  action={deleteResource.bind(null, resource.id, courseId)}
                  label=""
                  variant="ghost"
                  confirmText={`Supprimer « ${resource.title} » ? Le fichier sera effacé définitivement.`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
