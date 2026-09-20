import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { CourseForm } from '@/components/admin/course-form'
import type { Category } from '@/lib/types'

export const metadata: Metadata = { title: 'Nouvelle formation' }
export const dynamic = 'force-dynamic'

export default async function NewCoursePage() {
  const supabase = createAdminClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('kind', 'course')
    .order('position')

  return (
    <>
      <PageHeader
        title="Nouvelle formation"
        description="Renseignez les informations de base : vous pourrez ajouter le programme juste après."
        backHref="/admin/formations"
        backLabel="Formations"
      />
      <div className="max-w-3xl">
        <CourseForm course={null} categories={(categories as Category[]) ?? []} />
      </div>
    </>
  )
}
