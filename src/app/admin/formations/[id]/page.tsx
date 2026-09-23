import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Eye, FileStack, ListOrdered } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { ButtonLink } from '@/components/ui/button'
import { CourseForm } from '@/components/admin/course-form'
import type { Category, Course } from '@/lib/types'

export const metadata: Metadata = { title: 'Modifier la formation' }
export const dynamic = 'force-dynamic'

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: course }, { data: categories }] = await Promise.all([
    supabase.from('courses').select('*').eq('id', id).maybeSingle<Course>(),
    supabase.from('categories').select('*').eq('kind', 'course').order('position'),
  ])

  if (!course) notFound()

  return (
    <>
      <PageHeader
        title={course.title}
        description="Modifiez le contenu de la fiche formation."
        backHref="/admin/formations"
        backLabel="Formations"
        actions={
          <>
            <ButtonLink href={`/admin/formations/${course.id}/programme`} variant="outline">
              <ListOrdered className="h-4 w-4" aria-hidden />
              Programme
            </ButtonLink>
            <ButtonLink href={`/admin/formations/${course.id}/supports`} variant="outline">
              <FileStack className="h-4 w-4" aria-hidden />
              Supports
            </ButtonLink>
            <ButtonLink href={`/admin/formations/${course.id}/visionnage`} variant="outline">
              <Eye className="h-4 w-4" aria-hidden />
              Visionnage
            </ButtonLink>
          </>
        }
      />
      <div className="max-w-3xl">
        <CourseForm course={course} categories={(categories as Category[]) ?? []} />
      </div>
    </>
  )
}
