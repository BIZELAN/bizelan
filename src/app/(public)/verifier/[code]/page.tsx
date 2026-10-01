import type { Metadata } from 'next'
import { BadgeCheck, SearchX } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSiteSettings } from '@/lib/queries'
import { ButtonLink } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { VerifyForm } from '@/components/public/verify-form'

export const metadata: Metadata = {
  title: 'Vérification de certificat',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/** Format des codes délivrés par la base : `BZ-CERT-` puis dix caractères. */
const CODE_RE = /^BZ-CERT-[A-Z0-9]{10}$/

/**
 * Vérification publique d'un certificat.
 *
 * Un employeur, un financeur ou un jury peut confirmer qu'un certificat est
 * authentique sans compte. Seuls le nom, la formation et la date sont
 * montrés : c'est ce que porte déjà le certificat papier. Le format du code
 * est contrôlé avant toute requête, et la lecture passe par la clé de
 * service — aucune politique RLS n'est ouverte sur les inscriptions.
 */
export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code: raw } = await params
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    // Séquence d'échappement invalide : on garde la valeur brute, que le
    // contrôle de format ci-dessous écartera.
  }
  const code = decoded.trim().toUpperCase().slice(0, 40)

  const settings = await getSiteSettings()

  let found: { name: string; course: string; date: string | null } | null = null
  if (CODE_RE.test(code)) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('enrollments')
      .select('completed_at, profile:bz_profiles(full_name), course:courses(title)')
      .eq('certificate_code', code)
      .in('state', ['active', 'completed'])
      .maybeSingle<{
        completed_at: string | null
        profile: { full_name: string | null } | null
        course: { title: string } | null
      }>()

    if (data?.course) {
      found = {
        name: data.profile?.full_name ?? 'Participant',
        course: data.course.title,
        date: data.completed_at,
      }
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-lg">
        {found ? (
          <div className="overflow-hidden rounded-lg border border-success/30 bg-surface shadow-e2">
            <div className="flex items-center gap-3 border-b border-success/30 bg-success-subtle px-6 py-4">
              <BadgeCheck className="h-7 w-7 shrink-0 text-success" aria-hidden />
              <div>
                <h1 className="text-lg font-semibold text-fg">Certificat authentique</h1>
                <p className="text-sm text-fg-muted">Délivré par {settings.site_name}</p>
              </div>
            </div>
            <dl className="space-y-4 p-6 text-sm">
              <div>
                <dt className="text-fg-subtle">Titulaire</dt>
                <dd className="mt-0.5 text-lg font-semibold text-fg">{found.name}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Formation suivie avec succès</dt>
                <dd className="mt-0.5 font-medium text-fg">{found.course}</dd>
              </div>
              <div className="flex flex-wrap gap-x-10 gap-y-4">
                <div>
                  <dt className="text-fg-subtle">Date de délivrance</dt>
                  <dd className="mt-0.5 text-fg">{formatDate(found.date)}</dd>
                </div>
                <div>
                  <dt className="text-fg-subtle">Numéro</dt>
                  <dd className="mt-0.5 font-mono text-fg">{code}</dd>
                </div>
              </div>
            </dl>
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-surface p-6 text-center shadow-e1">
            <SearchX className="mx-auto h-12 w-12 text-fg-subtle" aria-hidden />
            <h1 className="mt-4 text-xl">Aucun certificat ne correspond</h1>
            <p className="mt-2 text-sm text-fg-muted">
              Le numéro <span className="font-mono text-fg">{code}</span> n’a pas été délivré par{' '}
              {settings.site_name}, ou il a été saisi avec une erreur. Vérifiez-le ci-dessous.
            </p>
            <div className="mt-6 text-left">
              <VerifyForm defaultValue={code} />
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <ButtonLink href="/formations" variant="ghost">
            Découvrir nos formations
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
