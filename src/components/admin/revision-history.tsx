'use client'

import { useState, useTransition } from 'react'
import { Eye, History, RotateCcw } from 'lucide-react'

import { restoreRevision } from '@/app/actions/admin'
import { BlockPreview } from '@/components/admin/block-preview'
import { FormSection } from '@/components/admin/shell'
import { Button } from '@/components/ui/button'
import { Alert, EmptyState } from '@/components/ui/misc'
import { parseBlocks } from '@/lib/blocks'
import { cn } from '@/lib/utils'
import type { BlockData } from '@/components/public/blocks/block-renderer'
import type { Revision } from '@/lib/revisions'

/**
 * Historique et retour arrière.
 *
 * Chaque enregistrement conserve l'état PRÉCÉDENT : la liste ci-dessous est
 * donc celle des états successivement remplacés, du plus récent au plus
 * ancien. L'état actuellement en ligne n'y figure pas — c'est celui qu'on a
 * sous les yeux dans le formulaire.
 *
 * Une version se REGARDE avant d'être rétablie. Restaurer à l'aveugle sur la
 * foi d'un horodatage, c'est remplacer une production insatisfaisante par une
 * autre, et recommencer.
 */
export function RevisionHistory({
  revisions,
  previewData,
}: {
  revisions: Revision[]
  /** Absent pour les réglages : il n'y a pas de composition à rendre. */
  previewData?: BlockData
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  function restore(revision: Revision) {
    const when = new Date(revision.created_at).toLocaleString('fr-FR')
    const confirmed = window.confirm(
      `Rétablir la version du ${when} ?\n\n` +
        'L’état actuel sera conservé dans l’historique : vous pourrez revenir dessus.',
    )
    if (!confirmed) return

    startTransition(async () => {
      const result = await restoreRevision(revision.id)
      setFeedback({ ok: result.ok, message: result.message ?? '' })
      // Un rechargement plutôt qu'une mise à jour locale : le formulaire
      // entier vient de changer, et le reconstruire à la main inviterait à
      // oublier un champ.
      if (result.ok) window.location.reload()
    })
  }

  return (
    <FormSection
      title="Historique"
      description="Les états précédents de cette page. Le plus récent est celui qui a été remplacé lors du dernier enregistrement."
    >
      {feedback && (
        <Alert tone={feedback.ok ? 'success' : 'error'}>{feedback.message}</Alert>
      )}

      {revisions.length === 0 ? (
        <EmptyState
          icon={History}
          title="Aucune version antérieure"
          description="L’historique se remplit au fil des enregistrements : le prochain y déposera l’état actuel."
        />
      ) : (
        <ul className="space-y-2">
          {revisions.map((revision) => {
            const open = openId === revision.id
            const author = revision.author?.full_name ?? revision.author?.email ?? null

            return (
              <li
                key={revision.id}
                className={cn(
                  'overflow-hidden rounded-md border transition-colors duration-fast',
                  open ? 'border-primary-text' : 'border-line',
                )}
              >
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">
                      {new Date(revision.created_at).toLocaleString('fr-FR', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-fg-subtle">
                      {revision.label ?? '—'}
                      {author && ` · ${author}`}
                    </p>
                  </div>

                  {previewData && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenId(open ? null : revision.id)}
                      aria-expanded={open}
                    >
                      <Eye className="h-4 w-4" aria-hidden />
                      {open ? 'Masquer' : 'Voir'}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => restore(revision)}
                    disabled={pending}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Rétablir
                  </Button>
                </div>

                {open && previewData && (
                  <div className="h-[32rem] border-t border-line">
                    <BlockPreview
                      blocks={parseBlocks(revision.payload.blocks)}
                      data={previewData}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </FormSection>
  )
}
