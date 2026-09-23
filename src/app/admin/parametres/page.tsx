import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { SettingsForm } from '@/components/admin/settings-form'
import { listRevisions } from '@/lib/revisions'
import type { SiteSettings } from '@/lib/types'

export const metadata: Metadata = { title: 'Paramètres' }
export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const supabase = createAdminClient()
  const [{ data }, revisions] = await Promise.all([
    supabase.from('site_settings').select('*').eq('id', 1).single(),
    listRevisions('settings', '1'),
  ])

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Coordonnées, moyens de paiement, textes légaux et référencement par défaut."
      />
      <div className="max-w-3xl">
        <SettingsForm settings={data as SiteSettings} revisions={revisions} />
      </div>
    </>
  )
}
