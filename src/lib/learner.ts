import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Course, Enrollment, Product, ProductPurchase } from '@/lib/types'

/**
 * Données de l'espace apprenant, lues avec la session de l'utilisateur :
 * les politiques RLS garantissent qu'il ne voit que ce qui est à lui.
 *
 * Le tableau de bord avait besoin de savoir, pour chaque formation, quelle est
 * la PROCHAINE leçon et où l'apprenant s'est arrêté pour la dernière fois.
 * Tout est chargé en quatre requêtes parallèles plutôt qu'une par formation.
 */

export interface LessonRef {
  id: string
  title: string
  moduleTitle: string
  moduleIndex: number
  durationSeconds: number
}

export interface EnrollmentSummary {
  enrollment: Enrollment
  course: Course
  lessonsTotal: number
  lessonsDone: number
  durationTotal: number
  durationRemaining: number
  nextLesson: LessonRef | null
  lastActivityAt: string | null
}

export interface LearnerDashboard {
  enrollments: EnrollmentSummary[]
  /** Leçon ouverte le plus récemment, toutes formations confondues. */
  resume: { summary: EnrollmentSummary; lesson: LessonRef } | null
  watchedSeconds: number
  lessonsDone: number
  certificates: number
  products: (ProductPurchase & { product: Product })[]
}

export async function getLearnerDashboard(userId: string): Promise<LearnerDashboard> {
  const supabase = await createClient()

  const [{ data: enrollmentRows }, { data: purchaseRows }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('*, course:courses(*)')
      .eq('user_id', userId)
      .in('state', ['active', 'completed'])
      .order('created_at', { ascending: false }),
    supabase
      .from('product_purchases')
      .select('*, product:products(*)')
      .eq('user_id', userId)
      .eq('state', 'active')
      .order('created_at', { ascending: false }),
  ])

  const enrollments = ((enrollmentRows ?? []) as (Enrollment & { course: Course | null })[]).filter(
    (e): e is Enrollment & { course: Course } => Boolean(e.course),
  )
  const products = ((purchaseRows ?? []) as (ProductPurchase & { product: Product | null })[]).filter(
    (p): p is ProductPurchase & { product: Product } => Boolean(p.product),
  )

  const courseIds = enrollments.map((e) => e.course_id)
  if (courseIds.length === 0) {
    return {
      enrollments: [],
      resume: null,
      watchedSeconds: 0,
      lessonsDone: 0,
      certificates: 0,
      products,
    }
  }

  const [{ data: modules }, { data: progress }] = await Promise.all([
    supabase
      .from('course_modules')
      .select('id, course_id, title, position')
      .in('course_id', courseIds)
      .order('position'),
    supabase
      .from('lesson_progress')
      .select('lesson_id, course_id, completed, watched_seconds, updated_at')
      .eq('user_id', userId)
      .in('course_id', courseIds),
  ])

  const moduleIds = (modules ?? []).map((m) => m.id)
  const { data: lessons } = moduleIds.length
    ? await supabase
        .from('lessons')
        .select('id, module_id, title, position, duration_seconds')
        .in('module_id', moduleIds)
        .order('position')
    : { data: [] as { id: string; module_id: string; title: string; position: number; duration_seconds: number }[] }

  const progressByLesson = new Map((progress ?? []).map((p) => [p.lesson_id as string, p]))

  const summaries: EnrollmentSummary[] = enrollments.map((enrollment) => {
    const courseModules = (modules ?? []).filter((m) => m.course_id === enrollment.course_id)
    const ordered: LessonRef[] = []
    for (const [index, m] of courseModules.entries()) {
      for (const l of (lessons ?? []).filter((x) => x.module_id === m.id)) {
        ordered.push({
          id: l.id,
          title: l.title,
          moduleTitle: m.title,
          moduleIndex: index + 1,
          durationSeconds: l.duration_seconds ?? 0,
        })
      }
    }

    const done = ordered.filter((l) => progressByLesson.get(l.id)?.completed)
    const courseProgress = (progress ?? []).filter((p) => p.course_id === enrollment.course_id)
    const lastActivityAt =
      courseProgress
        .map((p) => p.updated_at as string)
        .sort()
        .at(-1) ?? null

    // Prochaine leçon : la première non terminée APRÈS la dernière ouverte,
    // sinon la première non terminée du parcours. Reprendre au début d'un
    // module déjà entamé obligeait à tout faire défiler.
    const lastTouched = courseProgress
      .slice()
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0]
    const lastIndex = lastTouched ? ordered.findIndex((l) => l.id === lastTouched.lesson_id) : -1
    const isDone = (l: LessonRef) => Boolean(progressByLesson.get(l.id)?.completed)
    const nextLesson =
      (lastIndex >= 0 && !isDone(ordered[lastIndex]) ? ordered[lastIndex] : null) ??
      ordered.slice(lastIndex + 1).find((l) => !isDone(l)) ??
      ordered.find((l) => !isDone(l)) ??
      null

    const durationTotal = ordered.reduce((sum, l) => sum + l.durationSeconds, 0)
    const durationRemaining = ordered
      .filter((l) => !isDone(l))
      .reduce((sum, l) => sum + l.durationSeconds, 0)

    return {
      enrollment,
      course: enrollment.course,
      lessonsTotal: ordered.length,
      lessonsDone: done.length,
      durationTotal,
      durationRemaining,
      nextLesson,
      lastActivityAt,
    }
  })

  // Formations en cours d'abord, la plus récemment travaillée en tête.
  summaries.sort((a, b) => {
    const aDone = a.enrollment.state === 'completed' ? 1 : 0
    const bDone = b.enrollment.state === 'completed' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    return String(b.lastActivityAt ?? b.enrollment.created_at).localeCompare(
      String(a.lastActivityAt ?? a.enrollment.created_at),
    )
  })

  const resumable = summaries.find((s) => s.nextLesson && s.enrollment.state !== 'completed')

  return {
    enrollments: summaries,
    resume: resumable?.nextLesson ? { summary: resumable, lesson: resumable.nextLesson } : null,
    watchedSeconds: (progress ?? []).reduce((sum, p) => sum + (p.watched_seconds ?? 0), 0),
    lessonsDone: (progress ?? []).filter((p) => p.completed).length,
    certificates: enrollments.filter((e) => e.certificate_code).length,
    products,
  }
}
