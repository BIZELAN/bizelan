import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, PartyPopper } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CopyButton } from '@/components/ui/copy-button'
import { Alert } from '@/components/ui/misc'
import { CertificateDocument } from '@/components/certificate/certificate-document'
import { CertificatePrintStyles, DownloadCertificateButton } from '@/components/certificate/certificate-actions'
import { parseCertificateTemplate } from '@/lib/certificate'
import { getSiteSettings } from '@/lib/queries'
import { getSiteUrl } from '@/lib/site-url'
import type { Course, Enrollment } from '@/lib/types'

export const metadata: Metadata = { title: 'Certificat' }
export const dynamic = 'force-dynamic'

export default async function CertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ nouveau?: string }>
}) {
  const [{ code }, { nouveau }] = await Promise.all([params, searchParams])
  const user = await requireUser(`/compte/certificat/${code}`)

  const supabase = await createClient()
  const { data } = await supabase
    .from('enrollments')
    .select('*, course:courses(*)')
    .eq('certificate_code', code)
    .eq('user_id', user.id)
    .maybeSingle<Enrollment & { course: Course }>()

  if (!data || !data.course) notFound()

  const [settings, base] = await Promise.all([getSiteSettings(), getSiteUrl()])
  const verifyUrl = `${base}/verifier/${data.certificate_code}`
  const recipientName = data.certificate_name || user.profile.full_name || user.email || 'Participant'
  const fileName = `Certificat - ${recipientName} - ${data.course.title}`.replace(/[\\/:*?"<>|]/g, ' ')

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <CertificatePrintStyles />

      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <Link
            href="/compte/certificats"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-primary-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Mes certificats
          </Link>
          <h1 className="text-2xl">Votre certificat</h1>
          <p className="mt-1 text-sm text-fg-muted">{data.course.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={verifyUrl} label="Lien de vérification" />
          <DownloadCertificateButton fileName={fileName} />
        </div>
      </div>

      {nouveau && (
        <Alert tone="success" title="Bravo, votre certificat est délivré !" className="print:hidden">
          <span className="inline-flex items-center gap-1.5">
            <PartyPopper className="h-4 w-4" aria-hidden />
            Téléchargez-le en PDF, et partagez son lien de vérification avec un employeur ou un
            financeur.
          </span>
        </Alert>
      )}

      <div className="overflow-hidden rounded-lg shadow-e3 ring-1 ring-line">
        <CertificateDocument
          template={parseCertificateTemplate(settings.certificate)}
          siteName={settings.site_name}
          siteLogoUrl={settings.logo_url}
          data={{
            recipientName,
            courseTitle: data.course.title,
            issuedAt: data.certificate_issued_at ?? data.completed_at,
            code: data.certificate_code!,
            durationLabel: data.course.duration_label,
            verifyUrl,
          }}
        />
      </div>

      <div className="flex flex-col gap-2 text-sm text-fg-subtle sm:flex-row sm:items-center sm:justify-between print:hidden">
        <p>
          « Télécharger en PDF » ouvre l’impression : choisissez « Enregistrer au format PDF » comme
          imprimante.
        </p>
        <Link
          href={`/verifier/${data.certificate_code}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 font-medium text-primary-text hover:underline"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Page de vérification publique
        </Link>
      </div>
    </div>
  )
}
