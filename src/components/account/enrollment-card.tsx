import Link from 'next/link'
import { ArrowRight, Award, Clock, GraduationCap, PlayCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/misc'
import type { EnrollmentSummary } from '@/lib/learner'
import { cn, formatDate, formatDuration } from '@/lib/utils'

/**
 * Carte d'une formation suivie.
 *
 * Elle dit ce qu'on vient chercher en ouvrant son espace : où j'en suis, et
 * quelle est la prochaine leçon. L'ancienne carte ne montrait qu'un
 * pourcentage et un « Continuer » générique, qui renvoyait au sommaire.
 */
export function EnrollmentCard({ summary }: { summary: EnrollmentSummary }) {
  const { course, enrollment, nextLesson } = summary
  const completed = enrollment.state === 'completed'
  const started = summary.lessonsDone > 0
  const href = nextLesson
    ? `/compte/formations/${course.slug}/${nextLesson.id}`
    : `/compte/formations/${course.slug}`

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-e1 transition-all duration-base hover:-translate-y-0.5 hover:border-primary-text/40 hover:shadow-e2">
      <Link href={`/compte/formations/${course.slug}`} className="relative block" tabIndex={-1}>
        <div className="aspect-[16/9] overflow-hidden bg-canvas-subtle">
          {course.cover_url ? (
            <img
              src={course.cover_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/30 to-canvas">
              <GraduationCap className="h-10 w-10 text-primary-text/70" aria-hidden />
            </div>
          )}
        </div>
        <span className="absolute left-3 top-3">
          {completed ? (
            <Badge tone="success">Terminée</Badge>
          ) : started ? (
            <Badge tone="primary">En cours</Badge>
          ) : (
            <Badge tone="neutral">À commencer</Badge>
          )}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-md font-semibold leading-snug text-fg">
          <Link href={`/compte/formations/${course.slug}`} className="hover:text-primary-text">
            {course.title}
          </Link>
        </h3>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs text-fg-subtle">
            <span>
              {summary.lessonsDone}/{summary.lessonsTotal} leçon{summary.lessonsTotal > 1 ? 's' : ''}
            </span>
            {!completed && summary.durationRemaining > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {formatDuration(summary.durationRemaining)} restantes
              </span>
            )}
          </div>
          <ProgressBar value={enrollment.progress_percent} showLabel />
        </div>

        <div className="mt-auto pt-5">
          {completed ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-fg-subtle">
                {enrollment.completed_at ? `Terminée le ${formatDate(enrollment.completed_at)}` : ''}
              </p>
              {enrollment.certificate_code ? (
                <Link
                  href={`/compte/certificat/${enrollment.certificate_code}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-text hover:underline"
                >
                  <Award className="h-4 w-4" aria-hidden />
                  Mon certificat
                </Link>
              ) : (
                <Link
                  href={`/compte/formations/${course.slug}`}
                  className="text-sm font-semibold text-primary-text hover:underline"
                >
                  Revoir la formation
                </Link>
              )}
            </div>
          ) : (
            <Link
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md border border-line bg-canvas-subtle px-3.5 py-3',
                'transition-colors duration-fast hover:border-primary-text/40 hover:bg-primary-subtle',
              )}
            >
              <PlayCircle className="h-5 w-5 shrink-0 text-primary-text" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-fg-subtle">
                  {started ? 'Prochaine leçon' : 'Pour commencer'}
                </span>
                <span className="block truncate text-sm font-medium text-fg">
                  {nextLesson?.title ?? 'Voir le programme'}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
