import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/*
 * Journal des actions d'administration.
 *
 * Vit hors des fichiers `'use server'` : tout ce qu'un tel fichier exporte
 * devient une action appelable depuis le navigateur. Exposée ainsi, cette
 * fonction — qui écrit avec la clé de service, sans contrôle de rôle —
 * permettrait à n'importe qui de remplir le journal.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Trace une action d'administration.
 *
 * `entity_id` est une colonne UUID. Les réglages du site portent l'identifiant
 * « 1 » : l'insérer tel quel faisait échouer l'écriture, en silence, et la
 * restauration des paramètres n'apparaissait jamais au journal. Un identifiant
 * qui n'est pas un UUID part donc dans les métadonnées.
 */
export async function logActivity(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const supabase = createAdminClient()
  const isUuid = Boolean(entityId && UUID_RE.test(entityId))
  const { error } = await supabase.from('activity_log').insert({
    actor_id: actorId,
    action,
    entity,
    entity_id: isUuid ? entityId : null,
    metadata: isUuid || !entityId ? metadata : { ...metadata, ref: entityId },
  })
  if (error) console.error('[journal] écriture impossible :', error.message)
}

