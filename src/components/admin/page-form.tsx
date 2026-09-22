'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { savePage, type AdminResult } from '@/app/actions/admin'
import { FormActions, FormSection } from '@/components/admin/shell'
import { ActionFeedback, SaveButton } from '@/components/admin/form-bits'
import { BlockEditor } from '@/components/admin/block-editor'
import { ImageInput } from '@/components/admin/image-input'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { parseBlocks } from '@/lib/blocks'
import { slugify } from '@/lib/utils'
import type { Course, Page, Service } from '@/lib/types'

export function PageForm({
  page,
  courses,
  services,
}: {
  page: Page | null
  courses: Pick<Course, 'id' | 'title'>[]
  services: Pick<Service, 'id' | 'title'>[]
}) {
  const [state, action] = useActionState<AdminResult | null, FormData>(savePage, null)
  const [slug, setSlug] = useState(page?.slug ?? '')

  return (
    <form action={action} className="space-y-6">
      <ActionFeedback state={state} />

      {page && <input type="hidden" name="id" value={page.id} />}

      <FormSection title="Identité de la page">
        <Field label="Titre interne" htmlFor="title" required help="Sert à retrouver la page dans l’admin.">
          <Input
            id="title"
            name="title"
            defaultValue={page?.title ?? ''}
            required
            onChange={(e) => {
              if (!page && !slug) setSlug(slugify(e.target.value))
            }}
          />
        </Field>

        <Field
          label="Adresse de la page"
          htmlFor="slug"
          help={`La page sera accessible à l’adresse /${slug || 'votre-adresse'}`}
        >
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="bp"
          />
        </Field>

        <Field label="Note interne" htmlFor="description">
          <Textarea id="description" name="description" rows={2} defaultValue={page?.description ?? ''} />
        </Field>
      </FormSection>

      <FormSection
        title="Offre associée"
        description="Relier une formation permet au bloc « Offre et paiement » d’afficher le bon prix et le bon bouton d’achat."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Formation liée" htmlFor="course_id">
            <Select id="course_id" name="course_id" defaultValue={page?.course_id ?? ''}>
              <option value="">Aucune</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Service lié" htmlFor="service_id">
            <Select id="service_id" name="service_id" defaultValue={page?.service_id ?? ''}>
              <option value="">Aucun</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Contenu de la page"
        description="Ajoutez, réorganisez et modifiez les blocs. L’ordre ici est l’ordre d’affichage."
      >
        <BlockEditor name="blocks" defaultValue={parseBlocks(page?.blocks)} />
      </FormSection>

      <FormSection title="Référencement (SEO)">
        <Field label="Titre SEO" htmlFor="seo_title">
          <Input id="seo_title" name="seo_title" defaultValue={page?.seo_title ?? ''} />
        </Field>
        <Field label="Description SEO" htmlFor="seo_description">
          <Textarea
            id="seo_description"
            name="seo_description"
            rows={2}
            defaultValue={page?.seo_description ?? ''}
          />
        </Field>
        <Field label="Image de partage">
          <ImageInput name="og_image_url" defaultValue={page?.og_image_url} />
        </Field>
      </FormSection>

      <FormSection title="Affichage et publication">
        <Field label="Statut" htmlFor="status">
          <Select id="status" name="status" defaultValue={page?.status ?? 'draft'}>
            <option value="draft">Brouillon — invisible sur le site</option>
            <option value="published">Publié — accessible à tous</option>
            <option value="archived">Archivé</option>
          </Select>
        </Field>

        <div className="space-y-3">
          <Checkbox
            name="hide_header"
            defaultChecked={page?.hide_header ?? false}
            label="Masquer le menu de navigation (page de vente concentrée sur l’offre)"
          />
          <Checkbox
            name="hide_footer"
            defaultChecked={page?.hide_footer ?? false}
            label="Masquer le pied de page"
          />
          <Checkbox
            name="is_home"
            defaultChecked={page?.is_home ?? false}
            label="Utiliser cette page comme page d’accueil du site"
          />
        </div>

        {page?.is_home && (
          <Alert tone="info">
            Cette page est actuellement la page d’accueil. Désigner une autre page d’accueil
            remplacera automatiquement celle-ci.
          </Alert>
        )}
      </FormSection>

      <FormActions>
        <SaveButton label={page ? 'Enregistrer la page' : 'Créer la page'} />
        {page?.status === 'published' && (
          <Link
            href={page.is_home ? '/' : `/${page.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Voir la page
          </Link>
        )}
      </FormActions>
    </form>
  )
}
