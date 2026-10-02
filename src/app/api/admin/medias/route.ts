import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MediaItem } from '@/lib/types'

async function requireEditor() {
  const user = await getCurrentUser()
  if (!user || !['admin', 'editor'].includes(user.profile.role)) return null
  return user
}

/**
 * Liste de la médiathèque, pour le sélecteur des champs image/vidéo.
 *   ?type=image | video | media (image + vidéo) | all
 *   ?q=texte    — filtre sur le nom de fichier
 */
export async function GET(request: Request) {
  if (!(await requireEditor())) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get('type') ?? 'all'
  const q = (url.searchParams.get('q') ?? '').trim().replace(/[%_,()]/g, ' ').slice(0, 80)

  const supabase = createAdminClient()
  let query = supabase
    .from('media')
    .select('*')
    .eq('bucket', 'public-media')
    .order('created_at', { ascending: false })
    .limit(300)

  if (type === 'image') query = query.like('mime_type', 'image/%')
  else if (type === 'video') query = query.like('mime_type', 'video/%')
  else if (type === 'media') query = query.or('mime_type.like.image/%,mime_type.like.video/%')
  if (q) query = query.ilike('file_name', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Lecture impossible.' }, { status: 500 })
  return NextResponse.json({ items: (data as MediaItem[]) ?? [] })
}

/**
 * Enregistre dans la médiathèque un fichier que le navigateur vient de
 * déposer directement dans le stockage (voir `/api/admin/upload-url`).
 *
 * Le chemin est revérifié : il doit exister dans le bucket public. Un appel
 * forgé ne peut donc pas inscrire un fichier inexistant ou d'un autre bucket.
 */
export async function POST(request: Request) {
  const user = await requireEditor()
  if (!user) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  let body: { path?: string; fileName?: string; size?: number; mimeType?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const path = String(body.path ?? '')
  if (!/^\d{4}\/[a-z0-9-]+\.[a-z0-9]{1,8}$/.test(path)) {
    return NextResponse.json({ error: 'Chemin invalide.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const folder = path.split('/')[0]
  const name = path.split('/')[1]
  const { data: listed } = await supabase.storage.from('public-media').list(folder, { search: name, limit: 1 })
  if (!listed?.some((f) => f.name === name)) {
    return NextResponse.json({ error: 'Fichier introuvable dans le stockage.' }, { status: 404 })
  }

  const publicUrl = supabase.storage.from('public-media').getPublicUrl(path).data.publicUrl
  const { data, error } = await supabase
    .from('media')
    .upsert(
      {
        bucket: 'public-media',
        storage_path: path,
        public_url: publicUrl,
        file_name: String(body.fileName ?? name).slice(0, 200),
        mime_type: body.mimeType ? String(body.mimeType).slice(0, 120) : null,
        file_size: Number.isFinite(Number(body.size)) ? Number(body.size) : null,
        uploaded_by: user.id,
      },
      { onConflict: 'bucket,storage_path' },
    )
    .select('*')
    .single()

  if (error) {
    console.error('[medias] enregistrement impossible :', error.message)
    // Le fichier est en ligne : on renvoie quand même son adresse, le champ
    // qui l'a déposé reste utilisable même si la médiathèque n'a pas suivi.
    return NextResponse.json({ url: publicUrl, item: null })
  }

  return NextResponse.json({ url: publicUrl, item: data as MediaItem })
}
