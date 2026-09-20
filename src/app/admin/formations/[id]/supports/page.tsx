import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { ResourceManager } from '@/components/admin/resource-manager'
import { Alert } from '@/components/ui/misc'
import type { Course, Resource } from '@/lib/types'

export const metadata: Metadata = { title: 'Supports de la formation' }
export const dynamic = 'force-dynamic'

export default async function ResourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: course } = await supabase.from('courses').select('*').eq('id', id).maybeSingle<Course>()
  if (!course) notFound()

  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .eq('course_id', id)
    .order('position')

  return (
    <>
      <PageHeader
        title="Supports téléchargeables"
        description={course.title}
        backHref={`/admin/formations/${id}`}
        backLabel="Retour à la formation"
      />

      <Alert tone="info" className="mb-6">
        Ces fichiers (tableurs Excel, modèles Word…) sont stockés dans un espace privé. Seuls les
        clients ayant payé peuvent les télécharger, via un lien temporaire — un lien partagé cesse
        de fonctionner au bout de quelques minutes.
      </Alert>

      <div className="max-w-3xl">
        <ResourceManager courseId={id} resources={(resources as Resource[]) ?? []} />
      </div>
    </>
  )
}
