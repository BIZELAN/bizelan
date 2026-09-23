import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { PageForm } from '@/components/admin/page-form'
import type { Page } from '@/lib/types'
import { getBlockData } from '@/lib/queries'
import { listRevisions } from '@/lib/revisions'

export const metadata: Metadata = { title: 'Modifier la page' }
export const dynamic = 'force-dynamic'

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: page }, { data: courses }, { data: services }, previewData, revisions] =
    await Promise.all([
      supabase.from('pages').select('*').eq('id', id).maybeSingle<Page>(),
      supabase.from('courses').select('id, title').order('title'),
      supabase.from('services').select('id, title').order('title'),
      // Contenus publiés : ils alimentent l'aperçu en direct, exactement comme
      // ils alimenteront la page une fois publiée.
      getBlockData(),
      // L'historique est chargé avec le reste : le panneau doit être là au
      // premier rendu, pas après un second aller-retour.
      listRevisions('page', id),
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
        <PageForm
          page={page}
          courses={courses ?? []}
          services={services ?? []}
          previewData={previewData}
          revisions={revisions}
        />
      </div>
    </>
  )
}
