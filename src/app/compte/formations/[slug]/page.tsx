import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  Award,
  Check,
  CircleHelp,
  Clock,
  Download,
  Info,
  NotebookPen,
  PlayCircle,
  RotateCcw,
} from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { getCourseWithCurriculum } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { ButtonLink } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/misc'
import { ResourceList } from '@/components/account/resource-list'
import { ReviewForm } from '@/components/account/review-form'
import { CertificateRequestForm } from '@/components/account/certificate-request-form'
import { cn, formatDuration } from '@/lib/utils'
import type { Enrollment } from '@/lib/types'
import { MediaView } from '@/components/ui/media-view'

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

  const allLessons = course.modules.flatMap((m) => m.lessons)
  const lessonIds = allLessons.map((l) => l.id)

  const [{ data: existingReview }, { data: quizRows }, { data: noteRows }] = await Promise.all([
    supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .maybeSingle(),
    lessonIds.length
      ? supabase.from('quizzes').select('lesson_id').eq('is_active', true).in('lesson_id', lessonIds)
      : Promise.resolve({ data: [] as { lesson_id: string }[] }),
    supabase
      .from('lesson_notes')
      .select('lesson_id, body')
      .eq('user_id', user.id)
      .eq('course_id', course.id),
  ])

  const quizLessons = new Set((quizRows ?? []).map((q) => q.lesson_id as string))
  const notedLessons = new Set(
    (noteRows ?? []).filter((n) => (n.body as string)?.trim()).map((n) => n.lesson_id as string),
  )
  const hasReviewed = Boolean(existingReview)

  const isDone = (id: string) => Boolean(allLessons.find((l) => l.id === id)?.progress?.completed)
  const doneCount = allLessons.filter((l) => l.progress?.completed).length

  // Dernière leçon ouverte, puis prochaine à faire : même règle que le
  // tableau de bord, pour que « Reprendre » mène au même endroit partout.
  const lastTouched = allLessons
    .filter((l) => l.progress?.updated_at)
    .sort((a, b) => String(b.progress!.updated_at).localeCompare(String(a.progress!.updated_at)))[0]
  const lastIndex = lastTouched ? allLessons.findIndex((l) => l.id === lastTouched.id) : -1
  const nextLesson =
    (lastTouched && !isDone(lastTouched.id) ? lastTouched : null) ??
    allLessons.slice(lastIndex + 1).find((l) => !isDone(l.id)) ??
    allLessons.find((l) => !isDone(l.id)) ??
    null

  const totalSeconds = allLessons.reduce((s, l) => s + (l.duration_seconds ?? 0), 0)
  const remainingSeconds = allLessons
    .filter((l) => !l.progress?.completed)
    .reduce((s, l) => s + (l.duration_seconds ?? 0), 0)

  const allDone = allLessons.length > 0 && doneCount === allLessons.length
  // Toutes les leçons cochées mais pas de certificat : une condition manque.
  // Le dire évite la question « où est mon certificat ? » par WhatsApp.
  // Formation non certifiante : on félicite, sans promettre de certificat.
  const certifying = course.certificate_enabled !== false
  const certificatePending = certifying && allDone && !enrollment.certificate_code
  const finishedWithoutCertificate = !certifying && allDone
  const currentModuleId = nextLesson?.module_id ?? course.modules[0]?.id

  return (
    <div className="space-y-8">
      <Link
        href="/compte/formations"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-primary-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Mes formations
      </Link>

      {/* ---------- En-tête ---------------------------------------------- */}
      <header className="overflow-hidden rounded-lg border border-line bg-surface shadow-e1">
        <div className="grid md:grid-cols-[1fr_16rem]">
          <div className="p-6 sm:p-7">
            <h1 className="text-2xl sm:text-3xl">{course.title}</h1>
            {course.subtitle && <p className="mt-2 text-fg-muted">{course.subtitle}</p>}

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-subtle">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-primary-text" aria-hidden />
                {doneCount}/{allLessons.length} leçon{allLessons.length > 1 ? 's' : ''}
              </span>
              {totalSeconds > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary-text" aria-hidden />
                  {remainingSeconds > 0
                    ? `${formatDuration(remainingSeconds)} restantes sur ${formatDuration(totalSeconds)}`
                    : `${formatDuration(totalSeconds)} de vidéo`}
                </span>
              )}
            </div>

            <div className="mt-4 max-w-lg">
              <ProgressBar value={enrollment.progress_percent} showLabel />
            </div>

            {nextLesson ? (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ButtonLink href={`/compte/formations/${slug}/${nextLesson.id}`} size="lg">
                  <PlayCircle className="h-5 w-5" aria-hidden />
                  {doneCount > 0 ? 'Reprendre' : 'Commencer la formation'}
                </ButtonLink>
                <span className="min-w-0 text-sm text-fg-muted">
                  {doneCount > 0 ? 'Prochaine leçon : ' : 'Première leçon : '}
                  <span className="font-medium text-fg">{nextLesson.title}</span>
                </span>
              </div>
            ) : (
              allLessons[0] && (
                <div className="mt-6">
                  <ButtonLink href={`/compte/formations/${slug}/${allLessons[0].id}`} variant="outline">
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Revoir depuis le début
                  </ButtonLink>
                </div>
              )
            )}
          </div>
          {course.cover_url && (
            <div className="relative hidden bg-canvas-subtle md:block">
              <MediaView src={course.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          )}
        </div>
      </header>

      {enrollment.certificate_code && (
        <div className="flex flex-col gap-4 rounded-lg border border-success/30 bg-success-subtle p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <Award className="h-10 w-10 shrink-0 text-success" aria-hidden />
            <div>
              <h2 className="font-semibold text-fg">Félicitations, formation terminée !</h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                Votre certificat n° {enrollment.certificate_code} est disponible et vérifiable en ligne.
              </p>
            </div>
          </div>
          <ButtonLink href={`/compte/certificat/${enrollment.certificate_code}`}>
            Voir mon certificat
          </ButtonLink>
        </div>
      )}

      {finishedWithoutCertificate && (
        <div className="flex gap-4 rounded-lg border border-success/30 bg-success-subtle p-6">
          <Award className="h-10 w-10 shrink-0 text-success" aria-hidden />
          <div>
            <h2 className="font-semibold text-fg">Félicitations, formation terminée !</h2>
            <p className="mt-0.5 text-sm text-fg-muted">
              Vous avez suivi toutes les leçons. Cette formation ne délivre pas de certificat.
            </p>
          </div>
        </div>
      )}

      {certificatePending && (
        <section className="overflow-hidden rounded-lg border border-success/30 bg-surface shadow-e1">
          <div className="flex gap-4 bg-success-subtle p-6">
            <Award className="h-10 w-10 shrink-0 text-success" aria-hidden />
            <div>
              <h2 className="font-semibold text-fg">Félicitations, formation terminée !</h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                Votre certificat vous attend. Vérifiez le nom à y inscrire, puis obtenez-le : il est
                téléchargeable en PDF et vérifiable en ligne par un employeur ou un financeur.
              </p>
            </div>
          </div>
          <div className="p-6">
            <CertificateRequestForm courseId={course.id} defaultName={user.profile.full_name ?? ''} />
          </div>
        </section>
      )}

      {certificatePending && (course.min_watch_ratio > 0 || course.require_quiz_pass) && (
        <div className="flex gap-3 rounded-lg border border-info/30 bg-info-subtle p-5 text-sm text-fg">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden />
          <div>
            <p className="font-semibold">Conditions du certificat</p>
            <p className="mt-1 text-fg-muted">
              Le certificat est délivré quand{' '}
              {[
                course.min_watch_ratio > 0 &&
                  `au moins ${Math.round(course.min_watch_ratio * 100)} % de chaque vidéo a été regardé`,
                course.require_quiz_pass && 'tous les questionnaires sont réussis',
              ]
                .filter(Boolean)
                .join(' et ') || 'toutes les conditions de la formation sont remplies'}
              . Si une condition manque, la demande vous indiquera laquelle.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ---------- Programme ------------------------------------------ */}
        <section className="min-w-0">
          <h2 className="mb-4 text-lg font-semibold">Le programme</h2>
          <div className="space-y-3">
            {course.modules.map((courseModule, mi) => {
              const moduleDone = courseModule.lessons.filter((l) => l.progress?.completed).length
              const complete = moduleDone === courseModule.lessons.length && moduleDone > 0
              return (
                <details
                  key={courseModule.id}
                  open={courseModule.id === currentModuleId}
                  className="group overflow-hidden rounded-lg border border-line bg-surface"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas-subtle [&::-webkit-details-marker]:hidden">
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                        complete ? 'bg-success text-success-fg' : 'bg-canvas-subtle text-fg-muted',
                      )}
                    >
                      {complete ? <Check className="h-4 w-4" aria-hidden /> : mi + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-primary-text">
                        Module {mi + 1}
                      </span>
                      <span className="mt-0.5 block font-semibold text-fg">{courseModule.title}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                      {moduleDone}/{courseModule.lessons.length}
                    </span>
                  </summary>

                  <ul className="divide-y divide-line border-t border-line">
                    {courseModule.lessons.map((lesson) => {
                      const done = Boolean(lesson.progress?.completed)
                      const isNext = lesson.id === nextLesson?.id
                      return (
                        <li key={lesson.id}>
                          <Link
                            href={`/compte/formations/${slug}/${lesson.id}`}
                            className={cn(
                              'flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-canvas-subtle',
                              isNext && 'bg-primary-subtle/60',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                                done ? 'bg-primary' : 'border-2 border-line-control',
                              )}
                            >
                              {done && <Check className="h-3.5 w-3.5 text-primary-fg" aria-hidden />}
                            </span>
                            <span className="min-w-0 flex-1 text-[0.9375rem] text-fg">
                              {lesson.title}
                              {isNext && (
                                <span className="ml-2 text-xs font-medium text-primary-text">
                                  · à suivre
                                </span>
                              )}
                            </span>
                            {quizLessons.has(lesson.id) && (
                              <span title="Questionnaire" className="shrink-0 text-fg-subtle">
                                <CircleHelp className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Questionnaire</span>
                              </span>
                            )}
                            {notedLessons.has(lesson.id) && (
                              <span title="Vous avez pris des notes" className="shrink-0 text-fg-subtle">
                                <NotebookPen className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Notes personnelles</span>
                              </span>
                            )}
                            {lesson.duration_seconds > 0 && (
                              <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                                {formatDuration(lesson.duration_seconds)}
                              </span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                    {courseModule.lessons.length === 0 && (
                      <li className="px-5 py-4 text-sm text-fg-subtle">Contenu en préparation.</li>
                    )}
                  </ul>
                </details>
              )
            })}
          </div>
        </section>

        {/* ---------- Colonne latérale ------------------------------------ */}
        <aside className="space-y-6">
          {course.resources && course.resources.length > 0 && (
            <section className="rounded-lg border border-line bg-surface p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
                <Download className="h-[1.125rem] w-[1.125rem] text-primary-text" aria-hidden />
                Supports de travail
              </h2>
              <ResourceList resources={course.resources} />
            </section>
          )}

          {notedLessons.size > 0 && (
            <section className="rounded-lg border border-line bg-surface p-5">
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
                <NotebookPen className="h-[1.125rem] w-[1.125rem] text-primary-text" aria-hidden />
                Mes notes
              </h2>
              <p className="text-sm text-fg-muted">
                Vous avez pris des notes sur {notedLessons.size} leçon
                {notedLessons.size > 1 ? 's' : ''}. Elles sont repérées par l’icône{' '}
                <NotebookPen className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden /> dans le
                programme.
              </p>
            </section>
          )}

          {/* Dépôt d'avis, proposé dès que la formation est bien entamée */}
          {enrollment.progress_percent >= 50 && !hasReviewed && (
            <section className="rounded-lg border border-line bg-surface p-5">
              <h2 className="mb-1 text-base font-semibold">Donnez votre avis</h2>
              <p className="mb-4 text-sm text-fg-muted">
                Votre retour sera publié après relecture et aidera les prochains participants.
              </p>
              <ReviewForm courseId={course.id} />
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
