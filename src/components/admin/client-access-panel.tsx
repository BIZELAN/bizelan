'use client'

import { useActionState } from 'react'
import { KeyRound } from 'lucide-react'

import { grantAccess, restoreAccess, revokeAccess, type AdminResult } from '@/app/actions/admin'
import { ActionButton, ActionFeedback, SaveButton } from '@/components/admin/form-bits'
import { Field, Select } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'

export interface AccessRow {
  id: string
  courseTitle: string
  state: string
  progress: number
  source: string
}

export function ClientAccessPanel({
  userId,
  enrollments,
  courses,
}: {
  userId: string
  enrollments: AccessRow[]
  courses: { id: string; title: string }[]
}) {
  const [state, action] = useActionState<AdminResult | null, FormData>(grantAccess, null)

  const alreadyGranted = new Set(enrollments.map((e) => e.courseTitle))
  const available = courses.filter((c) => !alreadyGranted.has(c.title))

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <KeyRound className="h-5 w-5 text-primary" aria-hidden />
        Accès aux formations
      </h2>

      <ActionFeedback state={state} />

      {enrollments.length > 0 && (
        <ul className="mb-5 divide-y divide-line">
          {enrollments.map((enrollment) => (
            <li key={enrollment.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-fg">{enrollment.courseTitle}</span>
                <span className="block text-xs text-fg-subtle">
                  {enrollment.source === 'admin_grant' ? 'Accès offert' : 'Achat'} ·{' '}
                  {enrollment.progress}% terminé
                </span>
              </span>

              {enrollment.state === 'revoked' ? (
                <>
                  <Badge tone="danger">Retiré</Badge>
                  <ActionButton action={restoreAccess.bind(null, enrollment.id, userId)}>
                    Rétablir
                  </ActionButton>
                </>
              ) : (
                <ActionButton
                  action={revokeAccess.bind(null, enrollment.id, userId)}
                  variant="outline"
                  confirmText={`Retirer l’accès à « ${enrollment.courseTitle} » ?`}
                >
                  Retirer l’accès
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <form action={action} className="flex flex-wrap items-end gap-3 border-t border-line pt-5">
          <input type="hidden" name="user_id" value={userId} />
          <Field label="Offrir l’accès à une formation" className="min-w-56 flex-1">
            <Select name="course_id" required defaultValue="">
              <option value="" disabled>
                Choisir une formation…
              </option>
              {available.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          </Field>
          <SaveButton label="Ouvrir l’accès" />
        </form>
      )}
    </section>
  )
}
