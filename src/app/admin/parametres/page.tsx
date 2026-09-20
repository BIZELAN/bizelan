import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { SettingsForm } from '@/components/admin/settings-form'
import type { SiteSettings } from '@/lib/types'

export const metadata: Metadata = { title: 'Paramètres' }
export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const supabase = createAdminClient()
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single()

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Coordonnées, moyens de paiement, textes légaux et référencement par défaut."
      />
      <div className="max-w-3xl">
        <SettingsForm settings={data as SiteSettings} />
      </div>
    </>
  )
}
