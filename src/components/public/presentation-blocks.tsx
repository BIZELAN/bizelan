import { BlockRenderer, type BlockContext } from '@/components/public/blocks/block-renderer'
import { parseBlocks } from '@/lib/blocks'
import { getBlockData } from '@/lib/queries'

/**
 * Présentation par blocs d'une fiche publique (formation, service, produit,
 * article). Ne rend rien — et n'interroge rien — quand la fiche n'a pas de
 * blocs : la page garde alors sa présentation riche historique.
 */
export async function PresentationBlocks({
  blocks,
  context,
}: {
  blocks: unknown
  context?: Omit<BlockContext, 'data'>
}) {
  const parsed = parseBlocks(blocks).filter((b) => !b.hidden)
  if (parsed.length === 0) return null

  // Les grilles (formations, articles, avis…) ont besoin des contenus publiés.
  const needsData = parsed.some((b) =>
    ['courseGrid', 'productGrid', 'serviceGrid', 'postGrid', 'testimonials', 'heroSplit'].includes(b.type),
  )
  const data = needsData ? await getBlockData() : undefined

  return <BlockRenderer blocks={parsed} context={{ ...context, data }} />
}

/** La fiche a-t-elle une présentation par blocs ? */
export function hasPresentationBlocks(blocks: unknown): boolean {
  return parseBlocks(blocks).some((b) => !b.hidden)
}
