import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'

/** Supprime une image de la médiathèque (base + fichier stocké). */
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
    return NextResponse.json({ error: 'Image introuvable.' }, { status: 404 })
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
