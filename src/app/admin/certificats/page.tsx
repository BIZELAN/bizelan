import type { Metadata } from 'next'
import Link from 'next/link'
import { Award, ExternalLink } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, StatCard, Table, Td, Th } from '@/components/admin/shell'
import { CertificateTemplateForm } from '@/components/admin/certificate-template-form'
import { EmptyState } from '@/components/ui/misc'
import { parseCertificateTemplate } from '@/lib/certificate'
import { getSiteSettings } from '@/lib/queries'
import { getSiteUrl } from '@/lib/site-url'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Certificats' }
export const dynamic = 'force-dynamic'

interface IssuedRow {
  id: string
  user_id: string
  certificate_code: string
  certificate_name?: string | null
  certificate_issued_at?: string | null
  completed_at: string | null
  profile: { full_name: string | null; email: string | null } | null
  course: { title: string } | null
}

/**
 * Certificats : le modèle remis aux apprenants, et la liste de ceux délivrés.
 *
 * Un certificat n'est plus délivré d'office : l'apprenant le demande en fin de
 * parcours en confirmant le nom à imprimer. Seules les formations cochées
 * « certifiantes » le proposent.
 */
export default async function AdminCertificatesPage() {
  const supabase = createAdminClient()
  const [settings, siteUrl, { data }, { count: certifyingCourses }] = await Promise.all([
    getSiteSettings(),
    getSiteUrl(),
    supabase
      .from('enrollments')
      .select('*, profile:bz_profiles(full_name, email), course:courses(title)')
      .not('certificate_code', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(300),
    supabase.from('courses').select('id', { count: 'exact', head: true }).neq('certificate_enabled', false),
  ])

  const rows = ((data ?? []) as IssuedRow[]).sort((a, b) =>
    String(b.certificate_issued_at ?? b.completed_at ?? '').localeCompare(String(a.certificate_issued_at ?? a.completed_at ?? '')),
  )
  const thisMonth = rows.filter((r) => {
    const d = r.certificate_issued_at ?? r.completed_at
    return d && d.slice(0, 7) === new Date().toISOString().slice(0, 7)
  }).length

  return (
    <>
      <PageHeader
        title="Certificats"
        description="Le modèle remis aux apprenants en fin de formation, et les certificats déjà délivrés."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Certificats délivrés" value={rows.length} icon={Award} />
        <StatCard label="Ce mois-ci" value={thisMonth} icon={Award} />
        <StatCard label="Formations certifiantes" value={certifyingCourses ?? 0} icon={Award} />
      </div>

      <CertificateTemplateForm
        initial={parseCertificateTemplate(settings.certificate)}
        siteName={settings.site_name}
        siteLogoUrl={settings.logo_url}
        siteUrl={siteUrl}
      />

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold">Certificats délivrés</h2>
        <p className="mb-4 text-sm text-fg-muted">
          Pour qu’une formation délivre un certificat, cochez « Formation certifiante » dans sa fiche.
        </p>
        {rows.length === 0 ? (
          <EmptyState
            icon={Award}
            title="Aucun certificat pour l’instant"
            description="Les apprenants obtiennent leur certificat en fin de parcours, depuis leur espace."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Titulaire</Th>
                <Th>Formation</Th>
                <Th>Délivré le</Th>
                <Th>Numéro</Th>
                <Th className="text-right">Vérifier</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Link href={`/admin/clients/${r.user_id}`} className="font-medium text-fg hover:text-primary-text">
                      {r.certificate_name || r.profile?.full_name || r.profile?.email || '—'}
                    </Link>
                    {r.certificate_name && r.profile?.full_name && r.certificate_name !== r.profile.full_name && (
                      <span className="block text-xs text-fg-subtle">Compte : {r.profile.full_name}</span>
                    )}
                  </Td>
                  <Td>{r.course?.title ?? '—'}</Td>
                  <Td>{formatDate(r.certificate_issued_at ?? r.completed_at)}</Td>
                  <Td>
                    <span className="font-mono text-xs">{r.certificate_code}</span>
                  </Td>
                  <Td className="text-right">
                    <a
                      href={`/verifier/${r.certificate_code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary-text hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      Ouvrir
                    </a>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </>
  )
}
