import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'

/** Supprime un fichier de la médiathèque (base + fichier stocké). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'editor'].includes(user.profile.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: media } = await supabase
    .from('media')
    .select('bucket, storage_path')
    .eq('id', id)
    .maybeSingle()

  if (!media) {
    return NextResponse.json({ error: 'Fichier introuvable.' }, { status: 404 })
  }

  const { error: storageError } = await supabase.storage
    .from(media.bucket)
    .remove([media.storage_path])

  if (storageError) {
    console.error('[medias] suppression du fichier échouée :', storageError.message)
  }

  const { error } = await supabase.from('media').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: 'Suppression impossible.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/** Met à jour le texte alternatif ou la miniature d'un fichier. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'editor'].includes(user.profile.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { id } = await params
  let body: { alt?: string | null; poster_url?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const patch: Record<string, string | null> = {}
  if ('alt' in body) patch.alt = body.alt ? String(body.alt).slice(0, 300) : null
  if ('poster_url' in body) {
    const poster = body.poster_url ? String(body.poster_url).trim() : ''
    if (poster && !/^https:\/\//.test(poster)) {
      return NextResponse.json({ error: 'Miniature : adresse https attendue.' }, { status: 400 })
    }
    patch.poster_url = poster || null
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('media').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: 'Mise à jour impossible.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}