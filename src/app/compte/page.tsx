import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { getUserEnrollments } from '@/lib/queries'
import { ButtonLink } from '@/components/ui/button'
import { Alert, EmptyState, ProgressBar } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Mes formations' }

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; succes?: string }>
}) {
  const { erreur, succes } = await searchParams
  const user = await requireUser()
  const enrollments = await getUserEnrollments(user.id)

  return (
    <div className="space-y-6">
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

      <div>
        <h1 className="text-2xl">
          Bonjour {user.profile.full_name?.split(' ')[0] ?? ''}
        </h1>
        <p className="mt-1 text-fg-muted">
          {enrollments.length > 0
            ? 'Reprenez là où vous vous êtes arrêté.'
            : 'Vos formations apparaîtront ici après votre premier achat.'}
        </p>
      </div>

      {enrollments.length === 0 ? (
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
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {enrollments.map((enrollment) => (
            <Link
              key={enrollment.id}
              href={`/compte/formations/${enrollment.course.slug}`}
              className="group overflow-hidden rounded-lg border border-line bg-surface shadow-e1 transition-all hover:-translate-y-0.5 hover:border-primary-text/40 hover:shadow-e2"
            >
              {enrollment.course.cover_url && (
                <img
                  src={enrollment.course.cover_url}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                />
              )}
              <div className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  {enrollment.state === 'completed' ? (
                    <Badge tone="success">Terminée</Badge>
                  ) : enrollment.progress_percent > 0 ? (
                    <Badge tone="primary">En cours</Badge>
                  ) : (
                    <Badge tone="neutral">À commencer</Badge>
                  )}
                </div>

                <h2 className="text-lg font-semibold leading-snug text-fg group-hover:text-primary-hover">
                  {enrollment.course.title}
                </h2>

                <ProgressBar value={enrollment.progress_percent} showLabel className="mt-4" />

                <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary-text">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  {enrollment.progress_percent > 0 ? 'Continuer' : 'Commencer'}
                </p>

                {enrollment.completed_at && (
                  <p className="mt-2 text-xs text-fg-subtle">
                    Terminée le {formatDate(enrollment.completed_at)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
