import type { Metadata } from 'next'
import Link from 'next/link'
import { Award, ExternalLink, GraduationCap } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { CopyButton } from '@/components/ui/copy-button'
import { env } from '@/lib/env'
import { formatDate } from '@/lib/utils'
import type { Course, Enrollment } from '@/lib/types'

export const metadata: Metadata = { title: 'Mes certificats' }

export default async function CertificatesPage() {
  const user = await requireUser('/compte/certificats')
  const supabase = await createClient()

  const { data } = await supabase
    .from('enrollments')
    .select('*, course:courses(id, slug, title, cover_url, min_watch_ratio, require_quiz_pass)')
    .eq('user_id', user.id)
    .in('state', ['active', 'completed'])
    .order('completed_at', { ascending: false, nullsFirst: false })

  const rows = ((data ?? []) as (Enrollment & { course: Course | null })[]).filter((r) => r.course)
  const earned = rows.filter((r) => r.certificate_code)
  const pending = rows.filter((r) => !r.certificate_code && r.progress_percent >= 100)
  const base = env.siteUrl.replace(/\/$/, '')

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl">Mes certificats</h1>
        <p className="mt-1 text-fg-muted">
          Chaque certificat porte un numéro unique, vérifiable en ligne par un employeur ou un
          financeur.
        </p>
      </header>

      {earned.length === 0 && pending.length === 0 ? (
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
                          {row.completed_at ? `Délivré le ${formatDate(row.completed_at)}` : 'Délivré'}
                          {' · '}
                          <span className="font-mono">{row.certificate_code}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <ButtonLink href={`/compte/certificat/${row.certificate_code}`} size="sm">
                        Voir et imprimer
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
              <h2 className="mb-3 text-lg font-semibold">En attente de validation</h2>
              <ul className="space-y-3">
                {pending.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4"
                  >
                    <span className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-fg-subtle" aria-hidden />
                      <span>
                        <span className="block font-medium text-fg">{row.course!.title}</span>
                        <span className="block text-xs text-fg-subtle">
                          Leçons terminées : il reste{' '}
                          {[
                            row.course!.min_watch_ratio > 0 && 'le temps de visionnage',
                            row.course!.require_quiz_pass && 'les questionnaires',
                          ]
                            .filter(Boolean)
                            .join(' et ') || 'une condition'}{' '}
                          à valider.
                        </span>
                      </span>
                    </span>
                    <ButtonLink href={`/compte/formations/${row.course!.slug}`} variant="outline" size="sm">
                      Compléter
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
