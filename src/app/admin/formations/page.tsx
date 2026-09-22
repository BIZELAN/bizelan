import type { Metadata } from 'next'
import Link from 'next/link'
import { Copy, ExternalLink, GraduationCap, Plus, Settings2 } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, Table, Td, Th } from '@/components/admin/shell'
import { ButtonLink } from '@/components/ui/button'
import { CONTENT_STATUS_LABELS, StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { ActionButton, DeleteButton } from '@/components/admin/form-bits'
import { deleteCourse, duplicateCourse } from '@/app/actions/admin'
import { formatPrice } from '@/lib/utils'
import type { Course } from '@/lib/types'

export const metadata: Metadata = { title: 'Formations' }
export const dynamic = 'force-dynamic'

export default async function AdminCoursesPage() {
  const supabase = createAdminClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .order('position')
    .order('created_at', { ascending: false })

  // Nombre d'inscrits par formation
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .in('state', ['active', 'completed'])

  const counts = new Map<string, number>()
  for (const e of enrollments ?? []) {
    counts.set(e.course_id, (counts.get(e.course_id) ?? 0) + 1)
  }

  const list = (courses as Course[]) ?? []

  return (
    <>
      <PageHeader
        title="Formations"
        description="Créez, modifiez et publiez vos parcours de formation."
        actions={
          <ButtonLink href="/admin/formations/nouvelle">
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle formation
          </ButtonLink>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucune formation"
          description="Créez votre première formation pour commencer à vendre."
          action={
            <ButtonLink href="/admin/formations/nouvelle">
              <Plus className="h-4 w-4" aria-hidden />
              Nouvelle formation
            </ButtonLink>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Formation</Th>
              <Th>Prix</Th>
              <Th>Inscrits</Th>
              <Th>Statut</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((course) => (
              <tr key={course.id} className="hover:bg-surface">
                <Td>
                  <div className="flex items-center gap-3">
                    {course.cover_url ? (
                      <img
                        src={course.cover_url}
                        alt=""
                        className="h-11 w-16 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded bg-surface">
                        <GraduationCap className="h-4 w-4 text-fg-subtle" aria-hidden />
                      </span>
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/admin/formations/${course.id}`}
                        className="block font-medium text-fg hover:text-primary"
                      >
                        {course.title}
                      </Link>
                      <span className="font-mono text-xs text-fg-subtle">/{course.slug}</span>
                    </div>
                  </div>
                </Td>
                <Td className="whitespace-nowrap font-semibold tabular-nums">
                  {formatPrice(course.price_cents, course.currency)}
                </Td>
                <Td className="tabular-nums text-fg-muted">{counts.get(course.id) ?? 0}</Td>
                <Td>
                  <StatusBadge status={course.status} map={CONTENT_STATUS_LABELS} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/admin/formations/${course.id}/programme`}
                      className="rounded-md p-2 text-fg-subtle transition-colors hover:bg-canvas-subtle hover:text-primary"
                      title="Gérer le programme"
                    >
                      <Settings2 className="h-4 w-4" aria-hidden />
                    </Link>
                    {course.status === 'published' && (
                      <Link
                        href={`/formations/${course.slug}`}
                        target="_blank"
                        className="rounded-md p-2 text-fg-subtle transition-colors hover:bg-canvas-subtle hover:text-primary"
                        title="Voir sur le site"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </Link>
                    )}
                    <ActionButton action={duplicateCourse.bind(null, course.id)} variant="ghost">
                      <Copy className="h-4 w-4" aria-hidden />
                    </ActionButton>
                    <DeleteButton
                      action={deleteCourse.bind(null, course.id)}
                      label=""
                      variant="ghost"
                      confirmText={`Supprimer « ${course.title} » ? Cette action est définitive.`}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
