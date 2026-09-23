import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, Award, Check, Download, PlayCircle } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { getCourseWithCurriculum } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { ButtonLink } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'
import { ResourceList } from '@/components/account/resource-list'
import { ReviewForm } from '@/components/account/review-form'
import { formatDuration } from '@/lib/utils'
import type { Enrollment } from '@/lib/types'

export const metadata: Metadata = { title: 'Ma formation' }

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await requireUser(`/compte/formations/${slug}`)
  const course = await getCourseWithCurriculum(slug, user.id)

  if (!course) notFound()

  const supabase = await createClient()
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .in('state', ['active', 'completed'])
    .maybeSingle<Enrollment>()

  // Sans inscription active, on renvoie vers la page de vente.
  if (!enrollment) redirect(`/formations/${slug}`)

  // Un seul avis par personne et par formation.
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  const hasReviewed = Boolean(existingReview)

  const allLessons = course.modules.flatMap((m) => m.lessons)
  const nextLesson = allLessons.find((l) => !l.progress?.completed) ?? allLessons[0]
  const doneCount = allLessons.filter((l) => l.progress?.completed).length

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/compte"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-primary-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Mes formations
        </Link>

        <h1 className="text-2xl sm:text-3xl">{course.title}</h1>
        {course.subtitle && <p className="mt-2 text-fg-muted">{course.subtitle}</p>}

        <div className="mt-6 rounded-lg border border-line bg-surface p-5">
          <div className="mb-3 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-fg-muted">
              {doneCount} leçon{doneCount > 1 ? 's' : ''} terminée{doneCount > 1 ? 's' : ''} sur{' '}
              {allLessons.length}
            </span>
            <span className="text-sm font-bold tabular-nums text-primary-text">
              {enrollment.progress_percent}%
            </span>
          </div>
          <ProgressBar value={enrollment.progress_percent} />

          {nextLesson && (
            <div className="mt-5">
              <ButtonLink href={`/compte/formations/${slug}/${nextLesson.id}`} size="lg">
                <PlayCircle className="h-5 w-5" aria-hidden />
                {doneCount > 0 ? 'Reprendre où je me suis arrêté' : 'Commencer la formation'}
                <ArrowRight className="h-5 w-5" aria-hidden />
              </ButtonLink>
            </div>
          )}
        </div>
      </div>

      {enrollment.certificate_code && (
        <div className="flex flex-col gap-4 rounded-lg border-2 border-primary-text/40 bg-primary-subtle p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <Award className="h-10 w-10 shrink-0 text-primary-text" aria-hidden />
            <div>
              <h2 className="font-semibold text-primary-text">Formation terminée</h2>
              <p className="mt-0.5 text-sm text-primary-text">
                Votre certificat est disponible — n° {enrollment.certificate_code}
              </p>
            </div>
          </div>
          <ButtonLink href={`/compte/certificat/${enrollment.certificate_code}`} variant="primary">
            Voir mon certificat
          </ButtonLink>
        </div>
      )}

      {/* Dépôt d'avis, proposé dès que la formation est bien entamée */}
      {enrollment.progress_percent >= 50 && !hasReviewed && (
        <section className="rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-1 text-lg font-semibold">Donnez votre avis</h2>
          <p className="mb-5 text-sm text-fg-muted">
            Votre retour sera publié après relecture et aidera les prochains participants.
          </p>
          <ReviewForm courseId={course.id} />
        </section>
      )}

      {/* Supports téléchargeables de la formation */}
      {course.resources && course.resources.length > 0 && (
        <section className="rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Download className="h-5 w-5 text-primary-text" aria-hidden />
            Vos supports de travail
          </h2>
          <ResourceList resources={course.resources} />
        </section>
      )}

      {/* Programme */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Le programme</h2>
        <div className="space-y-4">
          {course.modules.map((courseModule, mi) => {
            const moduleDone = courseModule.lessons.filter((l) => l.progress?.completed).length
            return (
              <div key={courseModule.id} className="overflow-hidden rounded-lg border border-line bg-surface">
                <div className="flex items-center justify-between gap-4 border-b border-line bg-canvas-subtle px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-text">
                      Module {mi + 1}
                    </p>
                    <h3 className="mt-0.5 font-semibold text-fg">{courseModule.title}</h3>
                  </div>
                  <Badge tone={moduleDone === courseModule.lessons.length && moduleDone > 0 ? 'success' : 'neutral'}>
                    {moduleDone}/{courseModule.lessons.length}
                  </Badge>
                </div>

                <ul className="divide-y divide-line">
                  {courseModule.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/compte/formations/${slug}/${lesson.id}`}
                        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-canvas-subtle"
                      >
                        <span
                          className={
                            lesson.progress?.completed
                              ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary'
                              : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-line-strong'
                          }
                        >
                          {lesson.progress?.completed && (
                            <Check className="h-3.5 w-3.5 text-primary-fg" aria-hidden />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 text-[0.9375rem] text-fg">
                          {lesson.title}
                        </span>
                        {lesson.duration_seconds > 0 && (
                          <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                            {formatDuration(lesson.duration_seconds)}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
