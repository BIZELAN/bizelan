import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { slugify } from '@/lib/utils'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 Mo
const MAX_RESOURCE_BYTES = 100 * 1024 * 1024 // 100 Mo

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

/**
 * Téléversement depuis l'admin.
 *   · bucket « public-media » → images du site, URL publique
 *   · bucket « resources »    → supports de cours, accès contrôlé
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'editor'].includes(user.profile.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const target = String(formData.get('bucket') ?? 'public-media')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
  }

  const isResource = target === 'resources'
  const bucket = isResource ? 'resources' : 'public-media'
  const maxBytes = isResource ? MAX_RESOURCE_BYTES : MAX_IMAGE_BYTES

  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (maximum ${Math.round(maxBytes / 1024 / 1024)} Mo).` },
      { status: 413 },
    )
  }

  if (!isResource && !IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Format d’image non pris en charge (PNG, JPEG, WebP, GIF ou SVG).' },
      { status: 415 },
    )
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin'
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'fichier'
  const path = `${new Date().getFullYear()}/${Date.now().toString(36)}-${base}.${extension}`

  const supabase = createAdminClient()
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })

  if (error) {
    console.error('[upload] échec :', error.message)
    return NextResponse.json({ error: 'Le téléversement a échoué.' }, { status: 500 })
  }

  let publicUrl: string | null = null
  if (!isResource) {
    publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl

    await supabase.from('media').insert({
      bucket,
      storage_path: path,
      public_url: publicUrl,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
      uploaded_by: user.id,
    })
  }

  return NextResponse.json({
    path,
    bucket,
    url: publicUrl,
    fileName: file.name,
    size: file.size,
    mimeType: file.type,
  })
}
