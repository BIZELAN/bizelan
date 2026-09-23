import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Check, Download, FileText } from 'lucide-react'

import { requireUser, hasCourseAccess } from '@/lib/auth'
import { getCourseWithCurriculum } from '@/lib/queries'
import { RichContentView } from '@/components/ui/rich-content'
import { parseRichContent } from '@/lib/rich-content'
import { ProgressBar } from '@/components/ui/misc'
import { ResourceList } from '@/components/account/resource-list'
import { LessonActions, VideoFrame } from '@/components/account/lesson-player'
import { env } from '@/lib/env'
import { cn, formatDuration } from '@/lib/utils'

export const metadata: Metadata = { title: 'Leçon' }

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const user = await requireUser(`/compte/formations/${slug}/${lessonId}`)
  const course = await getCourseWithCurriculum(slug, user.id)

  if (!course) notFound()

  const allowed = await hasCourseAccess(user.id, course.id)
  if (!allowed) redirect(`/formations/${slug}`)

  const flat = course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })))
  const index = flat.findIndex((l) => l.id === lessonId)
  if (index === -1) notFound()

  const lesson = flat[index]
  const next = flat[index + 1] ?? null
  const previous = flat[index - 1] ?? null
  const doneCount = flat.filter((l) => l.progress?.completed).length
  const progressPercent = flat.length ? Math.round((doneCount / flat.length) * 100) : 0

  const hasNotes = Boolean(lesson.content)
  // Normalisé ici plutôt que testé en place : TypeScript n'affine pas un
  // tableau optionnel à travers un booléen intermédiaire, et la solution
  // par `!` ne fait que masquer la question.
  const resources = lesson.resources ?? []

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        {/* ---------- Situation ------------------------------------------- */}
        <div>
          <Link
            href={`/compte/formations/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors duration-fast hover:text-primary-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {course.title}
          </Link>

          {/* « Leçon 4 sur 23 » situe l'apprenant dans le parcours. Le module
              seul ne le disait pas, et la barre de progression du sommaire
              donne un pourcentage, pas une position. */}
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-subtle">
            <span className="font-medium text-primary-text">
              Leçon {index + 1} sur {flat.length}
            </span>
            <span aria-hidden>·</span>
            <span className="min-w-0 truncate">{lesson.moduleTitle}</span>
            {lesson.duration_seconds > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>{formatDuration(lesson.duration_seconds)}</span>
              </>
            )}
          </p>

          <h1 className="mt-2 text-2xl sm:text-3xl">{lesson.title}</h1>
        </div>

        <VideoFrame
          title={lesson.title}
          lessonId={lesson.id}
          courseId={course.id}
          resumeAt={lesson.progress?.last_position_seconds ?? 0}
          source={{
            provider: lesson.video_provider,
            videoId: lesson.video_id,
            videoUrl: lesson.video_url,
            bunnyHostname: env.bunnyCdnHostname || undefined,
          }}
        />

        {/* ---------- Un seul panneau de contenu ---------------------------
            La description flottait en texte nu, les notes et les supports
            occupaient chacun leur carte : trois traitements pour une même
            chose — ce qu'il y a à lire après la vidéo. Ils partagent
            désormais un panneau, séparés par des filets. */}
        {(lesson.description || hasNotes || resources.length > 0) && (
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {lesson.description && (
              <p className="p-6 text-md leading-relaxed text-fg-muted">{lesson.description}</p>
            )}

            {hasNotes && (
              <section className="p-6">
                <SectionTitle icon={FileText}>Notes de la leçon</SectionTitle>
                <RichContentView content={parseRichContent(lesson.content)} />
              </section>
            )}

            {resources.length > 0 && (
              <section className="p-6">
                <SectionTitle icon={Download}>Supports de cette leçon</SectionTitle>
                <ResourceList resources={resources} />
              </section>
            )}
          </div>
        )}

        <LessonActions
          lessonId={lesson.id}
          courseId={course.id}
          courseSlug={slug}
          initialCompleted={Boolean(lesson.progress?.completed)}
          previousHref={previous ? `/compte/formations/${slug}/${previous.id}` : null}
          previousLabel={previous?.title ?? null}
          nextHref={next ? `/compte/formations/${slug}/${next.id}` : null}
          nextLabel={next?.title ?? null}
        />
      </div>

      {/* ---------- Sommaire ---------------------------------------------- */}
      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto">
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="border-b border-line p-4">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                Progression
              </p>
              <p className="text-xs tabular-nums text-fg-subtle">
                {doneCount}/{flat.length}
              </p>
            </div>
            <ProgressBar value={progressPercent} showLabel />
          </div>

          <div className="p-2">
            {course.modules.map((courseModule, mi) => {
              const moduleDone = courseModule.lessons.filter((l) => l.progress?.completed).length
              return (
                <div key={courseModule.id} className="mb-3 last:mb-0">
                  <div className="flex items-baseline justify-between gap-2 px-2 py-1.5">
                    <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                      {mi + 1}. {courseModule.title}
                    </p>
                    <p className="shrink-0 text-xs tabular-nums text-fg-subtle">
                      {moduleDone}/{courseModule.lessons.length}
                    </p>
                  </div>

                  <ul className="space-y-0.5">
                    {courseModule.lessons.map((l) => {
                      const current = l.id === lessonId
                      const done = Boolean(l.progress?.completed)
                      return (
                        <li key={l.id}>
                          <Link
                            href={`/compte/formations/${slug}/${l.id}`}
                            aria-current={current ? 'page' : undefined}
                            className={cn(
                              'flex items-start gap-2.5 rounded-md px-2 py-2 text-sm',
                              'transition-colors duration-fast',
                              current
                                ? 'bg-primary-subtle font-medium text-primary-text'
                                : // Le survol pointait sur `bg-surface`, la
                                  // couleur du panneau lui-même : il ne
                                  // produisait donc aucun changement.
                                  'text-fg-muted hover:bg-canvas-subtle hover:text-fg',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                                done ? 'bg-primary' : 'border border-line-control bg-surface',
                              )}
                            >
                              {done && <Check className="h-2.5 w-2.5 text-primary-fg" aria-hidden />}
                            </span>

                            <span className="min-w-0 flex-1 leading-snug">{l.title}</span>

                            {l.duration_seconds > 0 && (
                              <span className="mt-0.5 shrink-0 text-xs tabular-nums text-fg-subtle">
                                {formatDuration(l.duration_seconds)}
                              </span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </aside>
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof FileText
  children: React.ReactNode
}) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-fg">
      <Icon className="h-[1.125rem] w-[1.125rem] shrink-0 text-primary-text" aria-hidden />
      {children}
    </h2>
  )
}
