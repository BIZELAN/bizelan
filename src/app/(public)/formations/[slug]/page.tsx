import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  FileText,
  Lock,
  MonitorSmartphone,
  PlayCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'

import { Accordion } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { RichContentView } from '@/components/ui/rich-content'
import { parseRichContent } from '@/lib/rich-content'
import { SectionHeading, Stars } from '@/components/ui/misc'
import { getApprovedReviews, getCourseStats, getCourseWithCurriculum } from '@/lib/queries'
import { getCurrentUser, hasCourseAccess } from '@/lib/auth'
import { asArray, discountPercent, formatDuration, formatPrice, truncate } from '@/lib/utils'
import type { FaqItem } from '@/lib/types'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const course = await getCourseWithCurriculum(slug)
  if (!course) return { title: 'Formation introuvable' }

  return {
    title: course.seo_title ?? course.title,
    description: course.seo_description ?? truncate(course.summary, 160),
    openGraph: {
      title: course.seo_title ?? course.title,
      description: course.seo_description ?? truncate(course.summary, 160),
      images: course.og_image_url ?? course.cover_url ? [course.og_image_url ?? course.cover_url!] : [],
    },
  }
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getCurrentUser()
  const course = await getCourseWithCurriculum(slug, user?.id)

  if (!course || course.status !== 'published') notFound()

  const [stats, reviews] = await Promise.all([
    getCourseStats(course.id),
    getApprovedReviews(course.id, 3),
  ])

  const enrolled = user ? await hasCourseAccess(user.id, course.id) : false
  const discount = discountPercent(course.price_cents, course.compare_at_price_cents)
  const faq = asArray<FaqItem>(course.faq)
  const whatYouGet = asArray<string>(course.what_you_get)
  const outcomes = asArray<string>(course.outcomes)
  const audience = asArray<string>(course.target_audience)
  const totalSeconds = course.modules.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + (l.duration_seconds ?? 0), 0),
    0,
  )

  return (
    <>
      {/* En-tête */}
      <section className="bg-surface-950 text-white">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.4fr_1fr] lg:items-start lg:py-20">
          <div>
            {course.level && (
              <Badge tone="primary" className="mb-4">
                {course.level}
              </Badge>
            )}
            <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.75rem]">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="mt-4 text-xl text-brand-200">{course.subtitle}</p>
            )}
            {course.summary && (
              <p className="mt-5 text-lg leading-relaxed text-onDark-lo">{course.summary}</p>
            )}

            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm text-onDark-lo">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand-400" aria-hidden />
                {stats.lessonCount} leçon{stats.lessonCount > 1 ? 's' : ''}
              </span>
              {totalSeconds > 0 && (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-400" aria-hidden />
                  {formatDuration(totalSeconds)} de vidéo
                </span>
              )}
              {stats.studentCount > 0 && (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-400" aria-hidden />
                  {stats.studentCount} inscrit{stats.studentCount > 1 ? 's' : ''}
                </span>
              )}
              <span className="flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4 text-brand-400" aria-hidden />
                Téléphone et ordinateur
              </span>
            </div>
          </div>

          {/* Encart d'achat */}
          <aside className="overflow-hidden rounded-2xl bg-surface-800 text-onDark-hi shadow-xl lg:sticky lg:top-24">
            {course.cover_url && (
              <img src={course.cover_url} alt="" className="aspect-[16/9] w-full object-cover" />
            )}
            <div className="p-6">
              {discount && (
                <span className="mb-3 inline-block rounded-full bg-accent-400 px-3 py-1 text-xs font-bold text-surface-950">
                  -{discount} % pendant le lancement
                </span>
              )}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-brand-300">
                  {formatPrice(course.price_cents, course.currency)}
                </span>
                {course.compare_at_price_cents &&
                  course.compare_at_price_cents > course.price_cents && (
                    <span className="text-lg text-onDark-lo line-through">
                      {formatPrice(course.compare_at_price_cents, course.currency)}
                    </span>
                  )}
              </div>
              {course.access_label && (
                <p className="mt-1.5 text-sm text-onDark-lo">{course.access_label}</p>
              )}

              <div className="mt-6">
                {enrolled ? (
                  <ButtonLink href={`/compte/formations/${course.slug}`} size="lg" fullWidth>
                    Continuer la formation
                    <ArrowRight className="h-5 w-5" aria-hidden />
                  </ButtonLink>
                ) : (
                  <ButtonLink href={`/commande/${course.slug}`} size="lg" variant="accent" fullWidth>
                    Rejoindre la formation
                    <ArrowRight className="h-5 w-5" aria-hidden />
                  </ButtonLink>
                )}
              </div>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-onDark-lo">
                <ShieldCheck className="h-4 w-4 text-brand-400" aria-hidden />
                Paiement sécurisé Mobile Money (MTN, Moov, Celtiis)
              </p>

              {whatYouGet.length > 0 && (
                <ul className="mt-6 space-y-2.5 border-t border-surface-700 pt-5">
                  {whatYouGet.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-onDark-md">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </section>

      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-14">
          {course.description && (
            <section>
              <h2 className="mb-5 text-2xl">Présentation</h2>
              <RichContentView content={parseRichContent(course.description)} />
            </section>
          )}

          {outcomes.length > 0 && (
            <section>
              <h2 className="mb-5 text-2xl">Ce que vous obtenez à la fin</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {outcomes.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-card border border-brand-400/30 bg-brand-400/10 p-4 text-[0.9375rem] text-onDark-hi"
                  >
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Programme */}
          <section>
            <h2 className="mb-5 text-2xl">Le programme</h2>
            <div className="space-y-4">
              {course.modules.map((courseModule, mi) => (
                <div key={courseModule.id} className="overflow-hidden rounded-card border border-surface-700">
                  <div className="border-b border-surface-700 bg-surface-900 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">
                      Module {mi + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-onDark-hi">{courseModule.title}</h3>
                    {courseModule.description && (
                      <p className="mt-1.5 text-sm leading-relaxed text-onDark-md">
                        {courseModule.description}
                      </p>
                    )}
                  </div>
                  <ul className="divide-y divide-surface-700">
                    {courseModule.lessons.map((lesson) => {
                      const openable = lesson.is_preview || enrolled
                      return (
                        <li key={lesson.id}>
                          <div className="flex items-center gap-3 px-5 py-3.5">
                            {openable ? (
                              <PlayCircle className="h-[1.125rem] w-[1.125rem] shrink-0 text-brand-400" aria-hidden />
                            ) : (
                              <Lock className="h-4 w-4 shrink-0 text-onDark-lo" aria-hidden />
                            )}
                            <span className="min-w-0 flex-1 text-[0.9375rem] text-onDark-hi">
                              {lesson.title}
                              {lesson.is_preview && !enrolled && (
                                <Badge tone="success" className="ml-2">
                                  Aperçu gratuit
                                </Badge>
                              )}
                            </span>
                            {lesson.duration_seconds > 0 && (
                              <span className="shrink-0 text-xs tabular-nums text-onDark-lo">
                                {formatDuration(lesson.duration_seconds)}
                              </span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                    {courseModule.lessons.length === 0 && (
                      <li className="px-5 py-4 text-sm text-onDark-lo">
                        Contenu de ce module en préparation.
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {reviews.length > 0 && (
            <section>
              <h2 className="mb-5 text-2xl">Ce qu’en disent les participants</h2>
              <div className="space-y-4">
                {reviews.map((r) => (
                  <figure key={r.id} className="rounded-card border border-surface-700 bg-surface-900/60 p-5">
                    <Stars rating={r.rating} className="mb-2.5" />
                    <blockquote className="text-[0.9375rem] leading-relaxed text-onDark-md">
                      « {r.comment} »
                    </blockquote>
                    <figcaption className="mt-3 text-sm">
                      <span className="font-semibold text-onDark-hi">{r.author_name}</span>
                      {r.author_role && <span className="text-onDark-lo"> · {r.author_role}</span>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {faq.length > 0 && (
            <section>
              <h2 className="mb-5 text-2xl">Questions fréquentes</h2>
              <Accordion items={faq} />
            </section>
          )}
        </div>

        {/* Colonne latérale */}
        <aside className="space-y-6">
          <div className="rounded-card border border-surface-700 bg-surface-800 p-6">
            <h3 className="mb-4 text-base font-semibold">En pratique</h3>
            <dl className="space-y-3.5 text-sm">
              {course.format_label && (
                <div>
                  <dt className="font-medium text-onDark-lo">Format</dt>
                  <dd className="mt-0.5 text-onDark-hi">{course.format_label}</dd>
                </div>
              )}
              {course.duration_label && (
                <div>
                  <dt className="font-medium text-onDark-lo">Durée</dt>
                  <dd className="mt-0.5 text-onDark-hi">{course.duration_label}</dd>
                </div>
              )}
              {course.access_label && (
                <div>
                  <dt className="font-medium text-onDark-lo">Accès</dt>
                  <dd className="mt-0.5 text-onDark-hi">{course.access_label}</dd>
                </div>
              )}
            </dl>
          </div>

          {audience.length > 0 && (
            <div className="rounded-card border border-surface-700 bg-surface-800 p-6">
              <h3 className="mb-4 text-base font-semibold">Pour qui ?</h3>
              <ul className="space-y-2.5">
                {audience.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-onDark-md">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" aria-hidden />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {course.resources && course.resources.length > 0 && (
            <div className="rounded-card border border-surface-700 bg-surface-800 p-6">
              <h3 className="mb-4 text-base font-semibold">Supports inclus</h3>
              <ul className="space-y-2.5">
                {course.resources.map((r) => (
                  <li key={r.id} className="flex gap-2.5 text-sm text-onDark-md">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-onDark-lo" aria-hidden />
                    <span>{r.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Rappel de conversion */}
      {!enrolled && (
        <section className="bg-brand-800 py-14 text-white">
          <div className="container-page text-center">
            <SectionHeading
              title="Prêt à structurer votre projet ?"
              subtitle="Accès immédiat après paiement, depuis votre téléphone ou votre ordinateur."
              className="[&_h2]:text-white [&_p]:text-brand-200"
            />
            <ButtonLink href={`/commande/${course.slug}`} size="lg" variant="accent">
              Rejoindre pour {formatPrice(course.price_cents, course.currency)}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </ButtonLink>
            <p className="mt-6 text-sm text-brand-200">
              Une question avant de vous lancer ?{' '}
              <Link href="/contact" className="underline underline-offset-4 hover:text-white">
                Écrivez-nous
              </Link>
            </p>
          </div>
        </section>
      )}
    </>
  )
}
