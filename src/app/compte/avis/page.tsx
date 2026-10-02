import type { Metadata } from 'next'
import { Building2, GraduationCap, MessageSquareHeart, Package } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReviewForm } from '@/components/account/review-form'
import { Badge } from '@/components/ui/badge'
import { Stars } from '@/components/ui/misc'
import { getSiteSettings } from '@/lib/queries'
import { cn, formatDate } from '@/lib/utils'
import type { Course, Enrollment, Product, ProductPurchase, Review, ReviewTargetType } from '@/lib/types'

export const metadata: Metadata = { title: 'Mes avis' }
export const dynamic = 'force-dynamic'

interface Subject {
  key: string
  type: ReviewTargetType
  id: string | null
  slug: string | null
  title: string
  kindLabel: string
  review: Review | null
}

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  approved: { label: 'Publié', tone: 'success' },
  pending: { label: 'En relecture', tone: 'warning' },
  rejected: { label: 'Non publié', tone: 'danger' },
}

/**
 * Espace « Mes avis ».
 *
 * Tout ce que le client peut noter, au même endroit : ses formations, ses
 * produits, et le cabinet lui-même. C'est la page vers laquelle pointent les
 * demandes d'avis envoyées depuis « Relances » — le paramètre `?formation=`
 * ou `?produit=` ouvre et met en avant le bon formulaire.
 */
export default async function MyReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ formation?: string; produit?: string; cabinet?: string }>
}) {
  const params = await searchParams
  const user = await requireUser('/compte/avis')
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: enrollments }, { data: purchases }, { data: reviews }, settings] = await Promise.all([
    supabase
      .from('enrollments')
      .select('id, course_id, progress_percent, course:courses(id, slug, title)')
      .eq('user_id', user.id)
      .in('state', ['active', 'completed']),
    supabase
      .from('product_purchases')
      .select('id, product_id, product:products(id, slug, title)')
      .eq('user_id', user.id)
      .eq('state', 'active'),
    // Lecture par la clé de service, filtrée sur le compte : la politique de
    // lecture des avis publiés ne montre pas au client ceux en relecture.
    admin.from('reviews').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    getSiteSettings(),
  ])

  const own = (reviews as Review[] | null) ?? []
  const findReview = (type: ReviewTargetType, id: string | null) =>
    own.find((r) =>
      type === 'course'
        ? r.course_id === id
        : type === 'product'
          ? r.product_id === id
          : !r.course_id && !r.product_id,
    ) ?? null

  const subjects: Subject[] = [
    ...((enrollments ?? []) as unknown as (Enrollment & { course: Pick<Course, 'id' | 'slug' | 'title'> | null })[])
      .filter((e) => e.course)
      .map((e) => ({
        key: `course:${e.course!.slug}`,
        type: 'course' as const,
        id: e.course!.id,
        slug: e.course!.slug,
        title: e.course!.title,
        kindLabel: 'Formation',
        review: findReview('course', e.course!.id),
      })),
    ...((purchases ?? []) as unknown as (ProductPurchase & { product: Pick<Product, 'id' | 'slug' | 'title'> | null })[])
      .filter((p) => p.product)
      .map((p) => ({
        key: `product:${p.product!.slug}`,
        type: 'product' as const,
        id: p.product!.id,
        slug: p.product!.slug,
        title: p.product!.title,
        kindLabel: 'Produit',
        review: findReview('product', p.product!.id),
      })),
    {
      key: 'site',
      type: 'site',
      id: null,
      slug: null,
      title: `Votre expérience avec ${settings.site_name}`,
      kindLabel: 'Le cabinet',
      review: findReview('site', null),
    },
  ]

  const focused = params.formation
    ? `course:${params.formation}`
    : params.produit
      ? `product:${params.produit}`
      : params.cabinet !== undefined
        ? 'site'
        : null

  // Le sujet demandé passe en tête, puis ceux qui attendent encore un avis.
  subjects.sort((a, b) => {
    if (a.key === focused) return -1
    if (b.key === focused) return 1
    return Number(Boolean(a.review)) - Number(Boolean(b.review))
  })

  const waiting = subjects.filter((s) => !s.review).length

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl">Mes avis</h1>
        <p className="mt-1 text-fg-muted">
          Notez vos formations, vos produits et votre accompagnement. Chaque avis est relu par
          l’équipe avant publication, et vous pouvez le modifier à tout moment.
        </p>
        {waiting > 0 && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary-subtle px-3 py-1.5 text-sm font-medium text-primary-text">
            <MessageSquareHeart className="h-4 w-4" aria-hidden />
            {waiting} avis à donner
          </p>
        )}
      </header>

      <ul className="space-y-4">
        {subjects.map((subject) => {
          const Icon = subject.type === 'course' ? GraduationCap : subject.type === 'product' ? Package : Building2
          const status = subject.review ? STATUS[subject.review.status] : null
          const isFocused = subject.key === focused
          return (
            <li
              key={subject.key}
              id={subject.key.replace(':', '-')}
              className={cn(
                'scroll-mt-24 rounded-lg border bg-surface p-5 shadow-e1 sm:p-6',
                isFocused ? 'border-primary-text ring-2 ring-primary-text/30' : 'border-line',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary-text">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{subject.kindLabel}</p>
                    <p className="mt-0.5 font-semibold leading-snug text-fg">{subject.title}</p>
                  </div>
                </div>
                {status && <Badge tone={status.tone}>{status.label}</Badge>}
              </div>

              {subject.review && (
                <div className="mt-4 rounded-md bg-canvas-subtle p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={subject.review.rating} />
                    <span className="text-xs text-fg-subtle">
                      Déposé le {formatDate(subject.review.updated_at ?? subject.review.created_at)}
                    </span>
                  </div>
                  {subject.review.comment && (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                      {subject.review.comment}
                    </p>
                  )}
                  {subject.review.admin_reply && (
                    <div className="mt-3 border-l-2 border-primary-text pl-3 text-sm">
                      <p className="font-medium text-fg">Réponse de l’équipe</p>
                      <p className="mt-0.5 text-fg-muted">{subject.review.admin_reply}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Ouvert d'emblée pour un sujet sans avis ou demandé par le lien ;
                  replié sinon, pour une modification ponctuelle. */}
              {subject.review && !isFocused ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-primary-text hover:underline">
                    Modifier mon avis
                  </summary>
                  <div className="mt-4">
                    <ReviewForm
                      targetType={subject.type}
                      targetId={subject.id}
                      initial={subject.review}
                      defaultName={user.profile.full_name ?? ''}
                      defaultRole={user.profile.activity ?? ''}
                    />
                  </div>
                </details>
              ) : (
                <div className="mt-5">
                  <ReviewForm
                    targetType={subject.type}
                    targetId={subject.id}
                    initial={subject.review}
                    defaultName={user.profile.full_name ?? ''}
                    defaultRole={user.profile.activity ?? ''}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
