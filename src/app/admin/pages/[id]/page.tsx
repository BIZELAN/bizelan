import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { PageForm } from '@/components/admin/page-form'
import type { Page } from '@/lib/types'

export const metadata: Metadata = { title: 'Modifier la page' }
export const dynamic = 'force-dynamic'

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: page }, { data: courses }, { data: services }] = await Promise.all([
    supabase.from('pages').select('*').eq('id', id).maybeSingle<Page>(),
    supabase.from('courses').select('id, title').order('title'),
    supabase.from('services').select('id, title').order('title'),
  ])

  if (!page) notFound()

  return (
    <>
      <PageHeader
        title={page.title}
        description={`Adresse : /${page.slug}`}
        backHref="/admin/pages"
        backLabel="Pages de vente"
      />
      <div className="max-w-4xl">
        <PageForm page={page} courses={courses ?? []} services={services ?? []} />
      </div>
    </>
  )
}
