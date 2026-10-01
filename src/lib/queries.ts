import { createClient } from '@/lib/supabase/server'
import type {
  Course,
  CourseWithCurriculum,
  Enrollment,
  ModuleWithLessons,
  Page,
  Post,
  Product,
  ProductFile,
  ProductWithFiles,
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
  whatsapp_float_enabled: true,
  whatsapp_float_message: null,
  whatsapp_float_position: 'right',
  address: null,
  maps_url: null,
  map_embed_url: null,
  opening_hours: [],
  social_links: {},
  bank_transfer_instructions: null,
  legal_notice: null,
  terms: null,
  privacy_policy: null,
  theme: {},
  nav_links: [],
  footer_columns: [],
  legal_links: [],
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
/* Boutique                                                            */
/* ------------------------------------------------------------------ */

export async function getPublishedProducts(options?: {
  limit?: number
  kind?: string
  featuredOnly?: boolean
}): Promise<Product[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('products')
      .select('*')
      .eq('status', 'published')
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })

    if (options?.kind) query = query.eq('kind', options.kind)
    if (options?.featuredOnly) query = query.eq('featured', true)
    if (options?.limit) query = query.limit(options.limit)

    const { data } = await query
    return (data as Product[]) ?? []
  } catch {
    // Migration 0013 pas encore appliquée : la boutique reste vide plutôt
    // que de faire tomber la page d'accueil ou le sitemap.
    return []
  }
}

/** Produit publié et ses fichiers visibles pour l'utilisateur courant. */
export async function getProductBySlug(slug: string): Promise<ProductWithFiles | null> {
  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<Product>()
  if (!product) return null

  // RLS : l'acheteur voit tous les fichiers, le visiteur les seuls extraits.
  const { data: files } = await supabase
    .from('product_files')
    .select('*')
    .eq('product_id', product.id)
    .order('position')

  return { ...product, files: (files as ProductFile[]) ?? [] }
}

/** L'utilisateur possède-t-il ce produit (achat actif) ? */
export async function hasProductAccess(userId: string, productId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('product_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('state', 'active')
    .maybeSingle()
  return Boolean(data)
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

export async function getApprovedReviews(
  courseId?: string,
  limit = 6,
  options?: { productId?: string; siteOnly?: boolean },
): Promise<Review[]> {
  const supabase = await createClient()
  let query = supabase
    .from('reviews')
    .select('*')
    .eq('status', 'approved')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (courseId) query = query.eq('course_id', courseId)
  if (options?.productId) query = query.eq('product_id', options.productId)
  if (options?.siteOnly) query = query.is('course_id', null).is('product_id', null)

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

/**
 * Contenus publiés dont les blocs ont besoin, récupérés en UNE fois.
 *
 * Les blocs `courseGrid`, `serviceGrid`, `postGrid`, `testimonials` et
 * `heroSplit` interrogeaient chacun la base de leur côté : une page qui les
 * réunit déclenchait cinq requêtes en cascade, et le moteur de rendu ne
 * pouvait vivre que côté serveur.
 *
 * Les quatre requêtes ci-dessous partent en parallèle, et le filtrage que
 * faisaient les blocs — « en avant seulement », « les trois premiers » — se
 * refait sans base. Le moteur devient utilisable côté navigateur, ce qui rend
 * l'aperçu de l'administration possible.
 *
 * Les bornes sont larges : elles couvrent le plus gourmand des blocs, et
 * plusieurs blocs du même type puisent dans la même liste.
 */
export async function getBlockData(): Promise<{
  courses: Course[]
  services: Service[]
  posts: Post[]
  reviews: Review[]
  products: Product[]
}> {
  const [courses, services, posts, reviews, products] = await Promise.all([
    getPublishedCourses({ limit: 24 }),
    getPublishedServices(24),
    getPublishedPosts({ limit: 24 }),
    getApprovedReviews(undefined, 24),
    getPublishedProducts({ limit: 24 }),
  ])
  return { courses, services, posts, reviews, products }
}
