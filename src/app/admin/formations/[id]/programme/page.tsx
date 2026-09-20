import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { CurriculumEditor, type ModuleWithLessonsAdmin } from '@/components/admin/curriculum-editor'
import { Alert } from '@/components/ui/misc'
import type { Course, Lesson } from '@/lib/types'

export const metadata: Metadata = { title: 'Programme de la formation' }
export const dynamic = 'force-dynamic'

export default async function CurriculumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: course } = await supabase.from('courses').select('*').eq('id', id).maybeSingle<Course>()
  if (!course) notFound()

  const { data: modules } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', id)
    .order('position')

  const moduleIds = (modules ?? []).map((m) => m.id)
  const { data: lessons } = moduleIds.length
    ? await supabase.from('lessons').select('*').in('module_id', moduleIds).order('position')
    : { data: [] as Lesson[] }

  const structured: ModuleWithLessonsAdmin[] = (modules ?? []).map((m) => ({
    ...m,
    lessons: ((lessons as Lesson[]) ?? []).filter((l) => l.module_id === m.id),
  }))

  return (
    <>
      <PageHeader
        title="Programme"
        description={course.title}
        backHref={`/admin/formations/${id}`}
        backLabel="Retour à la formation"
      />

      <Alert tone="info" className="mb-6">
        Les modules regroupent les leçons. Une leçon marquée « aperçu gratuit » est visible par tous
        sur la page de vente — utile pour donner un avant-goût.
      </Alert>

      <div className="max-w-4xl">
        <CurriculumEditor courseId={id} modules={structured} />
      </div>
    </>
  )
}
