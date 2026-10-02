import Link from 'next/link'
import { ArrowRight, Clock, PlayCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { PRODUCT_KINDS } from '@/lib/products'
import { resolveIcon } from '@/lib/icons'
import type { Course, Post, Product, Service } from '@/lib/types'
import {
  cn,
  discountPercent,
  formatDate,
  formatPrice,
  isFreeOffer,
  payablePrice,
  truncate,
} from '@/lib/utils'
import { MediaView } from '@/components/ui/media-view'

/**
 * Cartes du catalogue.
 *
 * Elles partagent une grammaire : une couverture au même rapport, un corps qui
 * s'étire, un pied aligné. Le survol soulève la carte et éclaire l'anneau.
 *
 * Deux règles de disposition portent tout le reste, et c'est ce qui manquait :
 *
 * 1. `h-full` sur la coque. Une carte est un élément de grille : sans cela
 *    elle ne prend que sa hauteur propre, et deux cartes voisines aux textes
 *    de longueurs différentes ne se terminent pas au même endroit.
 * 2. `mt-auto` sur le pied. L'alignement reposait auparavant sur un `flex-1`
 *    posé sur le résumé — qui est facultatif. Une formation sans résumé voyait
 *    donc son prix remonter au milieu de la carte, en décalage avec la rangée.
 */
const SHELL =
  'group flex h-full flex-col overflow-hidden rounded-lg bg-surface ring-1 ring-line ' +
  'transition-all duration-base hover:-translate-y-1 hover:ring-primary-text/40 hover:shadow-e2 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-text ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'

/** Pied commun : toujours repoussé en bas, quel que soit le contenu au-dessus. */
const FOOT = 'mt-auto flex items-end justify-between gap-3 border-t border-line pt-4'

/**
 * Pastille posée SUR une photo.
 *
 * Les pastilles de `Badge` sont opaques — elles sont faites pour un fond de
 * carte. Sur une image il faut l'inverse : un fond translucide que le flou
 * d'arrière-plan rend lisible sans masquer la photo. L'ancien code combinait
 * `backdrop-blur` et un fond opaque, où le flou ne pouvait rien produire.
 */
function OverlayBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'absolute inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium',
        'bg-canvas/70 text-fg ring-1 ring-inset ring-line backdrop-blur-md',
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * Zone d'image commune.
 *
 * Elle est TOUJOURS rendue, même sans couverture : une grille où certaines
 * cartes portent une image et d'autres non désaligne tous les titres. Le repli
 * occupe donc exactement la même place.
 */
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
    <div className={cn('relative shrink-0 overflow-hidden bg-canvas-subtle', ratio)}>
      {src ? (
        <MediaView
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/30 to-canvas">
          <PlayCircle className="h-10 w-10 text-primary-text/60" aria-hidden />
        </div>
      )}

      {/* Voile only quand une pastille se pose dessus. Il était auparavant
          inconditionnel et ternissait le bas de chaque photo, y compris sur
          les cartes d'article qui n'en portent aucune. */}
      {children && (
        <>
          <div
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface/80 to-transparent"
            aria-hidden
          />
          {children}
        </>
      )}
    </div>
  )
}

function Arrow({ label }: { label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-base font-semibold text-primary-text">
      {label}
      <ArrowRight
        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </span>
  )
}

/** Prix barré : n'a de sens que s'il est SUPÉRIEUR au prix courant. */
function CompareAt({ course, className }: { course: Course; className?: string }) {
  const before = course.compare_at_price_cents
  if (!before || before <= course.price_cents) return null
  return (
    <span className={cn('text-fg-subtle line-through', className)}>
      {formatPrice(before, course.currency)}
    </span>
  )
}

function priceLabel(item: Pick<Course, 'pricing' | 'price_cents' | 'currency'>) {
  return formatPrice(payablePrice(item), item.currency)
}

export function CourseCard({ course }: { course: Course }) {
  const discount = isFreeOffer(course)
    ? null
    : discountPercent(course.price_cents, course.compare_at_price_cents)
  const hasOverlay = Boolean(discount || course.level)

  return (
    <Link href={`/formations/${course.slug}`} className={SHELL}>
      <Cover src={course.cover_url}>
        {hasOverlay && (
          <>
            {discount && (
              <Badge tone="accent" size="sm" className="absolute left-4 top-4 font-bold">
                −{discount} %
              </Badge>
            )}
            {course.level && <OverlayBadge className="bottom-4 left-4">{course.level}</OverlayBadge>}
          </>
        )}
      </Cover>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg leading-snug text-fg transition-colors group-hover:text-primary-text">
          {course.title}
        </h3>

        {course.summary && (
          <p className="mt-2.5 text-base leading-relaxed text-fg-muted">
            {truncate(course.summary, 130)}
          </p>
        )}

        {course.duration_label && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-fg-subtle">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {course.duration_label}
          </p>
        )}

        <div className={cn(FOOT, 'mt-5')}>
          <div className="min-w-0">
            <CompareAt course={course} className="block text-xs" />
            <p className="text-xl font-bold text-secondary-text">{priceLabel(course)}</p>
          </div>
          <Arrow label="Découvrir" />
        </div>
      </div>
    </Link>
  )
}

export function ServiceCard({ service }: { service: Service }) {
  // L'icône choisie dans l'administration était enregistrée sans jamais être
  // affichée. Elle ouvre désormais la carte.
  const ServiceIcon = resolveIcon(service.icon)
  return (
    <Link href={`/services/${service.slug}`} className={cn(SHELL, 'p-6')}>
      {ServiceIcon && (
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary-subtle text-primary-text">
          <ServiceIcon className="h-6 w-6" aria-hidden />
        </span>
      )}
      <h3 className="text-lg text-fg transition-colors group-hover:text-primary-text">
        {service.title}
      </h3>
      {service.subtitle && (
        <p className="mt-1.5 text-base font-medium text-primary-text">{service.subtitle}</p>
      )}
      {service.summary && (
        <p className="mt-3.5 text-base leading-relaxed text-fg-muted">
          {truncate(service.summary, 150)}
        </p>
      )}
      <div className={cn(FOOT, 'mt-5 items-center')}>
        <span className="min-w-0 text-base font-semibold text-fg">
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
      <Cover src={post.cover_url} />

      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs text-fg-subtle">
          {formatDate(post.published_at)} · {post.reading_minutes} min de lecture
        </p>
        <h3 className="mt-2 text-lg leading-snug text-fg transition-colors group-hover:text-primary-text">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-2.5 text-base leading-relaxed text-fg-muted">
            {truncate(post.excerpt, 140)}
          </p>
        )}
        {/* Pas de filet ici : une carte d'article n'a rien à séparer du pied,
            contrairement au prix d'une formation. Seul le `mt-auto` compte. */}
        <div className="mt-auto pt-5">
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
        className="absolute -inset-3 rounded-lg bg-gradient-to-br from-primary/20 to-transparent blur-xl"
        aria-hidden
      />
      <Link
        href={`/formations/${course.slug}`}
        className={cn(
          'group relative flex flex-col overflow-hidden rounded-lg bg-surface shadow-e3',
          'ring-1 ring-line-strong transition-transform duration-base hover:-translate-y-1',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-text',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        )}
      >
        <Cover src={course.cover_url} ratio="aspect-[16/10]">
          {discount && (
            <Badge tone="accent" size="sm" className="absolute left-4 top-4 font-bold">
              −{discount} % en ce moment
            </Badge>
          )}
        </Cover>

        <div className="flex flex-1 flex-col p-6">
          <p className="eyebrow">{label}</p>
          <h3 className="mt-2 text-lg leading-snug text-fg">{course.title}</h3>
          {course.summary && (
            <p className="mt-2.5 text-base leading-relaxed text-fg-muted">
              {truncate(course.summary, 120)}
            </p>
          )}

          <div className={cn(FOOT, 'mt-5 items-center')}>
            <div className="min-w-0">
              <span className="text-2xl font-bold text-fg">{priceLabel(course)}</span>
              <CompareAt course={course} className="ml-2 text-base" />
            </div>
            <Arrow label="Voir le programme" />
          </div>
        </div>
      </Link>
    </div>
  )
}

/**
 * Carte d'un produit de la boutique.
 *
 * Même grammaire que la carte de formation — couverture, corps, pied aligné —
 * pour que formations et produits puissent se côtoyer dans une même grille.
 * Sans couverture, l'icône du type de produit occupe la place.
 */
export function ProductCard({ product }: { product: Product }) {
  const kind = PRODUCT_KINDS[product.kind] ?? PRODUCT_KINDS.other
  const free = isFreeOffer(product)
  const discount = free ? null : discountPercent(product.price_cents, product.compare_at_price_cents)

  return (
    <Link href={`/boutique/${product.slug}`} className={SHELL}>
      <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-canvas-subtle">
        {product.cover_url ? (
          <MediaView
            src={product.cover_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/30 to-canvas">
            <kind.icon className="h-10 w-10 text-primary-text/70" aria-hidden />
          </div>
        )}
        <OverlayBadge className="bottom-4 left-4">{kind.label}</OverlayBadge>
        {discount && (
          <Badge tone="accent" size="sm" className="absolute left-4 top-4 font-bold">
            −{discount} %
          </Badge>
        )}
        {free && (
          <Badge tone="success" size="sm" className="absolute left-4 top-4 font-bold">
            Gratuit
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg leading-snug text-fg transition-colors group-hover:text-primary-text">
          {product.title}
        </h3>
        {product.summary && (
          <p className="mt-2.5 text-base leading-relaxed text-fg-muted">
            {truncate(product.summary, 130)}
          </p>
        )}
        {product.format_label && (
          <p className="mt-4 text-xs text-fg-subtle">{product.format_label}</p>
        )}

        <div className={cn(FOOT, 'mt-5')}>
          <div className="min-w-0">
            {!free && product.compare_at_price_cents && product.compare_at_price_cents > product.price_cents && (
              <span className="block text-xs text-fg-subtle line-through">
                {formatPrice(product.compare_at_price_cents, product.currency)}
              </span>
            )}
            <p className="text-xl font-bold text-secondary-text">{priceLabel(product)}</p>
          </div>
          <Arrow label={free ? 'Obtenir' : 'Découvrir'} />
        </div>
      </div>
    </Link>
  )
}
