import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Award, Check, Download, FileText, ListOrdered } from 'lucide-react'

import { requireUser, hasCourseAccess } from '@/lib/auth'
import { getCourseWithCurriculum } from '@/lib/queries'
import { RichContentView } from '@/components/ui/rich-content'
import { parseRichContent } from '@/lib/rich-content'
import { ProgressBar } from '@/components/ui/misc'
import { ResourceList } from '@/components/account/resource-list'
import { LessonActions, VideoFrame } from '@/components/account/lesson-player'
import { LessonQuiz, type QuizView } from '@/components/account/lesson-quiz'
import { LessonNotes } from '@/components/account/lesson-notes'
import { ButtonLink } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { resolveVideoRef } from '@/lib/video'
import { signVideoTarget } from '@/lib/video-sign'
import { env } from '@/lib/env'
import { cn, formatDuration } from '@/lib/utils'
import type { CourseWithCurriculum } from '@/lib/types'

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
  const courseDone = flat.length > 0 && doneCount === flat.length

  // Le questionnaire est chargé avec la session de l'APPRENANT, pas la clé de
  // service : `is_correct` lui est retiré au niveau des droits, et la requête
  // ne le demande de toute façon pas. Les bonnes réponses ne quittent jamais
  // le serveur — la correction passe par `bz_grade_quiz`.
  const supabase = await createClient()

  // Ouvrir une leçon compte comme une activité : c'est ce qui permet au
  // tableau de bord de proposer « Reprendre » au bon endroit, même quand la
  // vidéo n'a pas été lancée. Un échec ne doit jamais bloquer la leçon.
  const [{ error: touchError }, { data: noteRow }] = await Promise.all([
    supabase.rpc('bz_touch_lesson', { p_lesson: lesson.id, p_course: course.id }),
    supabase
      .from('lesson_notes')
      .select('body')
      .eq('user_id', user.id)
      .eq('lesson_id', lesson.id)
      .maybeSingle<{ body: string }>(),
  ])
  if (touchError) console.error('[leçon] activité non enregistrée :', touchError.message)

  const { data: quizRow } = await supabase
    .from('quizzes')
    .select(
      'id, title, intro, pass_percent, max_attempts, quiz_questions ( id, prompt, position, quiz_choices ( id, label, position ) )',
    )
    .eq('lesson_id', lesson.id)
    .eq('is_active', true)
    .maybeSingle<{
      id: string
      title: string
      intro: string | null
      pass_percent: number
      max_attempts: number
      quiz_questions:
        | { id: string; prompt: string; position: number; quiz_choices: { id: string; label: string; position: number }[] | null }[]
        | null
    }>()

  let quiz: QuizView | null = null
  if (quizRow) {
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('passed')
      .eq('quiz_id', quizRow.id)
      .eq('user_id', user.id)

    quiz = {
      id: quizRow.id,
      title: quizRow.title,
      intro: quizRow.intro,
      passPercent: quizRow.pass_percent,
      maxAttempts: quizRow.max_attempts,
      attemptsUsed: attempts?.length ?? 0,
      alreadyPassed: Boolean(attempts?.some((a) => a.passed)),
      questions: [...(quizRow.quiz_questions ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((q) => ({
          id: q.id,
          prompt: q.prompt,
          choices: [...(q.quiz_choices ?? [])].sort((a, b) => a.position - b.position),
        })),
    }
  }

  // Une vidéo déposée vit dans un bucket privé : aucune URL publique n'existe.
  // On en signe une, valable le temps de la séance, APRÈS le contrôle d'accès
  // plus haut — l'ordre n'est pas indifférent. Un lien recopié depuis
  // l'inspecteur cesse de fonctionner au bout de quelques heures.
  const playable = await signVideoTarget(
    resolveVideoRef({
      provider: lesson.video_provider,
      videoId: lesson.video_id,
      videoUrl: lesson.video_url,
      bunnyHostname: env.bunnyCdnHostname || null,
    }),
  )

  const hasNotes = Boolean(lesson.content)
  // Normalisé ici plutôt que testé en place : TypeScript n'affine pas un
  // tableau optionnel à travers un booléen intermédiaire, et la solution
  // par `!` ne fait que masquer la question.
  const resources = lesson.resources ?? []

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
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

        {/* Sommaire replié, sur mobile seulement : la colonne latérale y
            tombait tout en bas de la page, sous les notes et le questionnaire,
            et l'apprenant ne voyait plus où il se trouvait dans le parcours. */}
        <details className="group rounded-lg border border-line bg-surface xl:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <ListOrdered className="h-[1.125rem] w-[1.125rem] shrink-0 text-primary-text" aria-hidden />
            <span className="flex-1 text-sm font-medium text-fg">Sommaire de la formation</span>
            <span className="text-xs tabular-nums text-fg-subtle">
              {doneCount}/{flat.length}
            </span>
          </summary>
          <div className="border-t border-line p-2">
            <Outline course={course} slug={slug} lessonId={lessonId} />
          </div>
        </details>

        <VideoFrame
          title={lesson.title}
          lessonId={lesson.id}
          courseId={course.id}
          resumeAt={lesson.progress?.last_position_seconds ?? 0}
          playable={playable}
          poster={lesson.video_poster_url}
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

        <LessonNotes lessonId={lesson.id} courseId={course.id} initialBody={noteRow?.body ?? ''} />

        {/* Le questionnaire se place APRÈS le contenu et AVANT les actions :
            on vérifie ses acquis une fois la leçon lue, pas avant. */}
        {quiz && quiz.questions.length > 0 && (
          <LessonQuiz quiz={quiz} courseId={course.id} courseSlug={slug} />
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

        {courseDone && (
          <div className="flex flex-col gap-4 rounded-lg border border-success/30 bg-success-subtle p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <Award className="h-10 w-10 shrink-0 text-success" aria-hidden />
              <div>
                <p className="font-semibold text-fg">Bravo, vous avez terminé toutes les leçons !</p>
                <p className="mt-0.5 text-sm text-fg-muted">
                  Retrouvez votre certificat et laissez votre avis depuis la page de la formation.
                </p>
              </div>
            </div>
            <ButtonLink href={`/compte/formations/${slug}`}>Voir la formation</ButtonLink>
          </div>
        )}
      </div>

      {/* ---------- Sommaire ---------------------------------------------- */}
      <aside className="hidden xl:sticky xl:top-6 xl:block xl:max-h-[calc(100dvh-3rem)] xl:self-start xl:overflow-y-auto">
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
            <Outline course={course} slug={slug} lessonId={lessonId} />
          </div>
        </div>
      </aside>
    </div>
  )
}

/** Plan du parcours : partagé par la colonne latérale et le sommaire mobile. */
function Outline({
  course,
  slug,
  lessonId,
}: {
  course: CourseWithCurriculum
  slug: string
  lessonId: string
}) {
  return (
    <>
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
                          : 'text-fg-muted hover:bg-canvas-subtle hover:text-fg',
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
    </>
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
