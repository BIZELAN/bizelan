'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { fulfillOrder, revokeOrderAccess } from '@/lib/orders'
import { parseRichContent, richContentToText } from '@/lib/rich-content'
import { slugify } from '@/lib/utils'
import { safeMapEmbedSrc, safeMapsLink } from '@/lib/map-embed'
import { getRevision, restorablePayload, snapshot } from '@/lib/revisions'
import { parseHex } from '@/lib/theme-tokens'
import { RESERVED_PAGE_SLUGS } from '@/lib/reserved-slugs'
import { logActivity } from '@/lib/activity'

export interface AdminResult {
  ok: boolean
  message?: string
  id?: string
}

/* ------------------------------------------------------------------ */
/* Aides                                                               */
/* ------------------------------------------------------------------ */

function str(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function nullable(formData: FormData, name: string): string | null {
  return str(formData, name) || null
}

function int(formData: FormData, name: string, fallback = 0): number {
  const value = Number(str(formData, name))
  return Number.isFinite(value) ? Math.round(value) : fallback
}

function nullableInt(formData: FormData, name: string): number | null {
  const raw = str(formData, name)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? Math.round(value) : null
}

function bool(formData: FormData, name: string): boolean {
  const value = formData.get(name)
  return value === 'on' || value === 'true' || value === '1'
}

/** Les listes de l'admin sont saisies une ligne par élément. */
function lines(formData: FormData, name: string): string[] {
  return str(formData, name)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Champ JSON produit par les éditeurs riches (FAQ, étapes, blocs…). */
function json<T>(formData: FormData, name: string, fallback: T): T {
  const raw = str(formData, name)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Date de publication à enregistrer.
 *
 * Elle était remise à « maintenant » à CHAQUE enregistrement d'une page
 * publiée : corriger une faute de frappe faisait remonter un contenu ancien
 * en tête des listes triées par date, et la vraie date de mise en ligne était
 * perdue. On conserve donc la date existante, et on n'en pose une que lors du
 * premier passage à « publié ».
 */
async function publicationDate(
  table: 'services' | 'pages' | 'courses' | 'bz_posts' | 'products',
  id: string,
  status: string,
  requested: string | null = null,
): Promise<string | null> {
  if (status !== 'published') return null
  if (requested) return requested
  if (!id) return new Date().toISOString()
  const supabase = createAdminClient()
  const { data } = await supabase.from(table).select('published_at').eq('id', id).maybeSingle()
  return (data?.published_at as string | null) ?? new Date().toISOString()
}

/* ------------------------------------------------------------------ */
/* Formations                                                          */
/* ------------------------------------------------------------------ */

export async function saveCourse(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const id = str(formData, 'id')
  const title = str(formData, 'title')
  if (!title) return { ok: false, message: 'Le titre est obligatoire.' }

  const slug = slugify(str(formData, 'slug') || title)
  const status = str(formData, 'status') || 'draft'

  const payload = {
    slug,
    title,
    subtitle: nullable(formData, 'subtitle'),
    summary: nullable(formData, 'summary'),
    description: nullable(formData, 'description'),
    cover_url: nullable(formData, 'cover_url'),
    promo_video_url: nullable(formData, 'promo_video_url'),
    category_id: nullable(formData, 'category_id'),
    price_cents: int(formData, 'price_cents'),
    compare_at_price_cents: nullableInt(formData, 'compare_at_price_cents'),
    currency: str(formData, 'currency') || 'XOF',
    level: nullable(formData, 'level'),
    duration_label: nullable(formData, 'duration_label'),
    format_label: nullable(formData, 'format_label'),
    access_label: nullable(formData, 'access_label'),
    what_you_get: lines(formData, 'what_you_get'),
    outcomes: lines(formData, 'outcomes'),
    target_audience: lines(formData, 'target_audience'),
    prerequisites: lines(formData, 'prerequisites'),
    faq: json(formData, 'faq', [] as unknown[]),
    status,
    featured: bool(formData, 'featured'),
    position: int(formData, 'position'),
    // Borné ici en plus de la contrainte SQL : un `select` peut être forcé
    // côté client, et l'erreur de contrainte serait illisible pour l'admin.
    min_watch_ratio: Math.min(1, Math.max(0, Number(formData.get('min_watch_ratio') ?? 0) || 0)),
    require_quiz_pass: bool(formData, 'require_quiz_pass'),
    seo_title: nullable(formData, 'seo_title'),
    seo_description: nullable(formData, 'seo_description'),
    og_image_url: nullable(formData, 'og_image_url'),
    published_at: await publicationDate('courses', id, status, nullable(formData, 'published_at')),
  }

  if (id) {
    const { error } = await supabase.from('courses').update(payload).eq('id', id)
    if (error) return { ok: false, message: mapError(error.message) }
    await logActivity(user.id, 'course.updated', 'course', id, { title })
  } else {
    const { data, error } = await supabase.from('courses').insert(payload).select('id').single()
    if (error) return { ok: false, message: mapError(error.message) }
    await logActivity(user.id, 'course.created', 'course', data.id, { title })
    revalidatePath('/admin/formations')
    redirect(`/admin/formations/${data.id}`)
  }

  revalidatePath('/admin/formations')
  revalidatePath(`/formations/${slug}`)
  revalidatePath('/formations')
  return { ok: true, message: 'Formation enregistrée.', id }
}

export async function deleteCourse(id: string): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const { count } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', id)

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message:
        'Cette formation compte des inscrits : archivez-la plutôt que de la supprimer, pour ne pas leur retirer leur accès.',
    }
  }

  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(user.id, 'course.deleted', 'course', id)
  revalidatePath('/admin/formations')
  revalidatePath('/formations')
  return { ok: true, message: 'Formation supprimée.' }
}

export async function duplicateCourse(id: string): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const { data: course } = await supabase.from('courses').select('*').eq('id', id).single()
  if (!course) return { ok: false, message: 'Formation introuvable.' }

  const { id: _oldId, created_at: _c, updated_at: _u, ...rest } = course
  const { data: copy, error } = await supabase
    .from('courses')
    .insert({
      ...rest,
      slug: `${course.slug}-copie-${Date.now().toString(36)}`,
      title: `${course.title} (copie)`,
      status: 'draft',
      featured: false,
      published_at: null,
    })
    .select('id')
    .single()

  if (error || !copy) return { ok: false, message: mapError(error?.message ?? '') }

  // Duplication du programme
  const { data: modules } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', id)
    .order('position')

  for (const courseModule of modules ?? []) {
    const { data: newModule } = await supabase
      .from('course_modules')
      .insert({
        course_id: copy.id,
        title: courseModule.title,
        subtitle: courseModule.subtitle,
        description: courseModule.description,
        position: courseModule.position,
      })
      .select('id')
      .single()

    if (!newModule) continue

    const { data: lessons } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', courseModule.id)
      .order('position')

    if (lessons?.length) {
      await supabase.from('lessons').insert(
        lessons.map((l) => ({
          module_id: newModule.id,
          title: l.title,
          slug: l.slug,
          description: l.description,
          content: l.content,
          video_provider: l.video_provider,
          video_id: l.video_id,
          video_url: l.video_url,
          duration_seconds: l.duration_seconds,
          is_preview: l.is_preview,
          position: l.position,
        })),
      )
    }
  }

  await logActivity(user.id, 'course.duplicated', 'course', copy.id, { from: id })
  revalidatePath('/admin/formations')
  return { ok: true, message: 'Formation dupliquée.', id: copy.id }
}

/* ------------------------------------------------------------------ */
/* Modules et leçons                                                   */
/* ------------------------------------------------------------------ */

export async function saveModule(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()

  const id = str(formData, 'id')
  const courseId = str(formData, 'course_id')
  const title = str(formData, 'title')

  if (!title || !courseId) return { ok: false, message: 'Titre et formation obligatoires.' }

  const payload = {
    course_id: courseId,
    title,
    subtitle: nullable(formData, 'subtitle'),
    description: nullable(formData, 'description'),
    position: int(formData, 'position'),
  }

  const { error } = id
    ? await supabase.from('course_modules').update(payload).eq('id', id)
    : await supabase.from('course_modules').insert(payload)

  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath(`/admin/formations/${courseId}/programme`)
  return { ok: true, message: 'Module enregistré.' }
}

export async function deleteModule(id: string, courseId: string): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('course_modules').delete().eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath(`/admin/formations/${courseId}/programme`)
  return { ok: true, message: 'Module supprimé.' }
}

export async function saveLesson(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()

  const id = str(formData, 'id')
  const moduleId = str(formData, 'module_id')
  const courseId = str(formData, 'course_id')
  const title = str(formData, 'title')

  if (!title || !moduleId) return { ok: false, message: 'Titre et module obligatoires.' }

  const provider = str(formData, 'video_provider')

  const payload = {
    module_id: moduleId,
    title,
    slug: slugify(str(formData, 'slug') || title),
    description: nullable(formData, 'description'),
    content: nullable(formData, 'content'),
    video_provider: provider ? provider : null,
    video_id: nullable(formData, 'video_id'),
    video_url: nullable(formData, 'video_url'),
    duration_seconds: int(formData, 'duration_minutes') * 60,
    is_preview: bool(formData, 'is_preview'),
    position: int(formData, 'position'),
  }

  const { error } = id
    ? await supabase.from('lessons').update(payload).eq('id', id)
    : await supabase.from('lessons').insert(payload)

  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath(`/admin/formations/${courseId}/programme`)
  return { ok: true, message: 'Leçon enregistrée.' }
}

export async function deleteLesson(id: string, courseId: string): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath(`/admin/formations/${courseId}/programme`)
  return { ok: true, message: 'Leçon supprimée.' }
}

export async function deleteResource(id: string, courseId: string): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: resource } = await supabase
    .from('resources')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()

  if (resource?.storage_path) {
    await supabase.storage.from('resources').remove([resource.storage_path])
  }

  const { error } = await supabase.from('resources').delete().eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath(`/admin/formations/${courseId}/supports`)
  return { ok: true, message: 'Support supprimé.' }
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

export async function saveService(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const id = str(formData, 'id')
  const title = str(formData, 'title')
  if (!title) return { ok: false, message: 'Le titre est obligatoire.' }

  const slug = slugify(str(formData, 'slug') || title)
  const status = str(formData, 'status') || 'draft'

  const payload = {
    slug,
    title,
    subtitle: nullable(formData, 'subtitle'),
    summary: nullable(formData, 'summary'),
    description: nullable(formData, 'description'),
    cover_url: nullable(formData, 'cover_url'),
    icon: nullable(formData, 'icon'),
    pricing: str(formData, 'pricing') || 'quote',
    price_cents: nullableInt(formData, 'price_cents'),
    price_label: nullable(formData, 'price_label'),
    currency: str(formData, 'currency') || 'XOF',
    features: lines(formData, 'features'),
    process_steps: json(formData, 'process_steps', [] as unknown[]),
    deliverables: lines(formData, 'deliverables'),
    faq: json(formData, 'faq', [] as unknown[]),
    status,
    featured: bool(formData, 'featured'),
    position: int(formData, 'position'),
    seo_title: nullable(formData, 'seo_title'),
    seo_description: nullable(formData, 'seo_description'),
    published_at: await publicationDate('services', id, status),
  }

  if (id) {
    const { error } = await supabase.from('services').update(payload).eq('id', id)
    if (error) return { ok: false, message: mapError(error.message) }
    await logActivity(user.id, 'service.updated', 'service', id, { title })
  } else {
    const { data, error } = await supabase.from('services').insert(payload).select('id').single()
    if (error) return { ok: false, message: mapError(error.message) }
    await logActivity(user.id, 'service.created', 'service', data.id, { title })
    revalidatePath('/admin/services')
    redirect(`/admin/services/${data.id}`)
  }

  revalidatePath('/admin/services')
  revalidatePath(`/services/${slug}`)
  revalidatePath('/services')
  return { ok: true, message: 'Service enregistré.' }
}

export async function deleteService(id: string): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }
  await logActivity(user.id, 'service.deleted', 'service', id)

  revalidatePath('/admin/services')
  revalidatePath('/services')
  return { ok: true, message: 'Service supprimé.' }
}

/* ------------------------------------------------------------------ */
/* Pages de vente                                                      */
/* ------------------------------------------------------------------ */

export async function savePage(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const id = str(formData, 'id')
  const title = str(formData, 'title')
  if (!title) return { ok: false, message: 'Le titre est obligatoire.' }

  const slug = slugify(str(formData, 'slug') || title)

  if (RESERVED_PAGE_SLUGS.includes(slug)) {
    return { ok: false, message: `L'adresse « /${slug} » est réservée par le site. Choisissez-en une autre.` }
  }

  const status = str(formData, 'status') || 'draft'
  const isHome = bool(formData, 'is_home')

  const payload = {
    slug,
    title,
    description: nullable(formData, 'description'),
    blocks: json(formData, 'blocks', [] as unknown[]),
    status,
    is_home: isHome,
    hide_header: bool(formData, 'hide_header'),
    hide_footer: bool(formData, 'hide_footer'),
    course_id: nullable(formData, 'course_id'),
    service_id: nullable(formData, 'service_id'),
    seo_title: nullable(formData, 'seo_title'),
    seo_description: nullable(formData, 'seo_description'),
    og_image_url: nullable(formData, 'og_image_url'),
    published_at: await publicationDate('pages', id, status),
  }

  // Une seule page d'accueil à la fois
  if (isHome) {
    await supabase.from('pages').update({ is_home: false }).neq('id', id || '00000000-0000-0000-0000-000000000000')
  }

  if (id) {
    // L'état courant est conservé AVANT d'être écrasé : c'est lui qu'on
    // voudra retrouver si la refonte ne convient pas une fois en ligne.
    await snapshot('page', id, user.id)

    const { error } = await supabase.from('pages').update(payload).eq('id', id)
    if (error) return { ok: false, message: mapError(error.message) }
    await logActivity(user.id, 'page.updated', 'page', id, { title, slug })
  } else {
    const { data, error } = await supabase.from('pages').insert(payload).select('id').single()
    if (error) return { ok: false, message: mapError(error.message) }
    await logActivity(user.id, 'page.created', 'page', data.id, { title, slug })
    revalidatePath('/admin/pages')
    redirect(`/admin/pages/${data.id}`)
  }

  revalidatePath('/admin/pages')
  revalidatePath(`/${slug}`)
  revalidatePath('/')
  return { ok: true, message: 'Page enregistrée.' }
}

export async function deletePage(id: string): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const { data: page } = await supabase.from('pages').select('slug').eq('id', id).maybeSingle()
  const { error } = await supabase.from('pages').delete().eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }
  await logActivity(user.id, 'page.deleted', 'page', id, { slug: page?.slug ?? null })

  revalidatePath('/admin/pages')
  if (page?.slug) revalidatePath(`/${page.slug}`)
  return { ok: true, message: 'Page supprimée.' }
}

export async function duplicatePage(id: string): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: page } = await supabase.from('pages').select('*').eq('id', id).single()
  if (!page) return { ok: false, message: 'Page introuvable.' }

  const { id: _i, created_at: _c, updated_at: _u, ...rest } = page
  const { data: copy, error } = await supabase
    .from('pages')
    .insert({
      ...rest,
      slug: `${page.slug}-copie-${Date.now().toString(36)}`,
      title: `${page.title} (copie)`,
      status: 'draft',
      is_home: false,
      published_at: null,
    })
    .select('id')
    .single()

  if (error || !copy) return { ok: false, message: mapError(error?.message ?? '') }

  revalidatePath('/admin/pages')
  return { ok: true, message: 'Page dupliquée.', id: copy.id }
}

/* ------------------------------------------------------------------ */
/* Blog                                                                */
/* ------------------------------------------------------------------ */

export async function savePost(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const id = str(formData, 'id')
  const title = str(formData, 'title')
  if (!title) return { ok: false, message: 'Le titre est obligatoire.' }

  const slug = slugify(str(formData, 'slug') || title)
  const status = str(formData, 'status') || 'draft'
  const content = nullable(formData, 'content')

  const payload = {
    slug,
    title,
    excerpt: nullable(formData, 'excerpt'),
    content,
    cover_url: nullable(formData, 'cover_url'),
    category_id: nullable(formData, 'category_id'),
    author_id: user.id,
    status,
    featured: bool(formData, 'featured'),
    // Le contenu est désormais du JSON d'éditeur : compter ses mots bruts
    // gonflerait le temps de lecture avec les noms de nœuds et d'attributs.
    reading_minutes: Math.max(
      1,
      Math.round(richContentToText(parseRichContent(content)).split(/\s+/).filter(Boolean).length / 200) || 1,
    ),
    seo_title: nullable(formData, 'seo_title'),
    seo_description: nullable(formData, 'seo_description'),
    published_at: await publicationDate('bz_posts', id, status, nullable(formData, 'published_at')),
  }

  if (id) {
    const { error } = await supabase.from('bz_posts').update(payload).eq('id', id)
    if (error) return { ok: false, message: mapError(error.message) }
    await logActivity(user.id, 'post.updated', 'post', id, { title })
  } else {
    const { data, error } = await supabase.from('bz_posts').insert(payload).select('id').single()
    if (error) return { ok: false, message: mapError(error.message) }
    await logActivity(user.id, 'post.created', 'post', data.id, { title })
    revalidatePath('/admin/blog')
    redirect(`/admin/blog/${data.id}`)
  }

  revalidatePath('/admin/blog')
  revalidatePath(`/blog/${slug}`)
  revalidatePath('/blog')
  return { ok: true, message: 'Article enregistré.' }
}

export async function deletePost(id: string): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('bz_posts').delete().eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }
  await logActivity(user.id, 'post.deleted', 'post', id)

  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  return { ok: true, message: 'Article supprimé.' }
}

/* ------------------------------------------------------------------ */
/* Commandes                                                           */
/* ------------------------------------------------------------------ */

/** Valide manuellement une commande payée par dépôt/virement. */
export async function validateOrder(orderId: string, note?: string): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  if (note) {
    await supabase.from('orders').update({ admin_note: note }).eq('id', orderId)
  }

  const result = await fulfillOrder(orderId, { method: 'bank_transfer', validatedBy: user.id })
  if (!result.ok) return { ok: false, message: result.error ?? 'Validation impossible.' }

  revalidatePath('/admin/commandes')
  revalidatePath(`/admin/commandes/${orderId}`)
  return {
    ok: true,
    message: result.alreadyPaid
      ? 'Cette commande était déjà validée.'
      : 'Commande validée : l’accès du client est ouvert et son e-mail de confirmation est parti.',
  }
}

export async function changeOrderStatus(
  orderId: string,
  status: 'pending' | 'awaiting_payment' | 'failed' | 'cancelled' | 'refunded',
): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  if (status === 'refunded' || status === 'cancelled') {
    const result = await revokeOrderAccess(orderId, status)
    if (!result.ok) return { ok: false, message: result.error }
  } else {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
    if (error) return { ok: false, message: mapError(error.message) }
  }

  await logActivity(user.id, 'order.status_changed', 'order', orderId, { status })
  revalidatePath('/admin/commandes')
  revalidatePath(`/admin/commandes/${orderId}`)
  return { ok: true, message: 'Statut mis à jour.' }
}

export async function saveOrderNote(orderId: string, note: string): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('orders').update({ admin_note: note || null }).eq('id', orderId)
  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath(`/admin/commandes/${orderId}`)
  return { ok: true, message: 'Note enregistrée.' }
}

/* ------------------------------------------------------------------ */
/* Clients et accès                                                    */
/* ------------------------------------------------------------------ */

/** Ouvre manuellement l'accès d'un client à une formation. */
export async function grantAccess(
  _prev: AdminResult | null,
  formData: FormData,
): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const userId = str(formData, 'user_id')
  const courseId = str(formData, 'course_id')
  if (!userId || !courseId) return { ok: false, message: 'Client et formation obligatoires.' }

  const { error } = await supabase.from('enrollments').upsert(
    {
      user_id: userId,
      course_id: courseId,
      state: 'active',
      source: 'admin_grant',
    },
    { onConflict: 'user_id,course_id' },
  )

  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(user.id, 'access.granted', 'enrollment', null, { userId, courseId })
  revalidatePath(`/admin/clients/${userId}`)
  return { ok: true, message: 'Accès ouvert.' }
}

export async function revokeAccess(enrollmentId: string, userId: string): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('enrollments')
    .update({ state: 'revoked' })
    .eq('id', enrollmentId)

  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(user.id, 'access.revoked', 'enrollment', enrollmentId)
  revalidatePath(`/admin/clients/${userId}`)
  return { ok: true, message: 'Accès retiré.' }
}

export async function restoreAccess(enrollmentId: string, userId: string): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('enrollments')
    .update({ state: 'active' })
    .eq('id', enrollmentId)

  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(user.id, 'access.restored', 'enrollment', enrollmentId)

  revalidatePath(`/admin/clients/${userId}`)
  return { ok: true, message: 'Accès rétabli.' }
}

export async function changeUserRole(
  userId: string,
  role: 'client' | 'editor' | 'admin',
): Promise<AdminResult> {
  const user = await requireAdmin()
  if (user.profile.role !== 'admin') {
    return { ok: false, message: 'Seul un administrateur peut modifier les rôles.' }
  }
  if (user.id === userId && role !== 'admin') {
    return { ok: false, message: 'Vous ne pouvez pas retirer votre propre rôle d’administrateur.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('bz_profiles').update({ role }).eq('id', userId)
  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(user.id, 'user.role_changed', 'profile', userId, { role })
  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${userId}`)
  return { ok: true, message: 'Rôle mis à jour.' }
}

/** Note interne sur un client — jamais montrée au client lui-même. */
export async function saveClientNote(
  _prev: AdminResult | null,
  formData: FormData,
): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const userId = str(formData, 'user_id')
  if (!userId) return { ok: false, message: 'Client inconnu.' }

  const { error } = await supabase
    .from('bz_profiles')
    .update({ notes: str(formData, 'notes').slice(0, 5000) || null })
    .eq('id', userId)
  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(user.id, 'client.note_updated', 'profile', userId)
  revalidatePath(`/admin/clients/${userId}`)
  return { ok: true, message: 'Note enregistrée.' }
}

/* ------------------------------------------------------------------ */
/* Demandes et avis                                                    */
/* ------------------------------------------------------------------ */

export async function updateQuoteStatus(
  id: string,
  status: 'new' | 'in_progress' | 'won' | 'lost',
  note?: string,
): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('quote_requests')
    .update({ status, ...(note !== undefined ? { admin_note: note || null } : {}) })
    .eq('id', id)

  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath('/admin/demandes')
  return { ok: true, message: 'Demande mise à jour.' }
}

export async function markContactHandled(id: string, handled: boolean): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('contact_messages').update({ handled }).eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath('/admin/demandes')
  return { ok: true }
}

export async function moderateReview(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  featured?: boolean,
): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('reviews')
    .update({ status, ...(featured !== undefined ? { featured } : {}) })
    .eq('id', id)

  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath('/admin/avis')
  revalidatePath('/')
  return { ok: true, message: 'Avis mis à jour.' }
}

export async function createReview(
  _prev: AdminResult | null,
  formData: FormData,
): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()

  const authorName = str(formData, 'author_name')
  const rating = int(formData, 'rating', 5)
  if (!authorName) return { ok: false, message: 'Le nom est obligatoire.' }

  const { error } = await supabase.from('reviews').insert({
    course_id: nullable(formData, 'course_id'),
    author_name: authorName,
    author_role: nullable(formData, 'author_role'),
    rating: Math.min(5, Math.max(1, rating)),
    comment: nullable(formData, 'comment'),
    status: 'approved',
    featured: bool(formData, 'featured'),
  })

  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath('/admin/avis')
  return { ok: true, message: 'Témoignage ajouté.' }
}

export async function deleteReview(id: string): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath('/admin/avis')
  return { ok: true, message: 'Avis supprimé.' }
}

/* ------------------------------------------------------------------ */
/* Codes promo                                                         */
/* ------------------------------------------------------------------ */

export async function saveCoupon(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const id = str(formData, 'id')
  const code = str(formData, 'code').toUpperCase().replace(/[^A-Z0-9_-]/g, '')
  if (!code) return { ok: false, message: 'Le code est obligatoire (lettres, chiffres, - et _).' }

  const discountType = str(formData, 'discount_type') === 'amount' ? 'amount' : 'percent'
  const discountValue = int(formData, 'discount_value')
  if (discountValue <= 0) {
    return { ok: false, message: 'La remise doit être supérieure à zéro.' }
  }
  if (discountType === 'percent' && discountValue > 100) {
    return { ok: false, message: 'Une remise en pourcentage ne peut pas dépasser 100 %.' }
  }

  // Un code vise une formation OU un produit, pas les deux : `cible` vaut
  // `course:<id>`, `product:<id>` ou rien (tout le catalogue).
  const target = str(formData, 'target')
  const [targetType, targetId] = target.includes(':') ? target.split(':') : ['', '']

  const startsAt = nullable(formData, 'starts_at')
  const endsAt = nullable(formData, 'ends_at')
  if (startsAt && endsAt && endsAt < startsAt) {
    return { ok: false, message: 'La date de fin précède la date de début.' }
  }

  const payload = {
    code,
    description: nullable(formData, 'description'),
    discount_type: discountType,
    discount_value: discountValue,
    max_redemptions: nullableInt(formData, 'max_redemptions'),
    course_id: targetType === 'course' ? targetId || null : nullable(formData, 'course_id'),
    product_id: targetType === 'product' ? targetId || null : null,
    // Un champ `date` donne « 2026-10-31 », soit minuit au début du jour.
    // Le code expirait donc la veille au soir de la date affichée : on borne
    // au début du premier jour et à la fin du dernier.
    starts_at: startsAt ? `${startsAt}T00:00:00+00:00` : null,
    ends_at: endsAt ? `${endsAt}T23:59:59+00:00` : null,
    active: bool(formData, 'active'),
  }

  const { error } = id
    ? await supabase.from('coupons').update(payload).eq('id', id)
    : await supabase.from('coupons').insert(payload)

  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(user.id, id ? 'coupon.updated' : 'coupon.created', 'coupon', id || null, { code })
  revalidatePath('/admin/codes-promo')
  return { ok: true, message: 'Code promo enregistré.' }
}

export async function toggleCoupon(id: string, active: boolean): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('coupons').update({ active }).eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }
  revalidatePath('/admin/codes-promo')
  return { ok: true, message: active ? 'Code réactivé.' : 'Code désactivé.' }
}

export async function deleteCoupon(id: string): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath('/admin/codes-promo')
  return { ok: true, message: 'Code promo supprimé.' }
}

/* ------------------------------------------------------------------ */
/* Paramètres                                                          */
/* ------------------------------------------------------------------ */

export async function saveSettings(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  // La carte est normalisée AVANT enregistrement : le menu « Intégrer une
  // carte » de Google donne un snippet `<iframe …>` complet, pas une URL, et
  // le déposer tel quel dans un attribut `src` donnait une carte muette sans
  // le moindre message. On accepte donc les deux formes, et on refuse plutôt
  // que de stocker une valeur inexploitable.
  const rawMap = nullable(formData, 'map_embed_url')
  const mapEmbedUrl = safeMapEmbedSrc(rawMap)
  if (rawMap && !mapEmbedUrl) {
    return {
      ok: false,
      message:
        'Carte Google Maps : lien non reconnu. Sur Google Maps, ouvrez ' +
        '« Partager » puis l’onglet « Intégrer une carte », et collez ici ce ' +
        'qui est proposé — le code <iframe> entier convient.',
    }
  }

  // Lien d'ouverture : refusé plutôt que stocké s'il ne mène pas à Google
  // Maps — il est affiché sur toutes les pages du site.
  const rawMapsUrl = nullable(formData, 'maps_url')
  const mapsUrl = safeMapsLink(rawMapsUrl)
  if (rawMapsUrl && !mapsUrl) {
    return {
      ok: false,
      message:
        'Lien Google Maps non reconnu. Sur Google Maps, ouvrez « Partager » puis ' +
        '« Copier le lien », et collez l’adresse obtenue (https://maps.app.goo.gl/…).',
    }
  }

  const payload = {
    site_name: str(formData, 'site_name') || 'BIZELAN',
    tagline: nullable(formData, 'tagline'),
    logo_url: nullable(formData, 'logo_url'),
    favicon_url: nullable(formData, 'favicon_url'),
    email: nullable(formData, 'email'),
    phone: nullable(formData, 'phone'),
    whatsapp: nullable(formData, 'whatsapp'),
    whatsapp_float_enabled: bool(formData, 'whatsapp_float_enabled'),
    whatsapp_float_message: nullable(formData, 'whatsapp_float_message'),
    // La base contraint cette colonne à `left` ou `right`. On filtre ici
    // aussi : la contrainte rejetterait l'enregistrement ENTIER, et
    // l'administrateur perdrait toutes ses autres modifications à cause
    // d'une valeur qu'il n'a pas saisie lui-même.
    whatsapp_float_position:
      str(formData, 'whatsapp_float_position') === 'left' ? 'left' : 'right',
    address: nullable(formData, 'address'),
    maps_url: mapsUrl,
    map_embed_url: mapEmbedUrl,

    // Apparence : seules des couleurs sont stockées. Chacune est validée ici —
    // une valeur invalide est écartée plutôt qu'enregistrée, sans quoi elle
    // atteindrait la feuille de style du site public.
    theme: {
      primary: hexOrNull(formData, 'theme_primary'),
      secondary: hexOrNull(formData, 'theme_secondary'),
      gradientFrom: hexOrNull(formData, 'theme_gradient_from'),
      gradientTo: hexOrNull(formData, 'theme_gradient_to'),
      gradientAngle: Math.min(359, Math.max(0, int(formData, 'theme_gradient_angle'))),
      radius: ['sm', 'md', 'lg'].includes(str(formData, 'theme_radius'))
        ? str(formData, 'theme_radius')
        : 'md',
    },

    nav_links: navLinks(formData, 'nav_links'),
    legal_links: navLinks(formData, 'legal_links'),
    opening_hours: json(formData, 'opening_hours', [] as unknown[]),
    social_links: json(formData, 'social_links', {} as Record<string, string>),
    bank_transfer_instructions: nullable(formData, 'bank_transfer_instructions'),
    legal_notice: nullable(formData, 'legal_notice'),
    terms: nullable(formData, 'terms'),
    privacy_policy: nullable(formData, 'privacy_policy'),
    payments_online_enabled: bool(formData, 'payments_online_enabled'),
    payments_transfer_enabled: bool(formData, 'payments_transfer_enabled'),
    announcement: nullable(formData, 'announcement'),
    announcement_active: bool(formData, 'announcement_active'),
    default_seo_title: nullable(formData, 'default_seo_title'),
    default_seo_description: nullable(formData, 'default_seo_description'),
  }

  // Une couleur mal choisie se voit sur tout le site : l'état précédent est
  // conservé pour pouvoir y revenir d'un clic.
  await snapshot('settings', '1', user.id)

  const { error } = await supabase.from('site_settings').update(payload).eq('id', 1)
  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(user.id, 'settings.updated', 'site_settings', null)
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Paramètres enregistrés.' }
}

/* ------------------------------------------------------------------ */
/* Traduction des erreurs base de données                              */
/* ------------------------------------------------------------------ */

function mapError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('duplicate key') && m.includes('slug'))
    return 'Cette adresse (slug) est déjà utilisée. Choisissez-en une autre.'
  if (m.includes('duplicate key') && m.includes('code'))
    return 'Ce code promo existe déjà.'
  if (m.includes('duplicate key')) return 'Cet élément existe déjà.'
  if (m.includes('violates foreign key')) return 'Un élément lié est introuvable.'
  if (m.includes('violates not-null')) return 'Un champ obligatoire est vide.'
  console.error('[admin] erreur base :', message)
  return 'L’enregistrement a échoué. Merci de réessayer.'
}

/* ------------------------------------------------------------------ */
/* Apparence et navigation                                             */
/* ------------------------------------------------------------------ */

/**
 * Couleur hexadécimale, ou `null`.
 *
 * La valeur finit dans une feuille de style servie au visiteur : elle est
 * validée ici et pas seulement à l'affichage. Une saisie libre écartée à la
 * source ne peut pas devenir une surprise plus tard.
 */
function hexOrNull(formData: FormData, name: string): string | null {
  const raw = str(formData, name)
  return parseHex(raw) ? raw.trim().toLowerCase() : null
}

/**
 * Liste de liens de navigation.
 *
 * Les entrées sans libellé ou sans adresse sont écartées : l'éditeur de liste
 * laisse toujours une ligne vide en bas, et l'enregistrer produirait un lien
 * fantôme dans le menu. L'adresse est bornée aux formes internes et aux URL
 * http(s) — un `javascript:` dans un menu serait une porte ouverte.
 */
function navLinks(formData: FormData, name: string): { label: string; href: string }[] {
  const raw = json(formData, name, [] as unknown[])
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const label = typeof record.label === 'string' ? record.label.trim() : ''
      const href = typeof record.href === 'string' ? record.href.trim() : ''
      if (!label || !href) return null
      if (!/^(\/|https?:\/\/|mailto:|tel:|#)/i.test(href)) return null
      return { label: label.slice(0, 80), href: href.slice(0, 500) }
    })
    .filter((item): item is { label: string; href: string } => item !== null)
    .slice(0, 20)
}

/* ------------------------------------------------------------------ */
/* Retour à une révision                                               */
/* ------------------------------------------------------------------ */

/**
 * Remet une page ou les réglages dans l'état d'une révision.
 *
 * La restauration passe par `snapshot` comme n'importe quelle écriture :
 * l'état qu'on abandonne est donc conservé, et revenir sur une restauration
 * ne demande aucun code de plus.
 *
 * `slug` et `is_home` ne sont jamais réécrits — voir `restorablePayload` :
 * on restaure un CONTENU, pas une identité. Reprendre une ancienne adresse
 * casserait les liens entrants, et reprendre `is_home` déplacerait la page
 * d'accueil sans que personne l'ait demandé.
 */
export async function restoreRevision(revisionId: string): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const revision = await getRevision(revisionId)
  if (!revision) return { ok: false, message: 'Cette révision n’existe plus.' }

  const payload = restorablePayload(revision.payload)
  const table = revision.entity === 'page' ? 'pages' : 'site_settings'

  await snapshot(revision.entity, revision.entity_id, user.id)

  const { error } = await supabase.from(table).update(payload).eq('id', revision.entity_id)
  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(user.id, `${revision.entity}.restored`, revision.entity, revision.entity_id, {
    revision_id: revisionId,
    revision_date: revision.created_at,
  })

  // Le site public tout entier peut dépendre de ce qui vient d'être restauré :
  // une couleur, un menu, une page d'accueil. On revalide largement.
  revalidatePath('/', 'layout')
  if (revision.entity === 'page') {
    revalidatePath('/admin/pages')
    const slug = typeof revision.payload.slug === 'string' ? revision.payload.slug : null
    if (slug) revalidatePath(`/${slug}`)
  } else {
    revalidatePath('/admin/parametres')
  }

  return {
    ok: true,
    message: `Version du ${new Date(revision.created_at).toLocaleString('fr-FR')} restaurée.`,
  }
}

/* ------------------------------------------------------------------ */
/* Relances                                                            */
/* ------------------------------------------------------------------ */

/**
 * Consigne qu'une relance a été faite — commande abandonnée, apprenant
 * inactif, demande d'avis. Rien n'est envoyé d'ici : l'administrateur écrit
 * depuis son propre WhatsApp ou sa messagerie. La trace évite de relancer
 * deux fois la même personne, et de se demander « qui s'en est occupé ? ».
 */
export async function markFollowedUp(
  kind: 'order' | 'learner' | 'review',
  entityId: string,
  channel: 'whatsapp' | 'email' | 'other' = 'other',
): Promise<AdminResult> {
  const user = await requireAdmin()
  const entity = kind === 'order' ? 'order' : 'enrollment'
  await logActivity(user.id, `followup.${kind}`, entity, entityId, { channel })
  revalidatePath('/admin/relances')
  return { ok: true, message: 'Relance notée.' }
}

/* ------------------------------------------------------------------ */
/* Abonnés à la newsletter                                             */
/* ------------------------------------------------------------------ */

export async function setSubscriberStatus(id: string, unsubscribed: boolean): Promise<AdminResult> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('newsletter_subscribers').update({ unsubscribed }).eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }
  revalidatePath('/admin/abonnes')
  return { ok: true, message: unsubscribed ? 'Abonné désinscrit.' : 'Abonné réinscrit.' }
}

export async function deleteSubscriber(id: string): Promise<AdminResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }
  // Suppression à la demande d'une personne : la trace ne garde pas l'adresse.
  await logActivity(user.id, 'subscriber.deleted', 'newsletter', id)
  revalidatePath('/admin/abonnes')
  return { ok: true, message: 'Abonné supprimé.' }
}
