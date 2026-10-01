'use client'

import { useState } from 'react'
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, Clock, PlayCircle } from 'lucide-react'

import { LessonRow } from '@/components/public/lesson-row'
import type { PlayableVideo } from '@/lib/video'
import { cn, formatDuration } from '@/lib/utils'

export interface CurriculumModule {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  lessons: {
    id: string
    title: string
    description: string | null
    duration_seconds: number
    is_preview: boolean
  }[]
}

/**
 * Programme d'une formation, sur sa page de vente.
 *
 * Chaque module se déplie pour révéler son détail — présentation, leçons,
 * durées, aperçus gratuits. Replié, il reste lisible d'un coup d'œil :
 * numéro, titre, nombre de leçons et durée. Un programme de vingt leçons
 * affiché à plat noyait l'encart d'achat sous une longue liste ; le visiteur
 * parcourt désormais les grandes étapes, et creuse celles qui l'intéressent.
 *
 * Le premier module est ouvert d'emblée : il montre que le détail existe.
 */
export function CurriculumAccordion({
  modules,
  enrolled,
  courseSlug,
  previews,
}: {
  modules: CurriculumModule[]
  enrolled: boolean
  courseSlug: string
  /** Vidéos d'aperçu déjà signées, par identifiant de leçon. */
  previews: Record<string, PlayableVideo | null>
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(modules[0] ? [modules[0].id] : []))
  const allOpen = modules.length > 0 && modules.every((m) => open.has(m.id))

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)
  const totalSeconds = modules.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + (l.duration_seconds ?? 0), 0),
    0,
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-subtle">
          {modules.length} module{modules.length > 1 ? 's' : ''} · {totalLessons} leçon
          {totalLessons > 1 ? 's' : ''}
          {totalSeconds > 0 && ` · ${formatDuration(totalSeconds)} de vidéo`}
        </p>
        {modules.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen(allOpen ? new Set() : new Set(modules.map((m) => m.id)))}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-primary-text transition-colors duration-fast hover:bg-primary-subtle"
          >
            {allOpen ? (
              <ChevronsDownUp className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronsUpDown className="h-4 w-4" aria-hidden />
            )}
            {allOpen ? 'Tout replier' : 'Tout déplier'}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {modules.map((courseModule, mi) => {
          const isOpen = open.has(courseModule.id)
          const seconds = courseModule.lessons.reduce((s, l) => s + (l.duration_seconds ?? 0), 0)
          const previewCount = courseModule.lessons.filter((l) => l.is_preview).length
          const panelId = `module-${courseModule.id}`

          return (
            <div
              key={courseModule.id}
              className={cn(
                'overflow-hidden rounded-lg border bg-surface transition-colors duration-fast',
                isOpen ? 'border-primary-text/30 shadow-e1' : 'border-line',
              )}
            >
              <h3>
                <button
                  type="button"
                  onClick={() => toggle(courseModule.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-fast hover:bg-canvas-subtle"
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      isOpen ? 'bg-primary text-primary-fg' : 'bg-canvas-subtle text-fg-muted',
                    )}
                  >
                    {mi + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-primary-text">
                      Module {mi + 1}
                    </span>
                    <span className="mt-0.5 block text-lg font-semibold leading-snug text-fg">
                      {courseModule.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                      <span>
                        {courseModule.lessons.length} leçon{courseModule.lessons.length > 1 ? 's' : ''}
                      </span>
                      {seconds > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {formatDuration(seconds)}
                        </span>
                      )}
                      {previewCount > 0 && !enrolled && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <PlayCircle className="h-3.5 w-3.5" aria-hidden />
                          {previewCount} aperçu{previewCount > 1 ? 's' : ''} gratuit{previewCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-base',
                      isOpen && 'rotate-180',
                    )}
                    aria-hidden
                  />
                </button>
              </h3>

              <div id={panelId} hidden={!isOpen} className="border-t border-line">
                {(courseModule.subtitle || courseModule.description) && (
                  <div className="bg-canvas-subtle/60 px-5 py-4">
                    {courseModule.subtitle && (
                      <p className="font-medium text-fg">{courseModule.subtitle}</p>
                    )}
                    {courseModule.description && (
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                        {courseModule.description}
                      </p>
                    )}
                  </div>
                )}
                <ul className="divide-y divide-line">
                  {courseModule.lessons.map((lesson) => (
                    <LessonRow
                      key={lesson.id}
                      title={lesson.title}
                      description={lesson.description}
                      durationSeconds={lesson.duration_seconds}
                      isPreview={lesson.is_preview}
                      enrolled={enrolled}
                      href={`/compte/formations/${courseSlug}/${lesson.id}`}
                      playable={previews[lesson.id] ?? null}
                    />
                  ))}
                  {courseModule.lessons.length === 0 && (
                    <li className="px-5 py-4 text-sm text-fg-subtle">
                      Contenu de ce module en préparation.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
