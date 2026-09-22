import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Award } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PrintButton } from '@/components/account/print-button'
import { formatDate } from '@/lib/utils'
import { getSiteSettings } from '@/lib/queries'
import type { Course, Enrollment } from '@/lib/types'

export const metadata: Metadata = { title: 'Certificat' }

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const user = await requireUser(`/compte/certificat/${code}`)

  const supabase = await createClient()
  const { data } = await supabase
    .from('enrollments')
    .select('*, course:courses(*)')
    .eq('certificate_code', code)
    .eq('user_id', user.id)
    .maybeSingle<Enrollment & { course: Course }>()

  if (!data || !data.completed_at) notFound()

  const settings = await getSiteSettings()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl">Votre certificat</h1>
        <PrintButton />
      </div>

      {/* Ilot de theme clair : un certificat est un document destine a
          l'impression. Il reste sur papier blanc meme si la page est en
          theme sombre, et `data-theme` suffit a le dire — les jetons a
          l'interieur se redeclarent seuls. */}
      <div
        data-theme="light"
        className="rounded-2xl border-4 border-primary-text bg-surface p-8 text-center text-fg-muted sm:p-14"
      >
        <Award className="mx-auto h-14 w-14 text-primary-text" aria-hidden />

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary-text">
          Certificat de fin de parcours
        </p>

        <p className="mt-8 text-sm text-fg-subtle">Décerné à</p>
        <p className="mt-2 font-display text-3xl font-bold text-fg sm:text-4xl">
          {user.profile.full_name ?? user.email}
        </p>

        <p className="mt-8 text-sm text-fg-subtle">pour avoir suivi avec succès la formation</p>
        <p className="mt-2 text-xl font-semibold text-primary-text sm:text-2xl">
          {data.course.title}
        </p>

        <div className="mx-auto mt-10 max-w-sm border-t border-line pt-6">
          <p className="text-sm text-fg-muted">Délivré le {formatDate(data.completed_at)}</p>
          <p className="mt-1 text-sm text-fg-muted">par {settings.site_name}</p>
          <p className="mt-4 font-mono text-xs text-fg-subtle">N° {data.certificate_code}</p>
        </div>
      </div>

      <p className="text-center text-sm text-fg-subtle print:hidden">
        Utilisez le bouton d’impression pour enregistrer ce certificat en PDF.
      </p>
    </div>
  )
}
