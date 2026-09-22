import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileStack, ListOrdered } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
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
            <Link
              href={`/admin/formations/${course.id}/programme`}
              className="inline-flex items-center gap-2 rounded-md border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface"
            >
              <ListOrdered className="h-4 w-4" aria-hidden />
              Programme
            </Link>
            <Link
              href={`/admin/formations/${course.id}/supports`}
              className="inline-flex items-center gap-2 rounded-md border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface"
            >
              <FileStack className="h-4 w-4" aria-hidden />
              Supports
            </Link>
          </>
        }
      />
      <div className="max-w-3xl">
        <CourseForm course={course} categories={(categories as Category[]) ?? []} />
      </div>
    </>
  )
}
