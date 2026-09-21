import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  MessageCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'

import { CourseCard, FeaturedCourseCard, PostCard, ServiceCard } from '@/components/public/cards'
import { ButtonLink } from '@/components/ui/button'
import { Card, Glow, Panel } from '@/components/ui/surface'
import { Pill } from '@/components/ui/pill'
import { Reveal } from '@/components/ui/reveal'
import { Scroller } from '@/components/ui/scroller'
import { Section, SectionHeader } from '@/components/ui/section'
import { Stars } from '@/components/ui/misc'
import type { Course, Post, Review, Service, SiteSettings } from '@/lib/types'

/**
 * Page d'accueil par défaut.
 *
 * Elle ne s'affiche que tant qu'aucune page d'accueil n'a été composée dans
 * l'admin : l'éditeur de blocs garde toujours la priorité. Tous les chiffres
 * affichés proviennent de données réelles — aucun indicateur n'est inventé,
 * et les sections sans contenu disparaissent d'elles-mêmes.
 */
export function HomeLanding({
  settings,
  courses,
  services,
  posts,
  reviews,
}: {
  settings: SiteSettings
  courses: Course[]
  services: Service[]
  posts: Post[]
  reviews: Review[]
}) {
  const featured = courses.find((c) => c.featured) ?? courses[0] ?? null
  const averageRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null

  return (
    <>
      <Hero settings={settings} course={featured} />
      <ProofBand courses={courses} services={services} reviews={reviews} rating={averageRating} />
      <Approach />
      <Courses courses={courses} />
      <Method />
      <Services services={services} />
      <Testimonials reviews={reviews} />
      <Journal posts={posts} />
      <FinalCta settings={settings} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Bannière                                                            */
/* ------------------------------------------------------------------ */

function Hero({ settings, course }: { settings: SiteSettings; course: Course | null }) {
  return (
    <section className="relative overflow-hidden bg-surface-950">
      <Glow tone="both" />

      {/* La barre de navigation flotte par-dessus : on compense sa hauteur
          pour que le titre ne commence pas dessous. */}
      <div className="container-page relative pb-20 pt-14 sm:pb-24 sm:pt-20 lg:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Pill tone="brand" size="md">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Cabinet d’accompagnement des entreprises
            </Pill>

            <h1 className="mt-7 text-h1 text-onDark-hi sm:text-display">
              {settings.tagline ?? (
                <>
                  Structurez votre projet.
                  <br />
                  <span className="text-brand-300">Convainquez vos partenaires.</span>
                </>
              )}
            </h1>

            <p className="mt-6 max-w-xl text-body-lg text-onDark-md">
              {settings.default_seo_description ??
                'Des formations pratiques et un accompagnement sur mesure pour bâtir un business plan solide, financer votre activité et piloter votre croissance.'}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/formations" size="lg" variant="accent">
                Découvrir les formations
                <ArrowRight className="h-5 w-5" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/services" size="lg" variant="outline">
                Parler d’un projet
              </ButtonLink>
            </div>

            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-body text-onDark-md">
              {['Paiement Mobile Money', 'Accès à vie', 'Modèles Excel & Word inclus'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-400" aria-hidden />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          {course && (
            <Reveal delay={120}>
              <FeaturedCourseCard course={course} />
            </Reveal>
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Bandeau de preuves                                                  */
/* ------------------------------------------------------------------ */

function ProofBand({
  courses,
  services,
  reviews,
  rating,
}: {
  courses: Course[]
  services: Service[]
  reviews: Review[]
  rating: number | null
}) {
  // Uniquement des valeurs mesurées : une métrique sans donnée n'apparaît pas.
  const metrics = [
    courses.length > 0 && { value: `${courses.length}`, label: 'Formations disponibles' },
    services.length > 0 && { value: `${services.length}`, label: 'Offres d’accompagnement' },
    reviews.length > 0 && { value: `${reviews.length}`, label: 'Avis clients publiés' },
    rating !== null && { value: `${rating}/5`, label: 'Note moyenne' },
  ].filter(Boolean) as { value: string; label: string }[]

  if (metrics.length < 2) return null

  return (
    <section className="border-y border-surface-800 bg-surface-900">
      <div className="container-page grid grid-cols-2 gap-8 py-12 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="text-center">
            <p className="text-h1 font-bold text-brand-300">{metric.value}</p>
            <p className="mt-1.5 text-body text-onDark-lo">{metric.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Approche                                                            */
/* ------------------------------------------------------------------ */

const PILLARS = [
  {
    icon: FileSpreadsheet,
    title: 'Des outils prêts à l’emploi',
    text: 'Modèles Excel et Word livrés avec chaque formation : vous repartez avec un document exploitable, pas seulement des notes.',
  },
  {
    icon: Target,
    title: 'Une méthode pas à pas',
    text: 'Chaque module suit l’ordre réel d’un projet, du diagnostic au plan de financement. Aucun prérequis technique.',
  },
  {
    icon: MessageCircle,
    title: 'Un accompagnement humain',
    text: 'Nos consultants répondent à vos questions et relisent vos livrables. Vous n’avancez jamais seul.',
  },
] as const

function Approach() {
  return (
    <Section tone="base" size="lg">
      <div className="container-page">
        <SectionHeader
          align="center"
          eyebrow="Notre approche"
          title="Former, outiller et accompagner jusqu’au résultat"
        />

        <div className="grid gap-7 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={index * 90}>
              <Card className="h-full p-7">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-control bg-brand-400/12 text-brand-300 ring-1 ring-brand-400/25">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-h3 text-onDark-hi">{title}</h3>
                <p className="mt-2.5 text-body leading-relaxed text-onDark-md">{text}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Formations                                                          */
/* ------------------------------------------------------------------ */

function Courses({ courses }: { courses: Course[] }) {
  if (courses.length === 0) return null

  return (
    <Section tone="raised" size="lg">
      <div className="container-page">
        <SectionHeader
          eyebrow="Nos formations"
          title="Montez en compétence à votre rythme"
          action={
            <Link
              href="/formations"
              className="inline-flex items-center gap-1.5 text-body font-semibold text-brand-300 hover:text-brand-200"
            >
              Tout le catalogue
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.slice(0, 6).map((course, index) => (
            <Reveal key={course.id} delay={index * 70}>
              <CourseCard course={course} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Méthode en trois temps                                              */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    icon: Users,
    title: 'On clarifie votre projet',
    text: 'Un échange pour cerner votre activité, vos objectifs et le livrable attendu par vos interlocuteurs.',
  },
  {
    icon: TrendingUp,
    title: 'Vous construisez avec nos outils',
    text: 'Vidéos, modèles et exemples concrets vous guident étape par étape jusqu’au document finalisé.',
  },
  {
    icon: ShieldCheck,
    title: 'Vous présentez en confiance',
    text: 'Un dossier structuré, chiffré et défendable devant une banque, un fonds ou un partenaire.',
  },
] as const

/** Photographie de terrain — remplaçable sans toucher au code. */
const FIELD_IMAGE = '/media/agriculture.webp'

function Method() {
  return (
    <Section tone="base" size="lg">
      <div className="container-page">
        <div className="grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Une photographie de terrain ancre le propos : sans elle, trois
              encarts de texte flottent sans rien dire du métier. */}
          <Reveal className="relative">
            <div className="overflow-hidden rounded-panel ring-1 ring-surface-700">
              <img
                src={FIELD_IMAGE}
                alt="Exploitant agricole au travail dans son champ"
                width={941}
                height={941}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover"
              />
            </div>
            {/* Dégradé bas : raccorde la photo au fond sombre de la section */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-28 rounded-b-panel bg-gradient-to-t from-surface-950 to-transparent"
              aria-hidden
            />
          </Reveal>

          <div>
            <SectionHeader
              eyebrow="Comment ça se passe"
              title="Trois étapes, un résultat concret"
              className="mb-9"
            />

            <ol className="space-y-8">
              {STEPS.map(({ icon: Icon, title, text }, index) => (
                <Reveal key={title} delay={index * 90}>
                  <li className="flex gap-5">
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-surface-900 text-brand-300 ring-1 ring-surface-600">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-meta font-bold uppercase tracking-[0.18em] text-accent-400">
                        Étape {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3 className="mt-1 text-h3 text-onDark-hi">{title}</h3>
                      <p className="mt-2 text-body leading-relaxed text-onDark-md">{text}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

function Services({ services }: { services: Service[] }) {
  if (services.length === 0) return null

  return (
    <Section tone="raised" size="lg">
      <div className="container-page">
        <SectionHeader
          eyebrow="Accompagnement sur mesure"
          title="Nos services aux entreprises"
          action={
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 text-body font-semibold text-brand-300 hover:text-brand-200"
            >
              Voir tous les services
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 3).map((service, index) => (
            <Reveal key={service.id} delay={index * 70}>
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Témoignages                                                         */
/* ------------------------------------------------------------------ */

function Testimonials({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null

  return (
    <Section tone="panel" size="lg">
      <div className="container-page">
        <SectionHeader
          align="center"
          eyebrow="Ils nous ont fait confiance"
          title="Ce qu’en disent nos clients"
        />

        <Scroller itemClassName="w-[19rem] sm:w-[23rem]" ariaLabel="Témoignages clients">
          {reviews.slice(0, 8).map((review) => (
            <figure
              key={review.id}
              className="flex h-full flex-col rounded-card bg-surface-800 p-7 ring-1 ring-surface-700"
            >
              <Quote className="h-7 w-7 text-brand-400/50" aria-hidden />
              {review.comment && (
                <blockquote className="mt-4 flex-1 text-body leading-relaxed text-onDark-md">
                  {review.comment}
                </blockquote>
              )}
              <figcaption className="mt-6 border-t border-surface-700 pt-4">
                <Stars rating={review.rating} />
                <p className="mt-2.5 text-body font-semibold text-onDark-hi">
                  {review.author_name}
                </p>
                {review.author_role && (
                  <p className="text-meta text-onDark-lo">{review.author_role}</p>
                )}
              </figcaption>
            </figure>
          ))}
        </Scroller>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Blog                                                                */
/* ------------------------------------------------------------------ */

function Journal({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null

  return (
    <Section tone="base" size="lg">
      <div className="container-page">
        <SectionHeader
          eyebrow="Ressources"
          title="Conseils et analyses"
          action={
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-body font-semibold text-brand-300 hover:text-brand-200"
            >
              Tous les articles
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, 3).map((post, index) => (
            <Reveal key={post.id} delay={index * 70}>
              <PostCard post={post} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Appel à l'action final                                              */
/* ------------------------------------------------------------------ */

/**
 * Visuel d'équipe détouré (fond transparent).
 * Remplacer ce fichier dans `public/media/` suffit à changer l'image —
 * aucune modification de code n'est nécessaire.
 */
const TEAM_IMAGE = '/media/equipe.webp'

function FinalCta({ settings }: { settings: SiteSettings }) {
  return (
    <Section tone="raised" size="lg">
      <div className="container-page">
        <Panel elevation="floating" className="relative overflow-hidden">
          <Glow tone="brand" />

          <div className="relative grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="px-6 pb-4 pt-14 text-center sm:px-12 sm:pt-16 lg:pb-16 lg:text-left">
              <h2 className="text-h2 text-onDark-hi sm:text-h1">
                Prêt à donner une structure à votre projet ?
              </h2>
              <p className="mt-5 max-w-xl text-body-lg text-onDark-md lg:mx-0">
                Commencez par une formation, ou parlez-nous directement de votre situation. La
                première prise de contact est gratuite.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row lg:justify-start">
                <ButtonLink href="/formations" size="lg" variant="accent">
                  Choisir une formation
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </ButtonLink>
                <ButtonLink href="/contact" size="lg" variant="outline">
                  Nous écrire
                </ButtonLink>
              </div>

              {settings.phone && (
                <p className="mt-8 text-body text-onDark-lo">
                  Une question rapide ? {settings.phone}
                </p>
              )}
            </div>

            {/* Le détourage est aligné sur le bas du panneau : les personnes
                reposent sur son arête au lieu de flotter dans un cadre. */}
            <div className="relative hidden self-end lg:block">
              <img
                src={TEAM_IMAGE}
                alt=""
                width={1448}
                height={1086}
                loading="lazy"
                decoding="async"
                className="ml-auto block w-full max-w-lg select-none object-contain object-bottom"
              />
            </div>
          </div>
        </Panel>
      </div>
    </Section>
  )
}
