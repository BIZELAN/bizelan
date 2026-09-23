import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Block } from '@/lib/blocks'

/**
 * Historique des révisions.
 *
 * On enregistre l'état D'AVANT chaque écriture : une révision est « ce que la
 * page contenait avant cet enregistrement », c'est-à-dire exactement ce vers
 * quoi on veut revenir. Enregistrer l'état d'après dupliquerait la ligne
 * courante sans rien offrir.
 *
 * Conséquence utile : restaurer est une écriture comme une autre, donc elle
 * s'enregistre aussi. Annuler une annulation marche sans code supplémentaire.
 */

export type RevisionEntity = 'page' | 'settings'

export interface Revision {
  id: string
  entity: RevisionEntity
  entity_id: string
  payload: Record<string, unknown>
  label: string | null
  author_id: string | null
  created_at: string
  /** Renseigné par la jointure, pour afficher qui a fait quoi. */
  author?: { full_name: string | null; email: string } | null
}

/**
 * Résumé affiché dans la liste.
 *
 * Il est calculé à l'enregistrement et non à l'affichage : une révision doit
 * rester lisible même si la forme des blocs évolue par la suite.
 */
function describe(entity: RevisionEntity, payload: Record<string, unknown>): string {
  if (entity === 'settings') {
    const theme = payload.theme as Record<string, unknown> | null
    const primary = theme && typeof theme.primary === 'string' ? theme.primary : null
    return primary ? `Réglages — couleur ${primary}` : 'Réglages du site'
  }

  const blocks = Array.isArray(payload.blocks) ? (payload.blocks as Block[]) : []
  const visible = blocks.filter((b) => !b?.hidden).length
  const status = payload.status === 'published' ? 'publiée' : 'brouillon'
  const plural = visible > 1 ? 's' : ''
  return `${visible} bloc${plural} visible${plural} — ${status}`
}

/**
 * Enregistre l'état courant avant de l'écraser.
 *
 * Ne lève jamais : perdre une révision est regrettable, empêcher un
 * enregistrement parce que l'historique est indisponible le serait davantage.
 * L'échec est journalisé, l'écriture continue.
 */
export async function snapshot(
  entity: RevisionEntity,
  entityId: string,
  authorId: string | null,
): Promise<void> {
  const supabase = createAdminClient()
  const table = entity === 'page' ? 'pages' : 'site_settings'

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', entityId)
    .maybeSingle<Record<string, unknown>>()

  // Pas de ligne : c'est une création, il n'y a rien à conserver.
  if (error || !data) {
    if (error) console.error('[révisions] lecture impossible :', error.message)
    return
  }

  const { error: insertError } = await supabase.from('bz_revisions').insert({
    entity,
    entity_id: entityId,
    payload: data,
    label: describe(entity, data),
    author_id: authorId,
  })

  if (insertError) console.error('[révisions] enregistrement impossible :', insertError.message)
}

export async function listRevisions(
  entity: RevisionEntity,
  entityId: string,
  limit = 30,
): Promise<Revision[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('bz_revisions')
    .select('*, author:bz_profiles(full_name, email)')
    .eq('entity', entity)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data as Revision[]) ?? []
}

export async function getRevision(id: string): Promise<Revision | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('bz_revisions')
    .select('*')
    .eq('id', id)
    .maybeSingle<Revision>()
  return data ?? null
}

/**
 * Champs qu'une restauration ne doit PAS réécrire.
 *
 * `id` identifie la ligne, `created_at` sa naissance : les réécrire ferait
 * mentir l'historique. `updated_at` est posé par un déclencheur. `slug` et
 * `is_home` sont exclus pour une raison différente : restaurer une ancienne
 * adresse casserait les liens entrants, et reprendre `is_home` déplacerait la
 * page d'accueil sans que personne l'ait demandé. On restaure un CONTENU, pas
 * une identité.
 */
const NEVER_RESTORED = new Set(['id', 'created_at', 'updated_at', 'slug', 'is_home'])

export function restorablePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !NEVER_RESTORED.has(key)))
}
