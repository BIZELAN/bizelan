import Link from 'next/link'
import { ArrowRight, Clock, PlayCircle } from 'lucide-react'

import { Pill } from '@/components/ui/pill'
import type { Course, Post, Service } from '@/lib/types'
import { cn, discountPercent, formatDate, formatPrice, truncate } from '@/lib/utils'

/**
 * Cartes du catalogue.
 *
 * Toutes partagent la même grammaire : rayon de 20 px, anneau discret qui
 * s'éclaire au survol, léger soulèvement. Le survol n'ajoute pas d'ombre
 * portée — sur fond sombre elle ne se voit pas — mais éclaircit l'anneau,
 * ce qui se lit immédiatement.
 */
const SHELL =
  'group flex flex-col overflow-hidden rounded-card bg-surface-800 ring-1 ring-surface-700 ' +
  'transition-all duration-200 hover:-translate-y-1 hover:ring-brand-400/40'

/** Zone d'image commune, avec repli quand aucune couverture n'est renseignée. */
function Cover({
  src,
  ratio = 'aspect-[16/9]',
  children,
}: {
  src?: string | null
  ratio?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn('relative overflow-hidden bg-surface-700', ratio)}>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-700 to-surface-900">
          <PlayCircle className="h-10 w-10 text-brand-300/60" aria-hidden />
        </div>
      )}
      {/* Voile bas : garantit la lisibilité des pastilles quelle que soit
          la photo, même claire. */}
      <div
        className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface-800 to-transparent"
        aria-hidden
      />
      {children}
    </div>
  )
}

function Arrow({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-body font-semibold text-brand-300">
      {label}
      <ArrowRight
        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </span>
  )
}

export function CourseCard({ course }: { course: Course }) {
  const discount = discountPercent(course.price_cents, course.compare_at_price_cents)

  return (
    <Link href={`/formations/${course.slug}`} className={SHELL}>
      <Cover src={course.cover_url}>
        {discount && (
          <Pill tone="accent" size="sm" className="absolute left-4 top-4 font-bold">
            −{discount} %
          </Pill>
        )}
        {course.level && (
          <Pill tone="neutral" size="sm" className="absolute bottom-4 left-4 backdrop-blur">
            {course.level}
          </Pill>
        )}
      </Cover>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-h3 leading-snug text-onDark-hi transition-colors group-hover:text-brand-300">
          {course.title}
        </h3>

        {course.summary && (
          <p className="mt-2.5 flex-1 text-body leading-relaxed text-onDark-md">
            {truncate(course.summary, 130)}
          </p>
        )}

        {course.duration_label && (
          <p className="mt-4 flex items-center gap-1.5 text-meta text-onDark-lo">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {course.duration_label}
          </p>
        )}

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-surface-700 pt-4">
          <div>
            {course.compare_at_price_cents &&
              course.compare_at_price_cents > course.price_cents && (
                <p className="text-meta text-onDark-lo line-through">
                  {formatPrice(course.compare_at_price_cents, course.currency)}
                </p>
              )}
            <p className="text-xl font-bold text-accent-300">
              {course.pricing === 'free'
                ? 'Gratuit'
                : formatPrice(course.price_cents, course.currency)}
            </p>
          </div>
          <Arrow label="Découvrir" />
        </div>
      </div>
    </Link>
  )
}

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link href={`/services/${service.slug}`} className={cn(SHELL, 'p-6')}>
      <h3 className="text-h3 text-onDark-hi transition-colors group-hover:text-brand-300">
        {service.title}
      </h3>
      {service.subtitle && (
        <p className="mt-1.5 text-body font-medium text-brand-400">{service.subtitle}</p>
      )}
      {service.summary && (
        <p className="mt-3.5 flex-1 text-body leading-relaxed text-onDark-md">
          {truncate(service.summary, 150)}
        </p>
      )}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-surface-700 pt-4">
        <span className="text-body font-semibold text-onDark-hi">
          {service.pricing === 'quote'
            ? (service.price_label ?? 'Sur devis')
            : formatPrice(service.price_cents, service.currency)}
        </span>
        <Arrow label="En savoir plus" />
      </div>
    </Link>
  )
}

export function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} className={SHELL}>
      {post.cover_url && <Cover src={post.cover_url} />}

      <div className="flex flex-1 flex-col p-6">
        <p className="text-meta text-onDark-lo">
          {formatDate(post.published_at)} · {post.reading_minutes} min de lecture
        </p>
        <h3 className="mt-2 text-h3 leading-snug text-onDark-hi transition-colors group-hover:text-brand-300">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-2.5 flex-1 text-body leading-relaxed text-onDark-md">
            {truncate(post.excerpt, 140)}
          </p>
        )}
        <div className="mt-5">
          <Arrow label="Lire l’article" />
        </div>
      </div>
    </Link>
  )
}

/**
 * Carte « formation mise en avant » de la bannière scindée.
 * Partagée par la page d'accueil de repli et le bloc « heroSplit »,
 * pour que les deux ne divergent jamais.
 */
export function FeaturedCourseCard({
  course,
  label = 'Formation phare',
}: {
  course: Course
  label?: string
}) {
  const discount = discountPercent(course.price_cents, course.compare_at_price_cents)

  return (
    <div className="relative">
      <div
        className="absolute -inset-3 rounded-panel bg-gradient-to-br from-brand-500/20 to-transparent blur-xl"
        aria-hidden
      />
      <Link
        href={`/formations/${course.slug}`}
        className="group relative block overflow-hidden rounded-panel bg-surface-800 ring-1 ring-surface-600 shadow-dark-lg transition-transform hover:-translate-y-1"
      >
        <Cover src={course.cover_url} ratio="aspect-[16/10]">
          {discount && (
            <Pill tone="accent" size="sm" className="absolute left-4 top-4 font-bold">
              −{discount} % en ce moment
            </Pill>
          )}
        </Cover>

        <div className="p-6">
          <p className="eyebrow">{label}</p>
          <h3 className="mt-2 text-h3 leading-snug text-onDark-hi">{course.title}</h3>
          {course.summary && (
            <p className="mt-2.5 text-body leading-relaxed text-onDark-md">
              {truncate(course.summary, 120)}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-surface-700 pt-4">
            <div>
              <span className="text-2xl font-bold text-onDark-hi">
                {course.pricing === 'free'
                  ? 'Gratuit'
                  : formatPrice(course.price_cents, course.currency)}
              </span>
              {course.compare_at_price_cents && (
                <span className="ml-2 text-body text-onDark-lo line-through">
                  {formatPrice(course.compare_at_price_cents, course.currency)}
                </span>
              )}
            </div>
            <Arrow label="Voir le programme" />
          </div>
        </div>
      </Link>
    </div>
  )
}
