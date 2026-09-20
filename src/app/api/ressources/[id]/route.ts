import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser, hasCourseAccess } from '@/lib/auth'

/**
 * Génère une URL de téléchargement signée (5 minutes) pour un support de cours.
 * L'accès est vérifié côté serveur : sans inscription active, aucune URL n'est
 * produite — un lien ne peut donc pas être partagé durablement.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Vous devez être connecté.' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: resource } = await supabase
    .from('resources')
    .select('id, storage_path, file_name, course_id, lesson_id')
    .eq('id', id)
    .maybeSingle()

  if (!resource) {
    return NextResponse.json({ error: 'Ce fichier est introuvable.' }, { status: 404 })
  }

  // Détermine la formation propriétaire du fichier
  let courseId = resource.course_id as string | null
  if (!courseId && resource.lesson_id) {
    const { data: lesson } = await supabase
      .from('lessons')
      .select('course_modules(course_id)')
      .eq('id', resource.lesson_id)
      .maybeSingle()

    const modules = lesson?.course_modules as unknown as { course_id: string } | null
    courseId = modules?.course_id ?? null
  }

  const isAdmin = ['admin', 'editor'].includes(user.profile.role)
  if (!isAdmin) {
    if (!courseId || !(await hasCourseAccess(user.id, courseId))) {
      return NextResponse.json(
        { error: 'Vous n’avez pas accès à ce support.' },
        { status: 403 },
      )
    }
  }

  const admin = createAdminClient()
  const { data: signed, error } = await admin.storage
    .from('resources')
    .createSignedUrl(resource.storage_path, 300, {
      download: resource.file_name ?? true,
    })

  if (error || !signed) {
    console.error('[ressources] signature échouée :', error?.message)
    return NextResponse.json({ error: 'Téléchargement momentanément indisponible.' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl })
}
