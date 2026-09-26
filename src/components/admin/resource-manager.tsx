'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'

import { deleteResource } from '@/app/actions/admin'
import { FileUploader } from '@/components/admin/file-uploader'
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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  /**
   * Enregistre un fichier DEJA depose.
   *
   * Le televersement ne passe plus par l'application : `FileUploader` obtient
   * une URL signee et envoie en direct au stockage. L'ancienne voie relayait
   * tout le contenu par une route serveur, ce qui plafonnait a la limite de
   * corps de requete de l'hebergeur — la promesse « jusqu'a 100 Mo » ne tenait
   * qu'en developpement local.
   */
  async function register(file: {
    path: string
    fileName: string
    size: number
    mimeType: string
  }) {
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/ressources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: title || file.fileName,
          description: description || null,
          storagePath: file.path,
          fileName: file.fileName,
          fileSize: file.size,
          mimeType: file.mimeType,
          position: resources.length,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        setError(payload.error ?? 'Enregistrement impossible.')
        return
      }

      setTitle('')
      setDescription('')
      setSuccess('Support ajouté.')
      startTransition(() => router.refresh())
    } catch {
      setError('Enregistrement impossible. Vérifiez votre connexion.')
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

          <FileUploader
            target="document"
            label="Fichier"
            help="PDF, Word, Excel, PowerPoint, OpenDocument, CSV ou archive. Le fichier part directement vers l’espace privé : il n’est jamais servi publiquement."
            onUploaded={register}
          />

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
                <FileText className="h-5 w-5 shrink-0 text-primary-text" aria-hidden />
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
