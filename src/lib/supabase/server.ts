import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { assertSupabaseConfigured, env } from '@/lib/env'

/**
 * Client Supabase pour les Server Components, Server Actions et Route Handlers.
 * Respecte la session de l'utilisateur connecté (donc les politiques RLS).
 */
export async function createClient() {
  assertSupabaseConfigured()

  const cookieStore = await cookies()

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Appelé depuis un Server Component : le rafraîchissement de session
          // est géré par le middleware, on peut ignorer sans risque.
        }
      },
    },
  })
}
