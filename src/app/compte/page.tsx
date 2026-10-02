import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Package,
  PlayCircle,
  Sparkles,
} from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { getLearnerDashboard } from '@/lib/learner'
import { getPublishedCourses, getPublishedProducts } from '@/lib/queries'
import { PRODUCT_KINDS } from '@/lib/products'
import { ButtonLink } from '@/components/ui/button'
import { Alert, EmptyState, ProgressBar } from '@/components/ui/misc'
import { EnrollmentCard } from '@/components/account/enrollment-card'
import { formatDuration, formatPrice, payablePrice } from '@/lib/utils'
import { MediaView } from '@/components/ui/media-view'

export const metadata: Metadata = { title: 'Mon espace' }

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; succes?: string }>
}) {
  const { erreur, succes } = await searchParams
  const user = await requireUser()
  const dashboard = await getLearnerDashboard(user.id)
  const firstName = user.profile.full_name?.trim().split(/\s+/)[0] ?? ''

  const inProgress = dashboard.enrollments.filter((e) => e.enrollment.state !== 'completed')
  const hasContent = dashboard.enrollments.length > 0 || dashboard.products.length > 0

  // Suggestions : ce que l'apprenant ne possède pas encore. Affichées quand
  // l'espace est vide, pour qu'il ne tombe jamais sur une page morte.
  const ownedCourses = new Set(dashboard.enrollments.map((e) => e.course.id))
  const ownedProducts = new Set(dashboard.products.map((p) => p.product_id))
  const [courses, products] = hasContent && inProgress.length > 0
    ? [[], []]
    : await Promise.all([getPublishedCourses({ limit: 6 }), getPublishedProducts({ limit: 6 })])
  const suggestions = [
    ...courses
      .filter((c) => !ownedCourses.has(c.id))
      .map((c) => ({
        key: `c-${c.id}`,
        href: `/formations/${c.slug}`,
        title: c.title,
        kind: 'Formation',
        price: payablePrice(c),
        currency: c.currency,
        cover: c.cover_url,
      })),
    ...products
      .filter((p) => !ownedProducts.has(p.id))
      .map((p) => ({
        key: `p-${p.id}`,
        href: `/boutique/${p.slug}`,
        title: p.title,
        kind: PRODUCT_KINDS[p.kind]?.label ?? 'Produit',
        price: payablePrice(p),
        currency: p.currency,
        cover: p.cover_url,
      })),
  ].slice(0, 3)

  return (
    <div className="space-y-8">
      {erreur === 'acces-refuse' && (
        <Alert tone="warning" title="Accès réservé">
          Votre compte n’a pas les droits d’administration.
        </Alert>
      )}
      {succes === 'commande' && (
        <Alert tone="success" title="Paiement confirmé">
          Votre accès est ouvert. Bonne formation !
        </Alert>
      )}

      <header>
        <h1 className="text-2xl">{firstName ? `Bonjour ${firstName}` : 'Bonjour'}</h1>
        <p className="mt-1 text-fg-muted">
          {dashboard.resume
            ? 'Reprenez là où vous vous êtes arrêté.'
            : hasContent
              ? 'Retrouvez ici vos formations, vos produits et vos certificats.'
              : 'Vos formations et vos produits apparaîtront ici après votre premier achat.'}
        </p>
      </header>

      {/* ---------- Reprendre ------------------------------------------- */}
      {dashboard.resume && (
        <section
          aria-label="Reprendre"
          className="overflow-hidden rounded-lg border border-primary-text/30 bg-surface shadow-e2"
        >
          <div className="grid sm:grid-cols-[14rem_1fr]">
            <div className="relative hidden bg-canvas-subtle sm:block">
              {dashboard.resume.summary.course.cover_url ? (
                <MediaView
                  src={dashboard.resume.summary.course.cover_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/30 to-canvas">
                  <GraduationCap className="h-10 w-10 text-primary-text/70" aria-hidden />
                </div>
              )}
            </div>
            <div className="p-6">
              <p className="eyebrow">Reprendre</p>
              <h2 className="mt-2 text-lg font-semibold text-fg">
                {dashboard.resume.lesson.title}
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                {dashboard.resume.summary.course.title} · Module {dashboard.resume.lesson.moduleIndex}{' '}
                — {dashboard.resume.lesson.moduleTitle}
              </p>

              <div className="mt-4 max-w-md">
                <ProgressBar value={dashboard.resume.summary.enrollment.progress_percent} showLabel />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <ButtonLink
                  href={`/compte/formations/${dashboard.resume.summary.course.slug}/${dashboard.resume.lesson.id}`}
                  size="lg"
                >
                  <PlayCircle className="h-5 w-5" aria-hidden />
                  Reprendre la leçon
                </ButtonLink>
                <Link
                  href={`/compte/formations/${dashboard.resume.summary.course.slug}`}
                  className="text-sm font-medium text-fg-muted hover:text-primary-text"
                >
                  Voir le programme
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Indicateurs ------------------------------------------ */}
      {hasContent && (
        <section aria-label="Mes indicateurs" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric
            icon={BookOpen}
            label="Formations"
            value={String(dashboard.enrollments.length)}
            hint={
              inProgress.length > 0
                ? `${inProgress.length} en cours`
                : dashboard.enrollments.length > 0
                  ? 'toutes terminées'
                  : undefined
            }
          />
          <Metric
            icon={CheckCircle2}
            label="Leçons terminées"
            value={String(dashboard.lessonsDone)}
          />
          <Metric
            icon={Clock}
            label="Temps de vidéo"
            value={dashboard.watchedSeconds >= 60 ? formatDuration(dashboard.watchedSeconds) : '0 min'}
            hint="réellement regardé"
          />
          <Metric
            icon={Award}
            label="Certificats"
            value={String(dashboard.certificates)}
            href={dashboard.certificates > 0 ? '/compte/certificats' : undefined}
          />
        </section>
      )}

      {/* ---------- Formations -------------------------------------------- */}
      {dashboard.enrollments.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">Mes formations</h2>
            {dashboard.enrollments.length > 4 && (
              <Link href="/compte/formations" className="text-sm font-medium text-primary-text hover:underline">
                Tout voir
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {dashboard.enrollments.slice(0, 4).map((summary) => (
              <EnrollmentCard key={summary.enrollment.id} summary={summary} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Produits ---------------------------------------------- */}
      {dashboard.products.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">Mes produits</h2>
            <Link href="/compte/produits" className="text-sm font-medium text-primary-text hover:underline">
              Tout voir
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dashboard.products.slice(0, 4).map(({ product }) => {
              const Kind = PRODUCT_KINDS[product.kind]?.icon ?? Package
              return (
                <li key={product.id}>
                  <Link
                    href={`/compte/produits#${product.slug}`}
                    className="flex items-center gap-3.5 rounded-lg border border-line bg-surface p-3.5 transition-colors duration-fast hover:border-primary-text/40 hover:bg-canvas-subtle"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-subtle text-primary-text">
                      {product.cover_url ? (
                        <MediaView src={product.cover_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Kind className="h-5 w-5" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-fg">{product.title}</span>
                      <span className="block text-xs text-fg-subtle">
                        {PRODUCT_KINDS[product.kind]?.label ?? 'Produit'}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ---------- Découvrir --------------------------------------------- */}
      {!hasContent && suggestions.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="Aucune formation pour le moment"
          description="Parcourez le catalogue et rejoignez la formation qui correspond à votre projet."
          action={
            <ButtonLink href="/formations">
              Voir les formations
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          }
        />
      )}

      {suggestions.length > 0 && (
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary-text" aria-hidden />
            {hasContent ? 'Pour aller plus loin' : 'Pour bien démarrer'}
          </h2>
          <p className="mb-4 text-sm text-fg-muted">
            Des ressources choisies pour avancer sur votre projet.
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {suggestions.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-all duration-base hover:-translate-y-0.5 hover:border-primary-text/40 hover:shadow-e2"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-canvas-subtle">
                    {item.cover ? (
                      <MediaView src={item.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/25 to-canvas" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <span className="text-xs font-medium text-fg-subtle">{item.kind}</span>
                    <span className="mt-1 font-medium leading-snug text-fg group-hover:text-primary-text">
                      {item.title}
                    </span>
                    <span className="mt-auto pt-3 text-sm font-semibold text-primary-text">
                      {formatPrice(item.price, item.currency)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: typeof BookOpen
  label: string
  value: string
  hint?: string
  href?: string
}) {
  const body = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-subtle text-primary-text">
        <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
      </span>
      <span className="mt-3 block text-xl font-bold tabular-nums text-fg">{value}</span>
      <span className="block text-sm text-fg-muted">{label}</span>
      {hint && <span className="block text-xs text-fg-subtle">{hint}</span>}
    </>
  )
  const className = 'block rounded-lg border border-line bg-surface p-4'
  return href ? (
    <Link href={href} className={`${className} transition-colors duration-fast hover:border-primary-text/40`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}
