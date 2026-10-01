import type { Metadata } from 'next'
import { ArrowRight, GraduationCap } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { getLearnerDashboard } from '@/lib/learner'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { EnrollmentCard } from '@/components/account/enrollment-card'

export const metadata: Metadata = { title: 'Mes formations' }

export default async function MyCoursesPage() {
  const user = await requireUser('/compte/formations')
  const { enrollments } = await getLearnerDashboard(user.id)

  const current = enrollments.filter((e) => e.enrollment.state !== 'completed')
  const done = enrollments.filter((e) => e.enrollment.state === 'completed')

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl">Mes formations</h1>
        <p className="mt-1 text-fg-muted">Toutes les formations auxquelles vous avez accès.</p>
      </header>

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
        <>
          {current.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">En cours ({current.length})</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {current.map((summary) => (
                  <EnrollmentCard key={summary.enrollment.id} summary={summary} />
                ))}
              </div>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Terminées ({done.length})</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {done.map((summary) => (
                  <EnrollmentCard key={summary.enrollment.id} summary={summary} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
