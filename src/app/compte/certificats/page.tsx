import type { Metadata } from 'next'
import Link from 'next/link'
import { Award, ExternalLink, GraduationCap } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { CopyButton } from '@/components/ui/copy-button'
import { CertificateRequestForm } from '@/components/account/certificate-request-form'
import { getSiteUrl } from '@/lib/site-url'
import { formatDate } from '@/lib/utils'
import type { Course, Enrollment } from '@/lib/types'

export const metadata: Metadata = { title: 'Mes certificats' }

export default async function CertificatesPage() {
  const user = await requireUser('/compte/certificats')
  const supabase = await createClient()

  const { data } = await supabase
    .from('enrollments')
    // `courses(*)` plutôt qu'une liste : `certificate_enabled` (0015) peut
    // manquer sur une base pas encore migrée, et une colonne nommée absente
    // ferait échouer toute la requête.
    .select('*, course:courses(*)')
    .eq('user_id', user.id)
    .in('state', ['active', 'completed'])
    .order('completed_at', { ascending: false, nullsFirst: false })

  const rows = ((data ?? []) as (Enrollment & { course: Course | null })[]).filter((r) => r.course)
  const earned = rows.filter((r) => r.certificate_code)
  const certifying = (r: (typeof rows)[number]) => r.course?.certificate_enabled !== false
  // Parcours terminé, certificat pas encore demandé.
  const pending = rows.filter((r) => !r.certificate_code && r.progress_percent >= 100 && certifying(r))
  // En cours : le certificat viendra.
  const upcoming = rows.filter((r) => !r.certificate_code && r.progress_percent < 100 && certifying(r))
  const base = await getSiteUrl()

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl">Mes certificats</h1>
        <p className="mt-1 text-fg-muted">
          Chaque certificat porte un numéro unique, vérifiable en ligne par un employeur ou un
          financeur.
        </p>
      </header>

      {earned.length === 0 && pending.length === 0 && upcoming.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Pas encore de certificat"
          description="Terminez une formation pour obtenir votre certificat de fin de parcours."
          action={<ButtonLink href="/compte/formations">Mes formations</ButtonLink>}
        />
      ) : (
        <>
          {earned.length > 0 && (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {earned.map((row) => {
                const verifyUrl = `${base}/verifier/${row.certificate_code}`
                return (
                  <li
                    key={row.id}
                    className="flex flex-col rounded-lg border border-line bg-surface p-5 shadow-e1"
                  >
                    <div className="flex items-start gap-3.5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-success-subtle text-success">
                        <Award className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug text-fg">{row.course!.title}</p>
                        <p className="mt-0.5 text-xs text-fg-subtle">
                          {row.certificate_issued_at || row.completed_at
                            ? `Délivré le ${formatDate(row.certificate_issued_at ?? row.completed_at)}`
                            : 'Délivré'}
                          {' · '}
                          <span className="font-mono">{row.certificate_code}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <ButtonLink href={`/compte/certificat/${row.certificate_code}`} size="sm">
                        Voir et télécharger
                      </ButtonLink>
                      <CopyButton value={verifyUrl} label="Copier le lien de vérification" />
                      <Link
                        href={`/verifier/${row.certificate_code}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2 text-sm text-fg-muted hover:text-primary-text"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        Page publique
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Prêts à être délivrés</h2>
              <ul className="space-y-4">
                {pending.map((row) => (
                  <li key={row.id} className="overflow-hidden rounded-lg border border-success/30 bg-surface shadow-e1">
                    <div className="flex items-center gap-3 bg-success-subtle px-5 py-4">
                      <Award className="h-6 w-6 shrink-0 text-success" aria-hidden />
                      <div className="min-w-0">
                        <p className="font-semibold text-fg">{row.course!.title}</p>
                        <p className="text-xs text-fg-muted">Formation terminée — confirmez votre nom pour obtenir le certificat.</p>
                      </div>
                    </div>
                    <div className="p-5">
                      <CertificateRequestForm courseId={row.course!.id} defaultName={user.profile.full_name ?? ''} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">En cours</h2>
              <ul className="space-y-3">
                {upcoming.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <GraduationCap className="h-5 w-5 shrink-0 text-fg-subtle" aria-hidden />
                      <span className="min-w-0">
                        <span className="block font-medium text-fg">{row.course!.title}</span>
                        <span className="block text-xs text-fg-subtle">
                          {row.progress_percent} % terminé — le certificat sera disponible à la fin du parcours.
                        </span>
                      </span>
                    </span>
                    <ButtonLink href={`/compte/formations/${row.course!.slug}`} variant="outline" size="sm">
                      Continuer
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
