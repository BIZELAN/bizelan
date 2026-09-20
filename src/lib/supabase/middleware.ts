import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'

/**
 * Rafraîchit la session Supabase à chaque requête et protège les zones privées.
 *   · /admin/*   → réservé aux rôles « admin » et « editor »
 *   · /compte/*  → réservé aux utilisateurs connectés
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Sans configuration Supabase, on laisse passer : le site affiche un écran
  // d'installation plutôt qu'une erreur 500.
  if (!env.supabaseUrl || !env.supabaseAnonKey) return response

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAdminArea = pathname.startsWith('/admin')
  const isAccountArea = pathname.startsWith('/compte')

  if ((isAdminArea || isAccountArea) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/connexion'
    url.searchParams.set('suivant', pathname)
    return NextResponse.redirect(url)
  }

  if (isAdminArea && user) {
    const { data: profile } = await supabase
      .from('bz_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'editor'].includes(profile.role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/compte'
      url.searchParams.set('erreur', 'acces-refuse')
      return NextResponse.redirect(url)
    }
  }

  return response
}
