import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Check, Download } from 'lucide-react'

import { requireUser, hasCourseAccess } from '@/lib/auth'
import { getCourseWithCurriculum } from '@/lib/queries'
import { RichContentView } from '@/components/ui/rich-content'
import { parseRichContent } from '@/lib/rich-content'
import { ProgressBar } from '@/components/ui/misc'
import { ResourceList } from '@/components/account/resource-list'
import { CompleteButton, VideoFrame } from '@/components/account/lesson-player'
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

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-6">
        <div>
          <Link
            href={`/compte/formations/${slug}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-onDark-md transition-colors hover:text-brand-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {course.title}
          </Link>
          <p className="text-sm text-onDark-lo">{lesson.moduleTitle}</p>
          <h1 className="mt-1 text-2xl sm:text-3xl">{lesson.title}</h1>
          {lesson.duration_seconds > 0 && (
            <p className="mt-2 text-sm text-onDark-lo">{formatDuration(lesson.duration_seconds)}</p>
          )}
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

        <CompleteButton
          lessonId={lesson.id}
          courseId={course.id}
          courseSlug={slug}
          initialCompleted={Boolean(lesson.progress?.completed)}
          nextHref={next ? `/compte/formations/${slug}/${next.id}` : null}
        />

        {lesson.description && (
          <p className="text-[0.9375rem] leading-relaxed text-onDark-md">{lesson.description}</p>
        )}

        {lesson.content && (
          <section className="rounded-card border border-surface-700 bg-surface-800 p-6">
            <h2 className="mb-4 text-lg font-semibold">Notes de la leçon</h2>
            <RichContentView content={parseRichContent(lesson.content)} />
          </section>
        )}

        {lesson.resources && lesson.resources.length > 0 && (
          <section className="rounded-card border border-surface-700 bg-surface-800 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Download className="h-5 w-5 text-brand-300" aria-hidden />
              Supports de cette leçon
            </h2>
            <ResourceList resources={lesson.resources} />
          </section>
        )}

        <div className="flex justify-between gap-3 border-t border-surface-700 pt-6">
          {previous ? (
            <Link
              href={`/compte/formations/${slug}/${previous.id}`}
              className="text-sm font-medium text-onDark-md hover:text-brand-300"
            >
              ← {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/compte/formations/${slug}/${next.id}`}
              className="text-right text-sm font-medium text-onDark-md hover:text-brand-300"
            >
              {next.title} →
            </Link>
          )}
        </div>
      </div>

      {/* Sommaire */}
      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
        <div className="rounded-card border border-surface-700 bg-surface-800">
          <div className="border-b border-surface-700 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-onDark-lo">
              Progression
            </p>
            <ProgressBar value={progressPercent} showLabel />
          </div>

          <div className="p-2">
            {course.modules.map((courseModule, mi) => (
              <div key={courseModule.id} className="mb-3 last:mb-0">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-onDark-lo">
                  {mi + 1}. {courseModule.title}
                </p>
                <ul>
                  {courseModule.lessons.map((l) => {
                    const current = l.id === lessonId
                    return (
                      <li key={l.id}>
                        <Link
                          href={`/compte/formations/${slug}/${l.id}`}
                          aria-current={current ? 'page' : undefined}
                          className={cn(
                            'flex items-start gap-2.5 rounded-control px-2 py-2 text-sm transition-colors',
                            current
                              ? 'bg-brand-400/10 font-medium text-brand-900'
                              : 'text-onDark-md hover:bg-surface-800',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                              l.progress?.completed
                                ? 'bg-brand-600'
                                : 'border border-surface-600 bg-surface-800',
                            )}
                          >
                            {l.progress?.completed && (
                              <Check className="h-2.5 w-2.5 text-white" aria-hidden />
                            )}
                          </span>
                          <span className="min-w-0 leading-snug">{l.title}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
