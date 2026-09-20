import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Enregistrement d'une visite de page.
 * Volontairement minimaliste : aucun cookie, aucune donnée personnelle,
 * aucun traceur tiers. Seuls le chemin, la provenance et un identifiant
 * de session éphémère (généré côté navigateur, non persistant) sont stockés.
 */
export async function POST(request: Request) {
  let body: { path?: string; referrer?: string; sessionId?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const path = (body.path ?? '').slice(0, 512)
  if (!path.startsWith('/')) return NextResponse.json({ ok: false }, { status: 400 })

  // On ne compte pas les visites de l'administration.
  if (path.startsWith('/admin')) return NextResponse.json({ ok: true, skipped: true })

  try {
    const supabase = createAdminClient()
    await supabase.from('page_views').insert({
      path,
      referrer: body.referrer ? body.referrer.slice(0, 512) : null,
      session_id: body.sessionId ? body.sessionId.slice(0, 64) : null,
      country: request.headers.get('x-vercel-ip-country'),
    })
  } catch (error) {
    // Une statistique ne doit jamais casser une page.
    console.error('[vues] enregistrement échoué :', error)
  }

  return NextResponse.json({ ok: true })
}
