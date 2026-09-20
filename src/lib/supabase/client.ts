'use client'

import { createBrowserClient } from '@supabase/ssr'
import { assertSupabaseConfigured, env } from '@/lib/env'

/** Client Supabase pour les composants « client » (navigateur). */
export function createClient() {
  assertSupabaseConfigured()

  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey)
}
