import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/**
 * Client « service_role » : contourne les politiques RLS.
 *
 * À n'utiliser QUE dans du code serveur qui a déjà vérifié les droits
 * (webhook de paiement signé, action admin après contrôle du rôle).
 * Ne jamais l'importer dans un composant client.
 */
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
