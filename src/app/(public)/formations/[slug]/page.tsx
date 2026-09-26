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
import { LessonRow } from '@/components/public/lesson-row'
import { VideoSurface } from '@/components/ui/video-player'
import { env } from '@/lib/env'
import { resolveVideoRef, resolveVideoUrl } from '@/lib/video'
import { signVideoTarget } from '@/lib/video-sign'
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

  // Vidéo de présentation. Pas de contrôle d'accès : elle sert justement à
  // convaincre un visiteur qui n'a pas encore acheté. `signVideoTarget` ne fait
  // donc ici que laisser passer une URL publique — il ne signe que si
  // l'administration a déposé un fichier dans un espace privé.
  const promo = await signVideoTarget(resolveVideoUrl(course.promo_video_url))

  /**
   * Vidéos des leçons marquées en aperçu gratuit.
   *
   * Signées pour un visiteur NON inscrit, et c'est voulu : une leçon d'aperçu
   * est publique par définition. Seules celles-là sont résolues — signer les
   * cent leçons d'un catalogue à chaque affichage coûterait autant d'appels au
   * stockage pour des vidéos que personne ne peut ouvrir.
   */
  const previewLessons = course.modules.flatMap((m) => m.lessons).filter((l) => l.is_preview)
  const previews = new Map(
    await Promise.all(
      previewLessons.map(
        async (l) =>
          [
            l.id,
            await signVideoTarget(
              resolveVideoRef({
                provider: l.video_provider,
                videoId: l.video_id,
                videoUrl: l.video_url,
                bunnyHostname: env.bunnyCdnHostname || null,
              }),
            ),
          ] as const,
      ),
    ),
  )

  return (
    <>
      {/* En-tête */}
      <section className="bg-canvas text-fg-muted">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.4fr_1fr] lg:items-start lg:py-20">
          <div>
            {course.level && (
              <Badge tone="primary" className="mb-4">
                {course.level}
              </Badge>
            )}
            <h1 className="text-3xl font-bold leading-tight text-fg sm:text-4xl lg:text-[2.75rem]">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="mt-4 text-xl text-primary-text">{course.subtitle}</p>
            )}
            {course.summary && (
              <p className="mt-5 text-lg leading-relaxed text-fg-subtle">{course.summary}</p>
            )}

            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm text-fg-subtle">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary-text" aria-hidden />
                {stats.lessonCount} leçon{stats.lessonCount > 1 ? 's' : ''}
              </span>
              {totalSeconds > 0 && (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary-text" aria-hidden />
                  {formatDuration(totalSeconds)} de vidéo
                </span>
              )}
              {stats.studentCount > 0 && (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary-text" aria-hidden />
                  {stats.studentCount} inscrit{stats.studentCount > 1 ? 's' : ''}
                </span>
              )}
              <span className="flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4 text-primary-text" aria-hidden />
                Téléphone et ordinateur
              </span>
            </div>
          </div>

          {/* Encart d'achat */}
          <aside className="overflow-hidden rounded-2xl bg-surface text-fg shadow-xl lg:sticky lg:top-24">
            {/* La vidéo passe DEVANT l'image : quand les deux existent,
                l'image sert d'affiche au lecteur, et rien n'est téléchargé
                avant que le visiteur ne clique. */}
            {promo ? (
              <VideoSurface
                playable={promo}
                poster={course.cover_url}
                title={course.title}
                className="rounded-none ring-0"
              />
            ) : (
              course.cover_url && (
                <img src={course.cover_url} alt="" className="aspect-[16/9] w-full object-cover" />
              )
            )}
            <div className="p-6">
              {discount && (
                <span className="mb-3 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-fg">
                  -{discount} % pendant le lancement
                </span>
              )}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary-text">
                  {formatPrice(course.price_cents, course.currency)}
                </span>
                {course.compare_at_price_cents &&
                  course.compare_at_price_cents > course.price_cents && (
                    <span className="text-lg text-fg-subtle line-through">
                      {formatPrice(course.compare_at_price_cents, course.currency)}
                    </span>
                  )}
              </div>
              {course.access_label && (
                <p className="mt-1.5 text-sm text-fg-subtle">{course.access_label}</p>
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

              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-fg-subtle">
                <ShieldCheck className="h-4 w-4 text-primary-text" aria-hidden />
                Paiement sécurisé Mobile Money (MTN, Moov, Celtiis)
              </p>

              {whatYouGet.length > 0 && (
                <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                  {whatYouGet.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-fg-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
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
                    className="flex gap-3 rounded-lg border border-primary-text/25 bg-primary-subtle p-4 text-[0.9375rem] text-fg"
                  >
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary-text" aria-hidden />
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
                <div key={courseModule.id} className="overflow-hidden rounded-lg border border-line">
                  <div className="border-b border-line bg-canvas-subtle px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-text">
                      Module {mi + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-fg">{courseModule.title}</h3>
                    {courseModule.description && (
                      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                        {courseModule.description}
                      </p>
                    )}
                  </div>
                  <ul className="divide-y divide-line">
                    {courseModule.lessons.map((lesson) => (
                      <LessonRow
                        key={lesson.id}
                        title={lesson.title}
                        durationSeconds={lesson.duration_seconds}
                        isPreview={lesson.is_preview}
                        enrolled={enrolled}
                        href={`/compte/formations/${course.slug}/${lesson.id}`}
                        playable={previews.get(lesson.id) ?? null}
                      />
                    ))}
                    {courseModule.lessons.length === 0 && (
                      <li className="px-5 py-4 text-sm text-fg-subtle">
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
                  <figure key={r.id} className="rounded-lg border border-line bg-canvas-subtle/60 p-5">
                    <Stars rating={r.rating} className="mb-2.5" />
                    <blockquote className="text-[0.9375rem] leading-relaxed text-fg-muted">
                      « {r.comment} »
                    </blockquote>
                    <figcaption className="mt-3 text-sm">
                      <span className="font-semibold text-fg">{r.author_name}</span>
                      {r.author_role && <span className="text-fg-subtle"> · {r.author_role}</span>}
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
          <div className="rounded-lg border border-line bg-surface p-6">
            <h3 className="mb-4 text-base font-semibold">En pratique</h3>
            <dl className="space-y-3.5 text-sm">
              {course.format_label && (
                <div>
                  <dt className="font-medium text-fg-subtle">Format</dt>
                  <dd className="mt-0.5 text-fg">{course.format_label}</dd>
                </div>
              )}
              {course.duration_label && (
                <div>
                  <dt className="font-medium text-fg-subtle">Durée</dt>
                  <dd className="mt-0.5 text-fg">{course.duration_label}</dd>
                </div>
              )}
              {course.access_label && (
                <div>
                  <dt className="font-medium text-fg-subtle">Accès</dt>
                  <dd className="mt-0.5 text-fg">{course.access_label}</dd>
                </div>
              )}
            </dl>
          </div>

          {audience.length > 0 && (
            <div className="rounded-lg border border-line bg-surface p-6">
              <h3 className="mb-4 text-base font-semibold">Pour qui ?</h3>
              <ul className="space-y-2.5">
                {audience.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-fg-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {course.resources && course.resources.length > 0 && (
            <div className="rounded-lg border border-line bg-surface p-6">
              <h3 className="mb-4 text-base font-semibold">Supports inclus</h3>
              <ul className="space-y-2.5">
                {course.resources.map((r) => (
                  <li key={r.id} className="flex gap-2.5 text-sm text-fg-muted">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
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
        <section className="bg-primary py-14 text-primary-fg">
          <div className="container-page text-center">
            <SectionHeading
              title="Prêt à structurer votre projet ?"
              subtitle="Accès immédiat après paiement, depuis votre téléphone ou votre ordinateur."
              className="[&_h2]:text-primary-fg [&_p]:text-primary-fg/80"
            />
            <ButtonLink href={`/commande/${course.slug}`} size="lg" variant="accent">
              Rejoindre pour {formatPrice(course.price_cents, course.currency)}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </ButtonLink>
            <p className="mt-6 text-sm text-primary-fg/80">
              Une question avant de vous lancer ?{' '}
              <Link href="/contact" className="underline underline-offset-4 hover:text-primary-fg">
                Écrivez-nous
              </Link>
            </p>
          </div>
        </section>
      )}
    </>
  )
}
