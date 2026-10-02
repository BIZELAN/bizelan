import type { Metadata } from 'next'
import { Star } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { Badge } from '@/components/ui/badge'
import { EmptyState, Stars } from '@/components/ui/misc'
import { ActionButton, DeleteButton } from '@/components/admin/form-bits'
import { ReviewCreateForm } from '@/components/admin/review-create-form'
import { ReviewReplyForm } from '@/components/admin/review-reply-form'
import { deleteReview, moderateReview } from '@/app/actions/admin'
import { formatDateTime } from '@/lib/utils'
import type { Course, Review } from '@/lib/types'

export const metadata: Metadata = { title: 'Avis' }
export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage() {
  const supabase = createAdminClient()

  const [{ data: reviews }, { data: courses }, { data: products }] = await Promise.all([
    supabase.from('reviews').select('*').order('created_at', { ascending: false }),
    supabase.from('courses').select('id, title').order('title'),
    supabase.from('products').select('id, title'),
  ])

  const list = (reviews as Review[]) ?? []
  const courseNames = new Map(((courses as Course[]) ?? []).map((c) => [c.id, c.title]))
  const productNames = new Map(((products as { id: string; title: string }[]) ?? []).map((p) => [p.id, p.title]))
  // Sujet de l'avis : formation, produit, ou le cabinet quand aucun des deux.
  const subjectOf = (r: Review) =>
    r.course_id
      ? `Formation : ${courseNames.get(r.course_id) ?? '—'}`
      : r.product_id
        ? `Produit : ${productNames.get(r.product_id) ?? '—'}`
        : 'Le cabinet'
  const pending = list.filter((r) => r.status === 'pending')
  const others = list.filter((r) => r.status !== 'pending')

  return (
    <>
      <PageHeader
        title="Avis clients"
        description="Relisez les avis déposés et publiez ceux que vous souhaitez afficher."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {pending.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">À relire ({pending.length})</h2>
              <div className="space-y-3">
                {pending.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    courseTitle={subjectOf(review)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-4 text-lg font-semibold">Tous les avis ({others.length})</h2>
            {others.length === 0 && pending.length === 0 ? (
              <EmptyState
                icon={Star}
                title="Aucun avis"
                description="Les avis déposés par vos clients apparaîtront ici avant publication."
              />
            ) : (
              <div className="space-y-3">
                {others.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    courseTitle={subjectOf(review)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside>
          <ReviewCreateForm courses={courses ?? []} />
        </aside>
      </div>
    </>
  )
}

function ReviewCard({ review, courseTitle }: { review: Review; courseTitle?: string }) {
  return (
    <article className="rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-fg">{review.author_name}</h3>
            {review.featured && <Badge tone="accent">Mis en avant</Badge>}
            <Badge
              tone={
                review.status === 'approved'
                  ? 'success'
                  : review.status === 'rejected'
                    ? 'danger'
                    : 'warning'
              }
            >
              {review.status === 'approved'
                ? 'Publié'
                : review.status === 'rejected'
                  ? 'Rejeté'
                  : 'À relire'}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {formatDateTime(review.created_at)}
            {review.author_role && ` · ${review.author_role}`}
            {courseTitle && ` · ${courseTitle}`}
          </p>
        </div>
        <Stars rating={review.rating} />
      </div>

      {review.comment && (
        <p className="mt-3 rounded-md bg-canvas-subtle p-4 text-sm leading-relaxed text-fg-muted">
          « {review.comment} »
        </p>
      )}

      <ReviewReplyForm id={review.id} initial={review.admin_reply ?? null} />

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        {review.status !== 'approved' && (
          <ActionButton action={moderateReview.bind(null, review.id, 'approved', undefined)}>
            Publier
          </ActionButton>
        )}
        {review.status === 'approved' && (
          <ActionButton
            action={moderateReview.bind(null, review.id, 'approved', !review.featured)}
            variant="outline"
          >
            {review.featured ? 'Retirer la mise en avant' : 'Mettre en avant'}
          </ActionButton>
        )}
        {review.status !== 'rejected' && (
          <ActionButton
            action={moderateReview.bind(null, review.id, 'rejected', undefined)}
            variant="outline"
          >
            Rejeter
          </ActionButton>
        )}
        <DeleteButton
          action={deleteReview.bind(null, review.id)}
          confirmText="Supprimer définitivement cet avis ?"
        />
      </div>
    </article>
  )
}
