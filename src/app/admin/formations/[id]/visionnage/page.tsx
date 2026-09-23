import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AlertTriangle, Award } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, Table, Td, Th } from '@/components/admin/shell'
import { Badge } from '@/components/ui/badge'
import { Alert, EmptyState, ProgressBar } from '@/components/ui/misc'
import { formatDuration } from '@/lib/utils'
import type { Course, LearnerWatchStats } from '@/lib/types'

export const metadata: Metadata = { title: 'Temps de visionnage' }
export const dynamic = 'force-dynamic'

export default async function WatchTimePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .maybeSingle<Course>()
  if (!course) notFound()

  // La vue traverse des tables protégées et n'est ouverte à aucun rôle client :
  // seule la clé de service la lit.
  const { data } = await supabase
    .from('bz_learner_watch_stats')
    .select('*')
    .eq('course_id', id)
    .order('watched_seconds', { ascending: false })

  const learners = (data ?? []) as LearnerWatchStats[]
  const threshold = course.min_watch_ratio

  return (
    <>
      <PageHeader
        title="Temps de visionnage"
        description={course.title}
        backHref={`/admin/formations/${id}`}
        backLabel="Retour à la formation"
      />

      {threshold > 0 ? (
        <Alert tone="info" className="mb-6">
          Le certificat n’est délivré que si chaque leçon a été visionnée à hauteur de{' '}
          <strong>{Math.round(threshold * 100)} %</strong> de sa durée. Les leçons dont la durée
          n’est pas renseignée ne sont pas prises en compte — on ne peut pas exiger une part d’une
          durée inconnue.
        </Alert>
      ) : (
        <Alert tone="warning" className="mb-6">
          Aucune exigence de visionnage n’est active sur cette formation : le certificat est
          délivré dès que l’apprenant a coché toutes les leçons, sans qu’aucune vidéo n’ait été
          lue. Réglez « Visionnage minimum par leçon » dans la fiche formation pour l’activer.
        </Alert>
      )}

      {learners.length === 0 ? (
        <EmptyState
          title="Aucun inscrit pour le moment"
          description="Le temps de visionnage apparaîtra ici dès la première inscription."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Apprenant</Th>
              <Th>Progression</Th>
              <Th>Visionné</Th>
              <Th>Leçons sautées</Th>
              <Th>Certificat</Th>
            </tr>
          </thead>
          <tbody>
            {learners.map((row) => (
              <tr key={row.user_id}>
                <Td>
                  <span className="block font-medium text-fg">{row.full_name ?? '—'}</span>
                  <span className="block text-xs text-fg-subtle">{row.email}</span>
                </Td>

                <Td>
                  <div className="w-36">
                    <ProgressBar value={row.progress_percent} showLabel />
                    <span className="mt-1 block text-xs text-fg-subtle">
                      {row.lessons_completed}/{row.lessons_total} leçons cochées
                    </span>
                  </div>
                </Td>

                <Td>
                  <span className="block tabular-nums text-fg">
                    {formatDuration(row.watched_seconds)}
                  </span>
                  {/* La durée totale sert de repère. Le rapport peut dépasser
                      100 % : revoir une leçon compte deux fois, ce qui est le
                      comportement voulu pour un temps de visionnage. */}
                  <span className="block text-xs text-fg-subtle">
                    sur {formatDuration(row.duration_seconds)} de contenu
                  </span>
                </Td>

                <Td>
                  {threshold === 0 ? (
                    <span className="text-fg-subtle">—</span>
                  ) : row.lessons_skipped > 0 ? (
                    <Badge tone="warning">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                      {row.lessons_skipped}
                    </Badge>
                  ) : (
                    <Badge tone="success">Aucune</Badge>
                  )}
                </Td>

                <Td>
                  {row.certificate_code ? (
                    <Badge tone="success">
                      <Award className="h-3.5 w-3.5" aria-hidden />
                      Délivré
                    </Badge>
                  ) : row.progress_percent >= 100 ? (
                    <Badge tone="warning">Retenu</Badge>
                  ) : (
                    <span className="text-fg-subtle">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
