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

      <div className="rounded-2xl border-4 border-brand-700 bg-white p-8 text-center sm:p-14">
        <Award className="mx-auto h-14 w-14 text-brand-700" aria-hidden />

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
          Certificat de fin de parcours
        </p>

        <p className="mt-8 text-sm text-ink-500">Décerné à</p>
        <p className="mt-2 font-display text-3xl font-bold text-ink-950 sm:text-4xl">
          {user.profile.full_name ?? user.email}
        </p>

        <p className="mt-8 text-sm text-ink-500">pour avoir suivi avec succès la formation</p>
        <p className="mt-2 text-xl font-semibold text-brand-800 sm:text-2xl">
          {data.course.title}
        </p>

        <div className="mx-auto mt-10 max-w-sm border-t border-ink-200 pt-6">
          <p className="text-sm text-ink-600">Délivré le {formatDate(data.completed_at)}</p>
          <p className="mt-1 text-sm text-ink-600">par {settings.site_name}</p>
          <p className="mt-4 font-mono text-xs text-ink-400">N° {data.certificate_code}</p>
        </div>
      </div>

      <p className="text-center text-sm text-ink-500 print:hidden">
        Utilisez le bouton d’impression pour enregistrer ce certificat en PDF.
      </p>
    </div>
  )
}
