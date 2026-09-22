'use client'

import { useActionState, useState } from 'react'
import { ChevronDown, Pencil, Plus, Video } from 'lucide-react'

import { saveLesson, saveModule, deleteLesson, deleteModule, type AdminResult } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { ActionFeedback, DeleteButton, SaveButton } from '@/components/admin/form-bits'
import { RichEditor } from '@/components/admin/rich-editor'
import { EmptyState } from '@/components/ui/misc'
import { cn, formatDuration } from '@/lib/utils'
import { parseRichContent } from '@/lib/rich-content'
import type { CourseModule, Lesson } from '@/lib/types'

export interface ModuleWithLessonsAdmin extends CourseModule {
  lessons: Lesson[]
}

export function CurriculumEditor({
  courseId,
  modules,
}: {
  courseId: string
  modules: ModuleWithLessonsAdmin[]
}) {
  const [openModuleForm, setOpenModuleForm] = useState<string | null>(null)
  const [openLessonForm, setOpenLessonForm] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string[]>(modules.map((m) => m.id))

  const toggle = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="space-y-5">
      {modules.length === 0 && openModuleForm !== 'new' && (
        <EmptyState
          icon={Video}
          title="Aucun module"
          description="Structurez votre formation en modules, puis ajoutez les leçons de chacun."
          action={
            <Button type="button" onClick={() => setOpenModuleForm('new')}>
              <Plus className="h-4 w-4" aria-hidden />
              Ajouter un module
            </Button>
          }
        />
      )}

      {modules.map((courseModule, index) => {
        const isOpen = expanded.includes(courseModule.id)
        return (
          <div key={courseModule.id} className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex items-center gap-3 border-b border-line bg-canvas-subtle px-5 py-4">
              <button
                type="button"
                onClick={() => toggle(courseModule.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-expanded={isOpen}
              >
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-fg-subtle transition-transform', isOpen && 'rotate-180')}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-primary-text">
                    Module {index + 1}
                  </span>
                  <span className="block font-semibold text-fg">{courseModule.title}</span>
                </span>
              </button>

              <Badge tone="neutral">{courseModule.lessons.length} leçon{courseModule.lessons.length > 1 ? 's' : ''}</Badge>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpenModuleForm(openModuleForm === courseModule.id ? null : courseModule.id)}
                aria-label="Modifier le module"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>

              <DeleteButton
                action={deleteModule.bind(null, courseModule.id, courseId)}
                label=""
                variant="ghost"
                confirmText={`Supprimer le module « ${courseModule.title} » et toutes ses leçons ?`}
              />
            </div>

            {openModuleForm === courseModule.id && (
              <div className="border-b border-line bg-primary-subtle p-5">
                <ModuleForm
                  courseId={courseId}
                  courseModule={courseModule}
                  onDone={() => setOpenModuleForm(null)}
                />
              </div>
            )}

            {isOpen && (
              <div>
                <ul className="divide-y divide-line">
                  {courseModule.lessons.map((lesson, li) => (
                    <li key={lesson.id}>
                      <div className="flex items-center gap-3 px-5 py-3">
                        <span className="w-6 shrink-0 text-xs tabular-nums text-fg-subtle">
                          {li + 1}.
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.9375rem] text-fg">{lesson.title}</span>
                          <span className="block text-xs text-fg-subtle">
                            {lesson.duration_seconds > 0 && formatDuration(lesson.duration_seconds)}
                            {lesson.video_id || lesson.video_url ? ' · vidéo en ligne' : ' · pas de vidéo'}
                          </span>
                        </span>
                        {lesson.is_preview && <Badge tone="success">Aperçu gratuit</Badge>}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setOpenLessonForm(openLessonForm === lesson.id ? null : lesson.id)
                          }
                          aria-label="Modifier la leçon"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <DeleteButton
                          action={deleteLesson.bind(null, lesson.id, courseId)}
                          label=""
                          variant="ghost"
                          confirmText={`Supprimer la leçon « ${lesson.title} » ?`}
                        />
                      </div>

                      {openLessonForm === lesson.id && (
                        <div className="border-t border-line bg-primary-subtle p-5">
                          <LessonForm
                            courseId={courseId}
                            moduleId={courseModule.id}
                            lesson={lesson}
                            position={li}
                            onDone={() => setOpenLessonForm(null)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {openLessonForm === `new-${courseModule.id}` ? (
                  <div className="border-t border-line bg-primary-subtle p-5">
                    <LessonForm
                      courseId={courseId}
                      moduleId={courseModule.id}
                      lesson={null}
                      position={courseModule.lessons.length}
                      onDone={() => setOpenLessonForm(null)}
                    />
                  </div>
                ) : (
                  <div className="border-t border-line px-5 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenLessonForm(`new-${courseModule.id}`)}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Ajouter une leçon
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {openModuleForm === 'new' ? (
        <div className="rounded-lg border border-primary-text/40 bg-primary-subtle p-5">
          <h3 className="mb-4 font-semibold text-fg">Nouveau module</h3>
          <ModuleForm
            courseId={courseId}
            courseModule={null}
            position={modules.length}
            onDone={() => setOpenModuleForm(null)}
          />
        </div>
      ) : (
        modules.length > 0 && (
          <Button type="button" variant="outline" onClick={() => setOpenModuleForm('new')}>
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter un module
          </Button>
        )
      )}
    </div>
  )
}

/* --- Formulaire de module ------------------------------------------------- */

function ModuleForm({
  courseId,
  courseModule,
  position,
  onDone,
}: {
  courseId: string
  courseModule: CourseModule | null
  position?: number
  onDone: () => void
}) {
  const [state, action] = useActionState<AdminResult | null, FormData>(saveModule, null)

  if (state?.ok) {
    // Le rechargement de la page se fait par revalidatePath côté serveur.
    setTimeout(onDone, 300)
  }

  return (
    <form action={action} className="space-y-4">
      <ActionFeedback state={state} />
      {courseModule && <input type="hidden" name="id" value={courseModule.id} />}
      <input type="hidden" name="course_id" value={courseId} />

      <Field label="Titre du module" required>
        <Input name="title" defaultValue={courseModule?.title ?? ''} required placeholder="Phase 1 — Radiographie" />
      </Field>

      <Field label="Sous-titre">
        <Input name="subtitle" defaultValue={courseModule?.subtitle ?? ''} />
      </Field>

      <Field label="Description">
        <Textarea name="description" rows={3} defaultValue={courseModule?.description ?? ''} />
      </Field>

      <Field label="Ordre">
        <Input
          name="position"
          type="number"
          defaultValue={courseModule?.position ?? (position ?? 0) + 1}
          className="max-w-24"
        />
      </Field>

      <div className="flex gap-2">
        <SaveButton />
        <Button type="button" variant="ghost" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

/* --- Formulaire de leçon -------------------------------------------------- */

function LessonForm({
  courseId,
  moduleId,
  lesson,
  position,
  onDone,
}: {
  courseId: string
  moduleId: string
  lesson: Lesson | null
  position: number
  onDone: () => void
}) {
  const [state, action] = useActionState<AdminResult | null, FormData>(saveLesson, null)
  const [provider, setProvider] = useState(lesson?.video_provider ?? 'youtube')

  if (state?.ok) setTimeout(onDone, 300)

  return (
    <form action={action} className="space-y-4">
      <ActionFeedback state={state} />
      {lesson && <input type="hidden" name="id" value={lesson.id} />}
      <input type="hidden" name="module_id" value={moduleId} />
      <input type="hidden" name="course_id" value={courseId} />

      <Field label="Titre de la leçon" required>
        <Input name="title" defaultValue={lesson?.title ?? ''} required />
      </Field>

      <Field label="Description courte">
        <Textarea name="description" rows={2} defaultValue={lesson?.description ?? ''} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hébergeur vidéo">
          <Select
            name="video_provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as typeof provider)}
          >
            <option value="youtube">YouTube (non répertorié)</option>
            <option value="bunny">Bunny Stream</option>
            <option value="vimeo">Vimeo</option>
            <option value="url">Lien direct (MP4)</option>
          </Select>
        </Field>

        <Field label="Durée (minutes)">
          <Input
            name="duration_minutes"
            type="number"
            min={0}
            defaultValue={lesson ? Math.round(lesson.duration_seconds / 60) : 0}
          />
        </Field>
      </div>

      {provider === 'url' ? (
        <Field label="URL de la vidéo" help="Lien direct vers le fichier MP4.">
          <Input name="video_url" defaultValue={lesson?.video_url ?? ''} placeholder="https://…/video.mp4" />
        </Field>
      ) : (
        <Field
          label="Identifiant de la vidéo"
          help={
            provider === 'youtube'
              ? 'Les 11 caractères après « v= » dans l’URL YouTube. Vous pouvez aussi coller l’URL complète.'
              : provider === 'vimeo'
                ? 'Le numéro de la vidéo Vimeo.'
                : 'L’identifiant GUID fourni par Bunny Stream.'
          }
        >
          <Input name="video_id" defaultValue={lesson?.video_id ?? ''} />
          <input type="hidden" name="video_url" value={lesson?.video_url ?? ''} />
        </Field>
      )}

      <Field label="Notes de la leçon" help="Affichées sous la vidéo. Images, tableaux et liens acceptés.">
        <RichEditor name="content" defaultValue={parseRichContent(lesson?.content)} minHeight="min-h-[16rem]" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ordre">
          <Input name="position" type="number" defaultValue={lesson?.position ?? position + 1} />
        </Field>
        <div className="flex items-end pb-2.5">
          <Checkbox
            name="is_preview"
            defaultChecked={lesson?.is_preview ?? false}
            label="Aperçu gratuit (visible sans achat)"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <SaveButton />
        <Button type="button" variant="ghost" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
