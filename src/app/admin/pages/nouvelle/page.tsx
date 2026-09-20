import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { PageForm } from '@/components/admin/page-form'

export const metadata: Metadata = { title: 'Nouvelle page' }
export const dynamic = 'force-dynamic'

export default async function NewPagePage() {
  const supabase = createAdminClient()

  const [{ data: courses }, { data: services }] = await Promise.all([
    supabase.from('courses').select('id, title').order('title'),
    supabase.from('services').select('id, title').order('title'),
  ])

  return (
    <>
      <PageHeader
        title="Nouvelle page"
        description="Composez votre page bloc par bloc."
        backHref="/admin/pages"
        backLabel="Pages de vente"
      />
      <div className="max-w-4xl">
        <PageForm page={null} courses={courses ?? []} services={services ?? []} />
      </div>
    </>
  )
}
