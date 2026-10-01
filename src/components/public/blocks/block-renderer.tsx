import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  ChevronDown,
  CheckCircle2,
  CircleAlert,
  Quote as QuoteIcon,
  ShieldCheck,
  X as XIcon,
  type LucideIcon,
} from 'lucide-react'

import { resolveIcon } from '@/lib/icons'
import type { Block } from '@/lib/blocks'
import type { Course, FaqItem, Post, Product, Review, Service } from '@/lib/types'
import { Accordion } from '@/components/ui/accordion'
import { ButtonLink } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'
import { RichContentView } from '@/components/ui/rich-content'
import { parseRichContent } from '@/lib/rich-content'
import { SectionHeading, Stars } from '@/components/ui/misc'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Scroller } from '@/components/ui/scroller'
import { VideoPlayer } from '@/components/ui/video-player'
import { resolveVideoUrl, VIDEO_IFRAME_ALLOW } from '@/lib/video'
import {
  CourseCard,
  FeaturedCourseCard,
  PostCard,
  ProductCard,
  ServiceCard,
} from '@/components/public/cards'
import { ContactForm } from '@/components/public/contact-form'
import { QuoteForm } from '@/components/public/quote-form'
import { asArray, cn, discountPercent, formatPrice } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Aides                                                               */
/* ------------------------------------------------------------------ */

const d = (data: Record<string, unknown>) => ({
  str: (key: string, fallback = '') => (typeof data[key] === 'string' ? (data[key] as string) : fallback),
  num: (key: string, fallback = 0) => (typeof data[key] === 'number' ? (data[key] as number) : fallback),
  bool: (key: string, fallback = false) =>
    typeof data[key] === 'boolean' ? (data[key] as boolean) : fallback,
  list: <T,>(key: string) => asArray<T>(data[key]),
})

/** Résout une icône lucide par son nom, avec repli silencieux. */
/**
 * Icône choisie dans l'administration.
 *
 * Elle passe par la bibliothèque CHOISIE de `lib/icons.ts`, et non par
 * `import * as Icons`. Cette forme-là, avec une résolution dynamique, annule
 * l'élagage du paquet : les cinq mille icônes de lucide partaient dans le
 * navigateur dès que ce moteur s'y rendait.
 */
function DynIcon({ name, className }: { name?: string; className?: string }) {
  const Comp = resolveIcon(name)
  if (!Comp) return null
  return <Comp className={className} aria-hidden />
}

/**
 * Fonds proposés à l'admin pour chaque bloc.
 *
 * Les clés restent `light` / `dark` / `brand` : elles sont déjà enregistrées
 * en base dans les pages existantes, les renommer imposerait une migration
 * pour un simple confort de vocabulaire. Seuls leur rendu et leur libellé
 * changent — « clair » désigne désormais le fond nuancé du système sombre.
 */
const THEMES = {
  light: 'bg-canvas-subtle text-fg-muted',
  dark: 'bg-canvas text-fg-muted',
  /* Seul ton à rester LITTÉRAL, texte compris. C'est un bandeau de marque :
     il garde le même vert dans les deux thèmes, sinon il cesse d'être une
     signature. Son texte ne peut donc PAS être un jeton adaptatif —
     `text-primary-fg` vaut presque noir en thème sombre, ce qui donnerait du
     noir sur vert foncé. */
  brand: 'bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 text-brand-50',
} as const

type ThemeKey = keyof typeof THEMES

function themeOf(value: string): ThemeKey {
  return value === 'dark' || value === 'brand' || value === 'light' ? value : 'light'
}

export interface BlockContext {
  course?: Course | null
  service?: Service | null
  /**
   * Contenus publiés, récupérés UNE fois par la page.
   *
   * Les blocs les interrogeaient chacun de leur côté : une page portant une
   * grille de formations, une de services et une d'articles déclenchait trois
   * requêtes en cascade, et le moteur ne pouvait vivre que côté serveur.
   *
   * Le filtrage qu'ils faisaient — « en avant seulement », « les trois
   * premiers » — se refait ici sans requête. Le moteur devient NEUTRE : le
   * site public le rend côté serveur sans envoyer un octet de JavaScript,
   * l'aperçu de l'administration le rend côté navigateur à chaque frappe.
   */
  data?: BlockData
}

export interface BlockData {
  courses: Course[]
  services: Service[]
  posts: Post[]
  reviews: Review[]
  /** Facultatif : les aperçus construits avant la boutique ne le portent pas. */
  products?: Product[]
}

const EMPTY_DATA: BlockData = { courses: [], services: [], posts: [], reviews: [] }

/* ------------------------------------------------------------------ */
/* Rendu d'une page complète                                           */
/* ------------------------------------------------------------------ */

export function BlockRenderer({
  blocks,
  context,
}: {
  blocks: Block[]
  context?: BlockContext
}) {
  const visible = blocks.filter((b) => !b.hidden)
  return (
    <>
      {visible.map((block) => (
        <BlockSwitch key={block.id} block={block} context={context} />
      ))}
    </>
  )
}

function BlockSwitch({ block, context }: { block: Block; context?: BlockContext }) {
  const data = (block.data ?? {}) as Record<string, unknown>

  switch (block.type) {
    case 'hero':
      return <HeroBlock data={data} />
    case 'heroSplit':
      return <HeroSplitBlock data={data} pool={context?.data ?? EMPTY_DATA} />
    case 'painPoints':
      return <PainPointsBlock data={data} />
    case 'beforeAfter':
      return <BeforeAfterBlock data={data} />
    case 'checklist':
      return <ChecklistBlock data={data} />
    case 'phases':
      return <PhasesBlock data={data} />
    case 'features':
      return <FeaturesBlock data={data} />
    case 'pricing':
      return <PricingBlock data={data} course={context?.course ?? null} />
    case 'quote':
      return <QuoteBlock data={data} />
    case 'about':
      return <AboutBlock data={data} />
    case 'faq':
      return <FaqBlock data={data} course={context?.course ?? null} />
    case 'cta':
      return <CtaBlock data={data} />
    case 'richText':
      return <RichTextBlock data={data} />
    case 'stats':
      return <StatsBlock data={data} />
    case 'logos':
      return <LogosBlock data={data} />
    case 'video':
      return <VideoBlock data={data} />
    case 'image':
      return <ImageBlock data={data} />
    case 'courseGrid':
      return <CourseGridBlock data={data} pool={context?.data ?? EMPTY_DATA} />
    case 'productGrid':
      return <ProductGridBlock data={data} pool={context?.data ?? EMPTY_DATA} />
    case 'serviceGrid':
      return <ServiceGridBlock data={data} pool={context?.data ?? EMPTY_DATA} />
    case 'postGrid':
      return <PostGridBlock data={data} pool={context?.data ?? EMPTY_DATA} />
    case 'testimonials':
      return (
        <TestimonialsBlock
          data={data}
          course={context?.course ?? null}
          pool={context?.data ?? EMPTY_DATA}
        />
      )
    case 'experts':
      return <ExpertsBlock data={data} />
    case 'freeContent':
      return <FreeContentBlock data={data} />
    case 'contactForm':
      return <ContactFormBlock data={data} />
    case 'quoteForm':
      return <QuoteFormBlock data={data} service={context?.service ?? null} />
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* Blocs                                                               */
/* ------------------------------------------------------------------ */

/**
 * Bannière scindée : accroche à gauche, formation mise en avant à droite.
 * Sans formation disponible, la colonne de droite disparaît et le texte
 * occupe toute la largeur — la bannière reste donc utilisable sur un site vide.
 */
function HeroSplitBlock({ data, pool }: { data: Record<string, unknown>; pool: BlockData }) {
  const f = d(data)
  const slug = f.str('courseSlug')

  // Même choix qu'avant : la formation désignée, sinon la première mise en
  // avant, sinon la première tout court.
  const course = slug
    ? (pool.courses.find((c) => c.slug === slug) ?? null)
    : (pool.courses.find((c) => c.featured) ?? pool.courses[0] ?? null)

  const guarantees = f.list<string>('guarantees')

  return (
    <section className="relative overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-56 left-1/3 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="container-page relative py-20 sm:py-24 lg:py-28">
        <div className={cn('grid items-center gap-14', course && 'lg:grid-cols-[1.05fr_0.95fr]')}>
          <div>
            {f.str('badge') && (
              <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-primary-subtle px-4 py-1.5 text-base font-medium text-primary-text">
                {f.str('badge')}
              </span>
            )}

            <h1 className="mt-7 text-4xl font-bold leading-[1.1] text-fg sm:text-5xl lg:text-[3.4rem]">
              {f.str('title')}
              {f.str('highlight') && (
                <>
                  <br />
                  <span className="text-primary-text">{f.str('highlight')}</span>
                </>
              )}
            </h1>

            {f.str('subtitle') && (
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-subtle">
                {f.str('subtitle')}
              </p>
            )}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              {f.str('ctaLabel') && (
                <ButtonLink href={f.str('ctaHref', '#')} size="lg" variant="accent">
                  {f.str('ctaLabel')}
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </ButtonLink>
              )}
              {f.str('secondaryCtaLabel') && (
                <ButtonLink href={f.str('secondaryCtaHref', '#')} size="lg" variant="secondary">
                  {f.str('secondaryCtaLabel')}
                </ButtonLink>
              )}
            </div>

            {guarantees.length > 0 && (
              <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-fg-subtle">
                {guarantees.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary-text" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {course && (
            <FeaturedCourseCard course={course} label={f.str('cardLabel', 'Formation phare')} />
          )}
        </div>
      </div>
    </section>
  )
}

function HeroBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const theme = themeOf(f.str('theme', 'dark'))
  const align = f.str('align', 'center')
  const imageUrl = f.str('imageUrl')
  /* Seul `brand` est un fond fixe sombre : lui seul impose du texte clair.
     `dark` suit desormais le theme via les jetons de role. */
  const onBrand = theme === 'brand'

  return (
    <section className={cn('relative overflow-hidden', THEMES[theme])}>
      {imageUrl && (
        <>
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-canvas/75" />
        </>
      )}
      <div
        className={cn(
          'container-page relative py-20 sm:py-28 lg:py-32',
          align === 'center' ? 'text-center' : 'text-left',
        )}
      >
        <div className={cn('max-w-3xl', align === 'center' && 'mx-auto')}>
          {f.str('badge') && (
            <span className="mb-6 inline-block rounded-full bg-secondary px-4 py-1.5 text-sm font-bold text-secondary-fg">
              {f.str('badge')}
            </span>
          )}
          <h1
            className={cn(
              'text-3xl font-bold leading-[1.15] sm:text-4xl lg:text-5xl',
              onBrand ? 'text-brand-50' : 'text-fg',
            )}
          >
            {f.str('title')}
          </h1>
          {f.str('subtitle') && (
            <p
              className={cn(
                'mt-6 text-lg leading-relaxed sm:text-xl',
                onBrand ? 'text-brand-100' : 'text-fg-muted',
              )}
            >
              {f.str('subtitle')}
            </p>
          )}
          {(f.str('ctaLabel') || f.str('secondaryCtaLabel')) && (
            <div
              className={cn(
                'mt-9 flex flex-col gap-3 sm:flex-row',
                align === 'center' && 'sm:justify-center',
              )}
            >
              {f.str('ctaLabel') && (
                <ButtonLink href={f.str('ctaHref', '#offre')} size="lg" variant="accent">
                  {f.str('ctaLabel')}
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </ButtonLink>
              )}
              {f.str('secondaryCtaLabel') && (
                <ButtonLink
                  href={f.str('secondaryCtaHref', '/')}
                  size="lg"
                  variant={onBrand ? 'secondary' : 'outline'}
                >
                  {f.str('secondaryCtaLabel')}
                </ButtonLink>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function PainPointsBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const items = f.list<string>('items')
  const imageUrl = f.str('imageUrl')

  return (
    <section className="section bg-canvas">
      <div className="container-page">
        <SectionHeading title={f.str('title')} align={imageUrl ? 'left' : 'center'} />
        <div className={cn('grid gap-10', imageUrl && 'lg:grid-cols-2 lg:items-center')}>
          <ul className={cn('space-y-4', !imageUrl && 'mx-auto max-w-2xl')}>
            {items.map((item, i) => (
              <li
                key={i}
                className="flex gap-3.5 rounded-lg border border-line bg-canvas-subtle/60 p-5 text-fg"
              >
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          {imageUrl && (
            <img src={imageUrl} alt="" className="w-full rounded-lg object-cover shadow-e1" />
          )}
        </div>
      </div>
    </section>
  )
}

function BeforeAfterBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const before = f.list<string>('before')
  const after = f.list<string>('after')

  return (
    <section className="section bg-canvas-subtle">
      <div className="container-page">
        <SectionHeading title={f.str('title')} />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface p-7">
            <h3 className="mb-5 text-lg font-semibold text-fg-subtle">
              {f.str('beforeTitle', 'Avant')}
            </h3>
            <ul className="space-y-3.5">
              {before.map((item, i) => (
                <li key={i} className="flex gap-3 text-fg-muted">
                  <XIcon className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border-2 border-primary-text/40 bg-primary-subtle p-7">
            <h3 className="mb-5 text-lg font-semibold text-primary-text">
              {f.str('afterTitle', 'Après')}
            </h3>
            <ul className="space-y-3.5">
              {after.map((item, i) => (
                <li key={i} className="flex gap-3 font-medium text-fg">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary-text" aria-hidden />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function ChecklistBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const items = f.list<string>('items')
  const imageUrl = f.str('imageUrl')

  return (
    <section className="section bg-canvas">
      <div className="container-page">
        <div className={cn('grid gap-10', imageUrl && 'lg:grid-cols-2 lg:items-center')}>
          <div>
            <h2 className="mb-7 text-3xl leading-tight sm:text-4xl">{f.str('title')}</h2>
            <ul className="space-y-4">
              {items.map((item, i) => (
                <li key={i} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
                    <Check className="h-3.5 w-3.5 text-primary-text" aria-hidden />
                  </span>
                  <span className="leading-relaxed text-fg">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="" className="w-full rounded-lg object-cover shadow-e1" />
          )}
        </div>
      </div>
    </section>
  )
}

function PhasesBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const items = f.list<{ label?: string; title?: string; description?: string; bullets?: string[] }>(
    'items',
  )
  // Dépliable par défaut : chaque phase montre son titre, et son détail à la
  // demande. « Tout afficher » garde l'ancienne présentation, entièrement ouverte.
  const collapsible = f.str('display', 'accordion') !== 'open'

  return (
    <section className="section bg-canvas text-fg">
      <div className="container-page">
        {f.str('title') && (
          <h2 className="mb-12 text-center text-3xl text-fg sm:text-4xl">{f.str('title')}</h2>
        )}
        <div className={cn(collapsible ? 'mx-auto max-w-4xl space-y-3' : 'space-y-6')}>
          {items.map((phase, i) => {
            const bullets = asArray<string>(phase.bullets)
            const details = (
              <>
                {phase.description && (
                  <p className="mb-5 leading-relaxed text-fg-subtle">{phase.description}</p>
                )}
                {bullets.length > 0 && (
                  <ul className="space-y-3">
                    {bullets.map((b, j) => (
                      <li key={j} className="flex gap-3 text-fg-subtle">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )

            if (collapsible) {
              const hasDetails = Boolean(phase.description) || bullets.length > 0
              return (
                // `<details>` natif : dépliable sans JavaScript, accessible au
                // clavier, et utilisable aussi dans l'aperçu de l'éditeur.
                <details
                  key={i}
                  open={i === 0}
                  className="group overflow-hidden rounded-lg border border-line bg-canvas-subtle/60 open:border-primary-text/30 open:bg-surface open:shadow-e1"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-6 py-5 transition-colors hover:bg-canvas-subtle sm:px-7 [&::-webkit-details-marker]:hidden">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      {phase.label && (
                        <span className="block text-xs font-bold uppercase tracking-wider text-primary-text">
                          {phase.label}
                        </span>
                      )}
                      <span className="mt-0.5 block text-xl font-semibold leading-snug text-fg">
                        {phase.title}
                      </span>
                      {bullets.length > 0 && (
                        <span className="mt-1 block text-xs text-fg-subtle group-open:hidden">
                          {bullets.length} point{bullets.length > 1 ? 's' : ''} clé
                          {bullets.length > 1 ? 's' : ''} · cliquez pour le détail
                        </span>
                      )}
                    </span>
                    {hasDetails && (
                      <ChevronDown
                        className="h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-base group-open:rotate-180"
                        aria-hidden
                      />
                    )}
                  </summary>
                  {hasDetails && (
                    <div className="border-t border-line px-6 py-6 sm:px-7 sm:pl-[5.25rem]">{details}</div>
                  )}
                </details>
              )
            }

            return (
              <div key={i} className="rounded-lg border border-line bg-canvas-subtle/60 p-7 sm:p-9">
                <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                  <div className="lg:w-1/3">
                    {phase.label && (
                      <span className="mb-3 inline-block rounded-pill bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-fg">
                        {phase.label}
                      </span>
                    )}
                    <h3 className="text-2xl font-semibold text-fg">{phase.title}</h3>
                  </div>
                  <div className="lg:w-2/3">{details}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FeaturesBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const items = f.list<{ title?: string; description?: string; icon?: string }>('items')

  return (
    <section className="section bg-canvas">
      <div className="container-page">
        {f.str('title') && <SectionHeading title={f.str('title')} />}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border border-line bg-canvas-subtle/60 p-6 text-center">
              {item.icon && (
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle">
                  <DynIcon name={item.icon} className="h-6 w-6 text-primary-text" />
                </div>
              )}
              <h3 className="text-lg font-semibold text-fg">{item.title}</h3>
              {item.description && (
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingBlock({ data, course }: { data: Record<string, unknown>; course: Course | null }) {
  const f = d(data)
  const includes = f.list<string>('includes')
  const outcomes = f.list<string>('outcomes')
  const anchor = f.str('anchor', 'offre')

  const price = course?.price_cents ?? 0
  const compareAt = course?.compare_at_price_cents ?? null
  const discount = discountPercent(price, compareAt)
  const checkoutHref = course ? `/commande/${course.slug}` : '/formations'

  return (
    <section id={anchor} className="section scroll-mt-20 bg-canvas-subtle">
      <div className="container-page">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-lg border-2 border-primary-text/40 bg-surface shadow-e3">
          <div className="bg-primary px-7 py-8 text-center text-primary-fg sm:px-10">
            {(f.str('badge') || discount) && (
              <span className="mb-4 inline-block rounded-full bg-secondary px-4 py-1.5 text-sm font-bold text-secondary-fg">
                {f.str('badge') || `-${discount} %`}
              </span>
            )}
            {f.str('note') && <p className="text-sm text-primary-text">{f.str('note')}</p>}
            <div className="mt-3 flex items-baseline justify-center gap-3">
              {compareAt && compareAt > price && (
                <span className="text-xl text-primary-text line-through">
                  {formatPrice(compareAt, course?.currency)}
                </span>
              )}
              <span className="text-4xl font-bold sm:text-5xl">
                {formatPrice(price, course?.currency)}
              </span>
            </div>
          </div>

          <div className="grid gap-8 p-7 sm:grid-cols-2 sm:p-10">
            {includes.length > 0 && (
              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fg-subtle">
                  {f.str('includesTitle', 'Vous aurez accès à :')}
                </h3>
                <ul className="space-y-3">
                  {includes.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-[0.9375rem] text-fg">
                      <Check className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-primary-text" aria-hidden />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {outcomes.length > 0 && (
              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fg-subtle">
                  {f.str('outcomesTitle', 'Vous repartez avec :')}
                </h3>
                <ul className="space-y-3">
                  {outcomes.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-[0.9375rem] text-fg">
                      <Check className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-primary-text" aria-hidden />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="border-t border-line bg-canvas-subtle/60 px-7 py-7 text-center sm:px-10">
            <ButtonLink href={checkoutHref} size="lg" variant="accent" fullWidth>
              {f.str('ctaLabel', 'Passer au paiement')}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </ButtonLink>
            {f.str('securityNote') && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-fg-subtle">
                <ShieldCheck className="h-4 w-4 text-primary-text" aria-hidden />
                {f.str('securityNote')}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function QuoteBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const imageUrl = f.str('imageUrl')

  return (
    <section className="section bg-primary text-primary-fg">
      <div className="container-page">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center lg:flex-row lg:text-left">
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="h-40 w-40 shrink-0 rounded-lg object-cover lg:h-52 lg:w-52"
            />
          )}
          <div>
            <QuoteIcon className="mx-auto mb-4 h-8 w-8 text-primary-text lg:mx-0" aria-hidden />
            <p className="text-xl font-medium leading-relaxed sm:text-2xl">{f.str('text')}</p>
            {f.str('author') && <p className="mt-4 text-primary-text">— {f.str('author')}</p>}
            {f.str('ctaLabel') && (
              <div className="mt-7">
                <ButtonLink href={f.str('ctaHref', '#offre')} variant="accent" size="lg">
                  {f.str('ctaLabel')}
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const bullets = f.list<string>('bullets')
  const imageUrl = f.str('imageUrl')

  return (
    <section className="section bg-canvas">
      <div className="container-page">
        <div className={cn('grid gap-12', imageUrl && 'lg:grid-cols-2 lg:items-center')}>
          <div>
            {f.str('eyebrow') && <p className="eyebrow mb-3">{f.str('eyebrow')}</p>}
            <h2 className="text-3xl leading-tight sm:text-4xl">{f.str('title')}</h2>
            {f.str('text') && (
              <p className="mt-5 text-lg leading-relaxed text-fg-muted">{f.str('text')}</p>
            )}
            {bullets.length > 0 && (
              <ul className="mt-7 space-y-3.5">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-3">
                    <Check className="mt-1 h-[1.125rem] w-[1.125rem] shrink-0 text-primary-text" aria-hidden />
                    <span className="leading-relaxed text-fg">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {imageUrl && <img src={imageUrl} alt="" className="w-full rounded-lg object-cover" />}
        </div>
      </div>
    </section>
  )
}

function FaqBlock({ data, course }: { data: Record<string, unknown>; course: Course | null }) {
  const f = d(data)
  const own = f.list<FaqItem>('items')
  const items =
    f.bool('useCourseFaq') && course ? asArray<FaqItem>(course.faq) : own.length ? own : []

  if (!items.length) return null

  return (
    <section className="section bg-canvas-subtle">
      <div className="container-page">
        <SectionHeading title={f.str('title', 'Les questions fréquentes')} />
        <div className="mx-auto max-w-3xl">
          <Accordion items={items} />
        </div>
      </div>
    </section>
  )
}

function CtaBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const theme = themeOf(f.str('theme', 'brand'))
  const onBrand = theme === 'brand'

  return (
    <section className={cn('section', THEMES[theme])}>
      <div className="container-page text-center">
        <h2 className={cn('text-3xl sm:text-4xl', onBrand ? 'text-brand-50' : 'text-fg')}>{f.str('title')}</h2>
        {f.str('text') && (
          <p
            className={cn(
              'mx-auto mt-4 max-w-2xl text-lg leading-relaxed',
              onBrand ? 'text-brand-100' : 'text-fg-muted',
            )}
          >
            {f.str('text')}
          </p>
        )}
        {f.str('ctaLabel') && (
          <div className="mt-8">
            <ButtonLink href={f.str('ctaHref', '/contact')} size="lg" variant="accent">
              {f.str('ctaLabel')}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  )
}

function RichTextBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const narrow = f.str('width', 'narrow') === 'narrow'

  return (
    <section className="section bg-canvas">
      <div className="container-page">
        <div className={cn(narrow && 'mx-auto max-w-3xl')}>
          {f.str('title') && <h2 className="mb-6 text-3xl sm:text-4xl">{f.str('title')}</h2>}
          <RichContentView content={parseRichContent(data.content)} />
        </div>
      </div>
    </section>
  )
}

function StatsBlock({ data }: { data: Record<string, unknown> }) {
  const items = d(data).list<{ value?: string; label?: string }>('items')
  if (!items.length) return null

  return (
    <section className="border-y border-line bg-canvas-subtle py-12">
      <div className="container-page">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-bold text-primary-text sm:text-4xl">{s.value}</p>
              <p className="mt-1.5 text-sm text-fg-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LogosBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const items = f.list<{ imageUrl?: string; alt?: string }>('items')
  if (!items.length) return null

  return (
    <section className="bg-surface py-12">
      <div className="container-page text-center">
        {f.str('title') && (
          <p className="mb-7 text-sm font-medium uppercase tracking-wider text-fg-subtle">
            {f.str('title')}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {items.map((logo, i) =>
            logo.imageUrl ? (
              <img
                key={i}
                src={logo.imageUrl}
                alt={logo.alt ?? ''}
                className="h-10 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
              />
            ) : null,
          )}
        </div>
      </div>
    </section>
  )
}

function VideoBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)

  // Résolution partagée avec la page de leçon. Ce bloc portait sa propre
  // expression régulière YouTube, qui ignorait `/live/` et `/shorts/` et
  // omettait `rel=0` : deux lecteurs sur le même site, deux comportements.
  const target = resolveVideoUrl(f.str('url'))

  // Un URI `storage://` ne peut PAS être signé ici : ce composant est aussi
  // rendu dans l'aperçu de l'éditeur, côté navigateur, où la clé de service
  // n'existe pas. Une vidéo de page publique se colle donc par URL — et c'est
  // cohérent : une vidéo de vente est faite pour être vue, la ranger dans un
  // espace privé puis la signer à chaque rendu casserait sa mise en cache.
  if (!target || target.kind === 'storage') return null

  const embed = target.kind === 'embed' ? target.url : null

  return (
    <section className="section bg-canvas">
      <div className="container-page">
        {f.str('title') && <SectionHeading title={f.str('title')} />}
        <div className="mx-auto max-w-4xl">
          {embed ? (
            <div className="aspect-video overflow-hidden rounded-lg bg-canvas shadow-e3 ring-1 ring-line">
              <iframe
                src={embed}
                title={f.str('title', 'Vidéo')}
                loading="lazy"
                className="h-full w-full border-0"
                allow={VIDEO_IFRAME_ALLOW}
                allowFullScreen
              />
            </div>
          ) : (
            /* Lien direct : rien n'est téléchargé avant que le visiteur ne
               clique — voir le commentaire de VideoPlayer. */
            <VideoPlayer
              src={target.url}
              poster={f.str('poster') || null}
              title={f.str('title', 'Vidéo de présentation')}
              className="shadow-e3"
            />
          )}
        </div>
        {f.str('caption') && (
          <p className="mx-auto mt-3 max-w-4xl text-center text-sm text-fg-subtle">
            {f.str('caption')}
          </p>
        )}
      </div>
    </section>
  )
}

function ImageBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  if (!f.str('imageUrl')) return null

  return (
    <section className="section bg-canvas">
      <div className="container-page">
        <figure className="mx-auto max-w-4xl">
          <img
            src={f.str('imageUrl')}
            alt={f.str('alt')}
            className="w-full rounded-lg object-cover"
          />
          {f.str('caption') && (
            <figcaption className="mt-3 text-center text-sm text-fg-subtle">
              {f.str('caption')}
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  )
}

/* --- Blocs alimentés par la base ----------------------------------- */

function CourseGridBlock({ data, pool }: { data: Record<string, unknown>; pool: BlockData }) {
  const f = d(data)
  // Même filtrage que la requête d'origine — `featured` puis `limit` — mais
  // appliqué à la liste déjà récupérée par la page.
  const courses = pool.courses
    .filter((c) => (f.bool('featuredOnly') ? c.featured : true))
    .slice(0, f.num('limit', 3) || 3)
  if (!courses.length) return null

  return (
    <section className="section bg-canvas-subtle">
      <div className="container-page">
        <SectionHeading title={f.str('title', 'Nos formations')} subtitle={f.str('subtitle')} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <ButtonLink href="/formations" variant="outline">
            Toutes les formations
            <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

function ProductGridBlock({ data, pool }: { data: Record<string, unknown>; pool: BlockData }) {
  const f = d(data)
  const products = (pool.products ?? [])
    .filter((p) => (f.bool('featuredOnly') ? p.featured : true))
    .slice(0, f.num('limit', 3) || 3)
  if (!products.length) return null

  return (
    <section className="section bg-canvas">
      <div className="container-page">
        <SectionHeading title={f.str('title', 'La boutique')} subtitle={f.str('subtitle')} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <ButtonLink href="/boutique" variant="outline">
            Toute la boutique
            <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

function ServiceGridBlock({ data, pool }: { data: Record<string, unknown>; pool: BlockData }) {
  const f = d(data)
  const services = pool.services.slice(0, f.num('limit', 3) || 3)
  if (!services.length) return null

  return (
    <section className="section bg-canvas">
      <div className="container-page">
        <SectionHeading title={f.str('title', 'Nos services')} subtitle={f.str('subtitle')} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PostGridBlock({ data, pool }: { data: Record<string, unknown>; pool: BlockData }) {
  const f = d(data)
  const posts = pool.posts.slice(0, f.num('limit', 3) || 3)
  if (!posts.length) return null

  return (
    <section className="section bg-canvas-subtle">
      <div className="container-page">
        <SectionHeading title={f.str('title', 'Derniers articles')} subtitle={f.str('subtitle')} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsBlock({
  data,
  course,
  pool,
}: {
  data: Record<string, unknown>
  course: Course | null
  pool: BlockData
}) {
  const f = d(data)
  const manual = f.list<{ name?: string; role?: string; text?: string; rating?: number }>('items')

  let items = manual
  if (f.bool('useApprovedReviews', true)) {
    // Les avis d'une formation précise, ou tous quand le bloc n'en vise aucune.
    const reviews: Review[] = course
      ? pool.reviews.filter((r) => r.course_id === course.id)
      : pool.reviews
    if (reviews.length) {
      items = reviews.map((r) => ({
        name: r.author_name,
        role: r.author_role ?? undefined,
        text: r.comment ?? '',
        rating: r.rating,
      }))
    }
  }

  if (!items.length) return null

  const cards = items.map((t, i) => (
    <figure
      key={i}
      className="flex h-full flex-col rounded-lg border border-line bg-canvas-subtle/60 p-6"
    >
      {typeof t.rating === 'number' && <Stars rating={t.rating} className="mb-3" />}
      <blockquote className="flex-1 text-base leading-relaxed text-fg-muted">
        « {t.text} »
      </blockquote>
      <figcaption className="mt-4 border-t border-line pt-4">
        <p className="font-semibold text-fg">{t.name}</p>
        {t.role && <p className="text-xs text-fg-subtle">{t.role}</p>}
      </figcaption>
    </figure>
  ))

  return (
    <section className="section bg-canvas">
      <div className="container-page">
        <SectionHeading title={f.str('title', 'Ils nous font confiance')} />
        {/* Au-delà de trois avis, la grille impose de faire défiler toute la
            page : le rail horizontal garde la section à hauteur constante. */}
        {cards.length > 3 ? (
          <Scroller itemClassName="w-[19rem] sm:w-[23rem]" ariaLabel="Témoignages">
            {cards}
          </Scroller>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{cards}</div>
        )}
      </div>
    </section>
  )
}

/**
 * Galerie d'intervenants.
 *
 * Au-delà de quatre portraits la grille passe en rail horizontal : une
 * deuxième rangée de visages allonge la page sans rien ajouter à la preuve.
 */
function ExpertsBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const items = f
    .list<{ name?: string; role?: string; photoUrl?: string; bio?: string }>('items')
    .filter((item) => item.name?.trim())

  if (!items.length) return null

  const cards = items.map((expert, index) => (
    <figure
      key={index}
      className="flex h-full flex-col items-center rounded-lg border border-line bg-canvas-subtle/60 p-6 text-center"
    >
      <Avatar name={expert.name} src={expert.photoUrl || null} size="xl" />
      <figcaption className="mt-4">
        <p className="font-semibold text-fg">{expert.name}</p>
        {expert.role && <p className="mt-0.5 text-xs text-primary-text">{expert.role}</p>}
      </figcaption>
      {expert.bio && (
        <p className="mt-3 text-base leading-relaxed text-fg-muted">{expert.bio}</p>
      )}
    </figure>
  ))

  return (
    <section className="section bg-canvas-subtle">
      <div className="container-page">
        <SectionHeading
          title={f.str('title', 'Celles et ceux qui vous accompagnent')}
          subtitle={f.str('subtitle')}
        />
        {cards.length > 4 ? (
          <Scroller itemClassName="w-[15rem]" ariaLabel="Intervenants">
            {cards}
          </Scroller>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{cards}</div>
        )}
      </div>
    </section>
  )
}

/** Ressources offertes — levier d'acquisition placé avant l'offre payante. */
function FreeContentBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  const items = f
    .list<{
      label?: string
      title?: string
      description?: string
      imageUrl?: string
      href?: string
    }>('items')
    .filter((item) => item.title?.trim())

  if (!items.length) return null

  return (
    <section className="section bg-canvas">
      <div className="container-page">
        <SectionHeading
          title={f.str('title', 'Commencez gratuitement')}
          subtitle={f.str('subtitle')}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const href = item.href?.trim() || '#'
            return (
              <Link
                key={index}
                href={href}
                className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-all hover:-translate-y-1 hover:border-primary-text/40"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-canvas-subtle">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/30 to-canvas" />
                  )}
                  {item.label && (
                    <Badge tone="primary" size="sm" className="absolute left-3 top-3 backdrop-blur">
                      {item.label}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold leading-snug text-fg transition-colors group-hover:text-primary-text">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="mt-2 flex-1 text-base leading-relaxed text-fg-muted">
                      {item.description}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-base font-semibold text-primary-text">
                    Accéder
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ContactFormBlock({ data }: { data: Record<string, unknown> }) {
  const f = d(data)
  return (
    <section className="section bg-canvas-subtle">
      <div className="container-page">
        <SectionHeading title={f.str('title', 'Écrivez-nous')} subtitle={f.str('subtitle')} />
        <div className="mx-auto max-w-2xl">
          <ContactForm />
        </div>
      </div>
    </section>
  )
}

function QuoteFormBlock({
  data,
  service,
}: {
  data: Record<string, unknown>
  service: Service | null
}) {
  const f = d(data)
  return (
    <section className="section bg-canvas-subtle">
      <div className="container-page">
        <SectionHeading title={f.str('title', 'Demander un devis')} subtitle={f.str('subtitle')} />
        <div className="mx-auto max-w-2xl">
          <QuoteForm serviceId={service?.id ?? null} serviceName={service?.title ?? null} />
        </div>
      </div>
    </section>
  )
}

/* Réexport pour les pages qui composent leurs propres sections */
export { Link }
