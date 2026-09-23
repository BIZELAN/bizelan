import { createClient } from '@/lib/supabase/server'
import type {
  Course,
  CourseWithCurriculum,
  Enrollment,
  ModuleWithLessons,
  Page,
  Post,
  Review,
  Service,
  SiteSettings,
} from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Paramètres du site                                                  */
/* ------------------------------------------------------------------ */

const FALLBACK_SETTINGS: SiteSettings = {
  id: 1,
  site_name: 'BIZELAN',
  tagline: null,
  logo_url: null,
  favicon_url: null,
  email: null,
  phone: null,
  whatsapp: null,
  address: null,
  map_embed_url: null,
  opening_hours: [],
  social_links: {},
  bank_transfer_instructions: null,
  legal_notice: null,
  terms: null,
  privacy_policy: null,
  payments_online_enabled: true,
  payments_transfer_enabled: true,
  announcement: null,
  announcement_active: false,
  default_seo_title: null,
  default_seo_description: null,
  updated_at: new Date().toISOString(),
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single()
    return (data as SiteSettings) ?? FALLBACK_SETTINGS
  } catch {
    // Base non encore configurée : on sert des valeurs neutres plutôt qu'une erreur.
    return FALLBACK_SETTINGS
  }
}

/* ------------------------------------------------------------------ */
/* Formations                                                          */
/* ------------------------------------------------------------------ */

export async function getPublishedCourses(options?: {
  limit?: number
  featuredOnly?: boolean
}): Promise<Course[]> {
  const supabase = await createClient()
  let query = supabase
    .from('courses')
    .select('*')
    .eq('status', 'published')
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })

  if (options?.featuredOnly) query = query.eq('featured', true)
  if (options?.limit) query = query.limit(options.limit)

  const { data } = await query
  return (data as Course[]) ?? []
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('courses').select('*').eq('slug', slug).maybeSingle()
  return (data as Course) ?? null
}

/** Formation + programme complet (modules, leçons, ressources). */
export async function getCourseWithCurriculum(
  slug: string,
  userId?: string,
): Promise<CourseWithCurriculum | null> {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<Course>()

  if (!course) return null

  const { data: modules } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', course.id)
    .order('position')

  const moduleIds = (modules ?? []).map((m) => m.id)

  const { data: lessons } = moduleIds.length
    ? await supabase.from('lessons').select('*').in('module_id', moduleIds).order('position')
    : { data: [] }

  const lessonIds = (lessons ?? []).map((l) => l.id)

  const [{ data: courseResources }, { data: lessonResources }, { data: progress }] =
    await Promise.all([
      supabase.from('resources').select('*').eq('course_id', course.id).order('position'),
      lessonIds.length
        ? supabase.from('resources').select('*').in('lesson_id', lessonIds).order('position')
        : Promise.resolve({ data: [] as never[] }),
      userId && lessonIds.length
        ? supabase
            .from('lesson_progress')
            .select('*')
            .eq('user_id', userId)
            .in('lesson_id', lessonIds)
        : Promise.resolve({ data: [] as never[] }),
    ])

  const progressByLesson = new Map((progress ?? []).map((p) => [p.lesson_id, p]))
  const resourcesByLesson = new Map<string, typeof lessonResources>()
  for (const r of lessonResources ?? []) {
    const list = resourcesByLesson.get(r.lesson_id!) ?? []
    list.push(r)
    resourcesByLesson.set(r.lesson_id!, list)
  }

  const modulesWithLessons: ModuleWithLessons[] = (modules ?? []).map((m) => ({
    ...m,
    lessons: (lessons ?? [])
      .filter((l) => l.module_id === m.id)
      .map((l) => ({
        ...l,
        progress: progressByLesson.get(l.id) ?? null,
        resources: resourcesByLesson.get(l.id) ?? [],
      })),
  }))

  return {
    ...course,
    modules: modulesWithLessons,
    resources: courseResources ?? [],
  }
}

export async function getCourseStats(courseId: string) {
  const supabase = await createClient()
  const [{ count: lessonCount }, { count: studentCount }] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, course_modules!inner(course_id)', { count: 'exact', head: true })
      .eq('course_modules.course_id', courseId),
    supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .in('state', ['active', 'completed']),
  ])

  return { lessonCount: lessonCount ?? 0, studentCount: studentCount ?? 0 }
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

export async function getPublishedServices(limit?: number): Promise<Service[]> {
  const supabase = await createClient()
  let query = supabase
    .from('services')
    .select('*')
    .eq('status', 'published')
    .order('position', { ascending: true })

  if (limit) query = query.limit(limit)
  const { data } = await query
  return (data as Service[]) ?? []
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('services').select('*').eq('slug', slug).maybeSingle()
  return (data as Service) ?? null
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('pages').select('*').eq('slug', slug).maybeSingle()
  return (data as Page) ?? null
}

export async function getHomePage(): Promise<Page | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pages')
    .select('*')
    .eq('is_home', true)
    .eq('status', 'published')
    .maybeSingle()
  return (data as Page) ?? null
}

/* ------------------------------------------------------------------ */
/* Blog                                                                */
/* ------------------------------------------------------------------ */

export async function getPublishedPosts(options?: {
  limit?: number
  categorySlug?: string
}): Promise<Post[]> {
  const supabase = await createClient()
  let query = supabase
    .from('bz_posts')
    .select('*, categories(slug, name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (options?.limit) query = query.limit(options.limit)

  const { data } = await query
  let posts = (data as Post[]) ?? []

  if (options?.categorySlug) {
    posts = posts.filter(
      (p) => (p as unknown as { categories?: { slug: string } }).categories?.slug === options.categorySlug,
    )
  }

  return posts
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bz_posts')
    .select('*, categories(slug, name)')
    .eq('slug', slug)
    .maybeSingle()
  return (data as Post) ?? null
}

/* ------------------------------------------------------------------ */
/* Avis                                                                */
/* ------------------------------------------------------------------ */

export async function getApprovedReviews(courseId?: string, limit = 6): Promise<Review[]> {
  const supabase = await createClient()
  let query = supabase
    .from('reviews')
    .select('*')
    .eq('status', 'approved')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (courseId) query = query.eq('course_id', courseId)

  const { data } = await query
  return (data as Review[]) ?? []
}

/* ------------------------------------------------------------------ */
/* Espace membre                                                       */
/* ------------------------------------------------------------------ */

export async function getUserEnrollments(
  userId: string,
): Promise<(Enrollment & { course: Course })[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('enrollments')
    .select('*, course:courses(*)')
    .eq('user_id', userId)
    .in('state', ['active', 'completed'])
    .order('created_at', { ascending: false })

  return (data as (Enrollment & { course: Course })[]) ?? []
}
