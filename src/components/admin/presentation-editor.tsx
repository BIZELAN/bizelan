'use client'

import { BlockEditor } from '@/components/admin/block-editor'
import { presentationBlocks } from '@/lib/blocks'
import type { BlockData } from '@/components/public/blocks/block-renderer'

/**
 * Présentation d'une fiche (formation, service, produit, article), composée
 * par blocs comme une page de vente.
 *
 * L'ancienne présentation riche n'est pas perdue : à la première ouverture,
 * elle devient un bloc « Texte libre » qu'on peut garder, modifier ou
 * compléter. Le champ d'origine est renvoyé tel quel (champ caché) : il reste
 * en base comme solution de repli et pour les extraits.
 */
export function PresentationEditor({
  blocks,
  legacy,
  legacyName,
  previewData,
}: {
  blocks: unknown
  legacy: string | null | undefined
  /** Nom du champ historique à préserver (`description`, `content`). */
  legacyName: string
  previewData?: BlockData
}) {
  return (
    <div>
      <input type="hidden" name={legacyName} value={legacy ?? ''} />
      <BlockEditor name="blocks" defaultValue={presentationBlocks(blocks, legacy)} previewData={previewData} />
    </div>
  )
}
