'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { saveCourse, type AdminResult } from '@/app/actions/admin'
import { FormActions, FormSection } from '@/components/admin/shell'
import { RichEditor } from '@/components/admin/rich-editor'
import {
  ActionFeedback,
  ObjectListEditor,
  SaveButton,
  StringListEditor,
} from '@/components/admin/form-bits'
import { ImageInput } from '@/components/admin/image-input'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { asArray, slugify } from '@/lib/utils'
import { parseRichContent } from '@/lib/rich-content'
import type { Category, Course, FaqItem } from '@/lib/types'

export function CourseForm({
  course,
  categories,
}: {
  course: Course | null
  categories: Category[]
}) {
  const [state, action] = useActionState<AdminResult | null, FormData>(saveCourse, null)

  return (
    <form action={action} className="space-y-6">
      <ActionFeedback state={state} />

      {course && <input type="hidden" name="id" value={course.id} />}
      <input type="hidden" name="currency" value={course?.currency ?? 'XOF'} />

      <FormSection
        title="Informations principales"
        description="Ce que le visiteur voit en premier sur la page de la formation."
      >
        <Field label="Titre" htmlFor="title" required>
          <Input
            id="title"
            name="title"
            defaultValue={course?.title ?? ''}
            required
            onChange={(e) => {
              // Pré-remplit l'adresse pour une nouvelle formation
              if (course) return
              const slugField = document.getElementById('slug') as HTMLInputElement | null
              if (slugField && !slugField.dataset.touched) {
                slugField.value = slugify(e.target.value)
              }
            }}
          />
        </Field>

        <Field
          label="Adresse de la page (slug)"
          htmlFor="slug"
          help="L’adresse sera /formations/votre-slug. Évitez de la changer une fois la page partagée."
        >
          <Input
            id="slug"
            name="slug"
            defaultValue={course?.slug ?? ''}
            onInput={(e) => {
              ;(e.target as HTMLInputElement).dataset.touched = 'true'
            }}
            placeholder="plan-affaires-agricole"
          />
        </Field>

        <Field label="Sous-titre" htmlFor="subtitle">
          <Input id="subtitle" name="subtitle" defaultValue={course?.subtitle ?? ''} />
        </Field>

        <Field
          label="Résumé"
          htmlFor="summary"
          help="Deux ou trois lignes, affichées dans le catalogue et les aperçus."
        >
          <Textarea id="summary" name="summary" rows={3} defaultValue={course?.summary ?? ''} />
        </Field>

        <Field
          label="Présentation détaillée"
          htmlFor="description"
          help="Titres, images, vidéos, tableaux et boutons : tout se compose ici."
        >
          <RichEditor name="description" defaultValue={parseRichContent(course?.description)} minHeight="min-h-[24rem]" />
        </Field>

        <Field label="Image de couverture">
          <ImageInput name="cover_url" defaultValue={course?.cover_url} />
        </Field>
      </FormSection>

      <FormSection title="Tarif" description="Les montants sont en FCFA, sans décimales.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Prix de vente" htmlFor="price_cents" required>
            <Input
              id="price_cents"
              name="price_cents"
              type="number"
              min={0}
              step={1}
              defaultValue={course?.price_cents ?? 0}
              required
            />
          </Field>
          <Field
            label="Prix barré"
            htmlFor="compare_at_price_cents"
            help="Laissez vide s’il n’y a pas de promotion."
          >
            <Input
              id="compare_at_price_cents"
              name="compare_at_price_cents"
              type="number"
              min={0}
              step={1}
              defaultValue={course?.compare_at_price_cents ?? ''}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="En pratique" description="Les mentions affichées dans l’encart d’achat.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Niveau" htmlFor="level">
            <Input id="level" name="level" defaultValue={course?.level ?? ''} placeholder="Tous niveaux" />
          </Field>
          <Field label="Catégorie" htmlFor="category_id">
            <Select id="category_id" name="category_id" defaultValue={course?.category_id ?? ''}>
              <option value="">Aucune</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Durée" htmlFor="duration_label">
          <Input
            id="duration_label"
            name="duration_label"
            defaultValue={course?.duration_label ?? ''}
            placeholder="6 à 8 heures de travail dont 3h de visionnage"
          />
        </Field>

        <Field label="Format" htmlFor="format_label">
          <Input
            id="format_label"
            name="format_label"
            defaultValue={course?.format_label ?? ''}
            placeholder="Séquences vidéo courtes + supports Word, Excel"
          />
        </Field>

        <Field label="Conditions d’accès" htmlFor="access_label">
          <Input
            id="access_label"
            name="access_label"
            defaultValue={course?.access_label ?? ''}
            placeholder="Paiement unique · Accès à vie"
          />
        </Field>
      </FormSection>

      <FormSection title="Arguments de vente">
        <Field label="Ce qui est inclus" help="Affiché dans l’encart d’achat.">
          <StringListEditor
            name="what_you_get"
            defaultValue={asArray<string>(course?.what_you_get)}
            placeholder="6 modules vidéo complets"
          />
        </Field>

        <Field label="Résultats obtenus" help="« Vous repartez avec… »">
          <StringListEditor
            name="outcomes"
            defaultValue={asArray<string>(course?.outcomes)}
            placeholder="Votre Business Plan complet, présentable"
          />
        </Field>

        <Field label="Public visé" help="« Cette formation est faite pour vous si… »">
          <StringListEditor
            name="target_audience"
            defaultValue={asArray<string>(course?.target_audience)}
            placeholder="Vous avez déjà démarré une activité agricole"
          />
        </Field>

        <Field label="Prérequis">
          <StringListEditor
            name="prerequisites"
            defaultValue={asArray<string>(course?.prerequisites)}
            placeholder="Aucun prérequis"
          />
        </Field>
      </FormSection>

      <FormSection title="Questions fréquentes">
        <ObjectListEditor
          name="faq"
          itemLabel="Question"
          defaultValue={asArray<FaqItem>(course?.faq) as unknown as Record<string, unknown>[]}
          fields={[
            { key: 'question', label: 'Question', type: 'text' },
            { key: 'answer', label: 'Réponse', type: 'textarea' },
          ]}
        />
      </FormSection>

      <FormSection
        title="Référencement (SEO)"
        description="Ce qui s’affiche dans Google et lors du partage sur les réseaux."
      >
        <Field label="Titre SEO" htmlFor="seo_title" help="60 caractères environ.">
          <Input id="seo_title" name="seo_title" defaultValue={course?.seo_title ?? ''} />
        </Field>
        <Field label="Description SEO" htmlFor="seo_description" help="160 caractères environ.">
          <Textarea
            id="seo_description"
            name="seo_description"
            rows={2}
            defaultValue={course?.seo_description ?? ''}
          />
        </Field>
        <Field label="Image de partage">
          <ImageInput name="og_image_url" defaultValue={course?.og_image_url} />
        </Field>
      </FormSection>

      <FormSection title="Publication">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Statut" htmlFor="status">
            <Select id="status" name="status" defaultValue={course?.status ?? 'draft'}>
              <option value="draft">Brouillon — invisible sur le site</option>
              <option value="published">Publié — visible par tous</option>
              <option value="archived">Archivé — retiré du catalogue</option>
            </Select>
          </Field>
          <Field label="Ordre d’affichage" htmlFor="position" help="Plus le nombre est petit, plus la formation apparaît haut.">
            <Input id="position" name="position" type="number" defaultValue={course?.position ?? 0} />
          </Field>
        </div>

        <Checkbox
          name="featured"
          defaultChecked={course?.featured ?? false}
          label="Mettre en avant sur la page d’accueil"
        />
      </FormSection>

      <FormActions>
        <SaveButton label={course ? 'Enregistrer les modifications' : 'Créer la formation'} />
        {course?.status === 'published' && (
          <Link
            href={`/formations/${course.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-text hover:text-primary-hover"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Voir sur le site
          </Link>
        )}
      </FormActions>
    </form>
  )
}
