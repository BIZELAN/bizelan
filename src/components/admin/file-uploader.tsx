'use client'

import { useRef, useState } from 'react'
import { CircleAlert, Loader2, Upload, X } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { UPLOAD_TARGETS, type UploadTargetName } from '@/lib/uploads'
import { cn, formatFileSize } from '@/lib/utils'

/**
 * Dépôt de fichier, en direct vers le stockage.
 *
 * Le fichier ne passe PAS par l'application. Le serveur signe un jeton pour un
 * chemin précis, le navigateur envoie, et c'est tout. Sans cela, tout dépôt
 * restait sous la limite de corps de requête de l'hébergeur — quelques
 * mégaoctets — ce qui interdisait purement et simplement les vidéos de cours.
 *
 * Le jeton ne vaut que pour ce chemin et cette fois : l'obtenir ne donne aucun
 * droit d'écriture ailleurs, et la clé de service ne quitte jamais le serveur.
 */
export function FileUploader({
  target,
  onUploaded,
  label,
  help,
}: {
  target: UploadTargetName
  /** Reçoit le chemin dans le bucket, et l'URL publique si le bucket l'est. */
  onUploaded: (file: {
    path: string
    publicUrl: string | null
    fileName: string
    size: number
    mimeType: string
  }) => void
  label?: string
  help?: string
}) {
  const rules = UPLOAD_TARGETS[target]
  const input = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send(file: File) {
    setError(null)
    setBusy(true)
    setProgress('Préparation…')

    try {
      // 1. Le serveur vérifie les droits, décide du chemin et signe.
      const prepared = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      })

      const ticket = (await prepared.json()) as {
        bucket?: string
        path?: string
        token?: string
        publicUrl?: string | null
        error?: string
      }

      if (!prepared.ok || !ticket.path || !ticket.token || !ticket.bucket) {
        setError(ticket.error ?? 'Le dépôt n’a pas pu être préparé.')
        return
      }

      // 2. Le navigateur envoie directement au stockage.
      setProgress(`Envoi de ${formatFileSize(file.size)}…`)
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type || 'application/octet-stream',
        })

      if (uploadError) {
        // Le bucket porte sa propre limite : c'est elle qui refuse en dernier
        // ressort, et son message est plus exact que notre estimation.
        setError(uploadError.message || 'L’envoi a échoué.')
        return
      }

      onUploaded({
        path: ticket.path,
        publicUrl: ticket.publicUrl ?? null,
        fileName: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      })
      setProgress(null)
    } catch (cause) {
      console.error('[upload] échec :', cause)
      setError('L’envoi a été interrompu. Vérifiez votre connexion puis réessayez.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-sm font-medium text-fg">{label}</p>}

      <label
        className={cn(
          'flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md',
          'border-2 border-dashed border-line-control bg-canvas-subtle text-sm text-fg-subtle',
          'transition-colors duration-fast hover:border-primary-text hover:bg-primary-subtle hover:text-primary-text',
          busy && 'pointer-events-none opacity-60',
        )}
      >
        {busy ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span>{progress}</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5" aria-hidden />
            <span>Choisir un fichier</span>
            <span className="text-xs">
              {rules.label} · jusqu’à {Math.round(rules.maxBytes / 1024 / 1024)} Mo
            </span>
          </>
        )}

        <input
          ref={input}
          type="file"
          className="sr-only"
          accept={rules.mimeTypes?.join(',')}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void send(file)
          }}
        />
      </label>

      {help && <p className="mt-1.5 text-xs text-fg-subtle">{help}</p>}

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-danger">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto shrink-0"
            aria-label="Masquer l’erreur"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </p>
      )}
    </div>
  )
}
