import type { Metadata } from 'next'
import { Star } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { Badge } from '@/components/ui/badge'
import { EmptyState, Stars } from '@/components/ui/misc'
import { ActionButton, DeleteButton } from '@/components/admin/form-bits'
import { ReviewCreateForm } from '@/components/admin/review-create-form'
import { deleteReview, moderateReview } from '@/app/actions/admin'
import { formatDateTime } from '@/lib/utils'
import type { Course, Review } from '@/lib/types'

export const metadata: Metadata = { title: 'Avis' }
export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage() {
  const supabase = createAdminClient()

  const [{ data: reviews }, { data: courses }] = await Promise.all([
    supabase.from('reviews').select('*').order('created_at', { ascending: false }),
    supabase.from('courses').select('id, title').order('title'),
  ])

  const list = (reviews as Review[]) ?? []
  const courseNames = new Map(((courses as Course[]) ?? []).map((c) => [c.id, c.title]))
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
                    courseTitle={review.course_id ? courseNames.get(review.course_id) : undefined}
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
                    courseTitle={review.course_id ? courseNames.get(review.course_id) : undefined}
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
    <article className="rounded-card border border-surface-700 bg-surface-800 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-onDark-hi">{review.author_name}</h3>
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
          <p className="mt-0.5 text-xs text-onDark-lo">
            {formatDateTime(review.created_at)}
            {review.author_role && ` · ${review.author_role}`}
            {courseTitle && ` · ${courseTitle}`}
          </p>
        </div>
        <Stars rating={review.rating} />
      </div>

      {review.comment && (
        <p className="mt-3 rounded-control bg-surface-900 p-4 text-sm leading-relaxed text-onDark-md">
          « {review.comment} »
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-surface-700 pt-4">
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
