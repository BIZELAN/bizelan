import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'

/** Enregistre en base un support déjà téléversé dans le bucket privé. */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'editor'].includes(user.profile.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  let body: {
    courseId?: string
    lessonId?: string
    title?: string
    description?: string | null
    storagePath?: string
    fileName?: string
    fileSize?: number
    mimeType?: string
    position?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  if (!body.storagePath || !body.title || (!body.courseId && !body.lessonId)) {
    return NextResponse.json({ error: 'Informations incomplètes.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('resources')
    .insert({
      course_id: body.courseId ?? null,
      lesson_id: body.lessonId ?? null,
      title: body.title,
      description: body.description ?? null,
      storage_path: body.storagePath,
      file_name: body.fileName ?? null,
      file_size: body.fileSize ?? null,
      mime_type: body.mimeType ?? null,
      position: body.position ?? 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[ressources] enregistrement échoué :', error.message)
    return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
