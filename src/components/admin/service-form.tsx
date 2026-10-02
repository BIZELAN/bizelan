'use client'

import { useActionState, useState } from 'react'

import { saveService, type AdminResult } from '@/app/actions/admin'
import { FormActions, FormSection } from '@/components/admin/shell'
import { PresentationEditor } from '@/components/admin/presentation-editor'
import { ScarcityFields } from '@/components/admin/scarcity-fields'
import type { BlockData } from '@/components/public/blocks/block-renderer'
import {
  ActionFeedback,
  ObjectListEditor,
  SaveButton,
  StringListEditor,
} from '@/components/admin/form-bits'
import { ImageInput } from '@/components/admin/image-input'
import { IconPicker } from '@/components/admin/icon-picker'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { asArray, slugify } from '@/lib/utils'
import type { FaqItem, ProcessStep, Service } from '@/lib/types'

export function ServiceForm({ service, previewData }: { service: Service | null; previewData?: BlockData }) {
  const [state, action] = useActionState<AdminResult | null, FormData>(saveService, null)
  const [pricing, setPricing] = useState(service?.pricing ?? 'quote')
  const [slug, setSlug] = useState(service?.slug ?? '')
  const [icon, setIcon] = useState(service?.icon ?? '')

  return (
    <form action={action} className="space-y-6">
      <ActionFeedback state={state} />
      {service && <input type="hidden" name="id" value={service.id} />}
      <input type="hidden" name="currency" value={service?.currency ?? 'XOF'} />

      <FormSection title="Informations principales">
        <Field label="Titre" htmlFor="title" required>
          <Input
            id="title"
            name="title"
            defaultValue={service?.title ?? ''}
            required
            onChange={(e) => {
              if (!service && !slug) setSlug(slugify(e.target.value))
            }}
          />
        </Field>

        <Field label="Adresse (slug)" htmlFor="slug" help={`Page accessible à /services/${slug || '…'}`}>
          <Input id="slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>

        <Field label="Sous-titre" htmlFor="subtitle">
          <Input id="subtitle" name="subtitle" defaultValue={service?.subtitle ?? ''} />
        </Field>

        <Field label="Résumé" htmlFor="summary" help="Affiché dans la liste des services.">
          <Textarea id="summary" name="summary" rows={3} defaultValue={service?.summary ?? ''} />
        </Field>


        <Field label="Image">
          <ImageInput name="cover_url" defaultValue={service?.cover_url} />
        </Field>

        <Field label="Icône" help="Affichée sur la carte du service.">
          <IconPicker name="icon" value={icon} onChange={setIcon} />
        </Field>
      </FormSection>

      <FormSection
        title="Présentation de la page"
        description="Composez la page du service avec des blocs : texte, images, vidéos, carrousel, étapes, témoignages… Chaque bloc peut avoir son propre fond."
      >
        <PresentationEditor
          blocks={service?.blocks}
          legacy={service?.description}
          legacyName="description"
          previewData={previewData}
        />
      </FormSection>

      <FormSection title="Tarification">
        <Field label="Mode" htmlFor="pricing">
          <Select
            id="pricing"
            name="pricing"
            value={pricing}
            onChange={(e) => setPricing(e.target.value as typeof pricing)}
          >
            <option value="quote">Sur devis</option>
            <option value="fixed">Prix fixe</option>
            <option value="free">Gratuit</option>
          </Select>
        </Field>

        {pricing === 'fixed' && (
          <Field label="Prix (FCFA)" htmlFor="price_cents">
            <Input
              id="price_cents"
              name="price_cents"
              type="number"
              min={0}
              defaultValue={service?.price_cents ?? 0}
            />
          </Field>
        )}

        <Field
          label="Mention affichée"
          htmlFor="price_label"
          help="Par exemple : « Sur devis » ou « À partir de 250 000 FCFA »."
        >
          <Input id="price_label" name="price_label" defaultValue={service?.price_label ?? ''} />
        </Field>
      </FormSection>

      <FormSection
        title="Compte à rebours et places limitées"
        description="Pour une session, un atelier ou une offre de lancement : la date limite et les places restantes s’affichent sur la page."
      >
        <ScarcityFields item={service} unitHint="places restantes" sellable={false} />
      </FormSection>

      <FormSection title="Contenu de la prestation">
        <Field label="Ce qui est inclus">
          <StringListEditor
            name="features"
            defaultValue={asArray<string>(service?.features)}
            placeholder="Analyse de la santé organisationnelle"
          />
        </Field>

        <Field label="Livrables">
          <StringListEditor
            name="deliverables"
            defaultValue={asArray<string>(service?.deliverables)}
            placeholder="Rapport de diagnostic hiérarchisé"
          />
        </Field>

        <Field label="Étapes de la mission">
          <ObjectListEditor
            name="process_steps"
            itemLabel="Étape"
            defaultValue={asArray<ProcessStep>(service?.process_steps) as unknown as Record<string, unknown>[]}
            fields={[
              { key: 'title', label: 'Titre de l’étape', type: 'text' },
              { key: 'description', label: 'Description', type: 'textarea' },
            ]}
          />
        </Field>

        <Field label="Questions fréquentes">
          <ObjectListEditor
            name="faq"
            itemLabel="Question"
            defaultValue={asArray<FaqItem>(service?.faq) as unknown as Record<string, unknown>[]}
            fields={[
              { key: 'question', label: 'Question', type: 'text' },
              { key: 'answer', label: 'Réponse', type: 'textarea' },
            ]}
          />
        </Field>
      </FormSection>

      <FormSection title="Référencement (SEO)">
        <Field label="Titre SEO" htmlFor="seo_title">
          <Input id="seo_title" name="seo_title" defaultValue={service?.seo_title ?? ''} />
        </Field>
        <Field label="Description SEO" htmlFor="seo_description">
          <Textarea
            id="seo_description"
            name="seo_description"
            rows={2}
            defaultValue={service?.seo_description ?? ''}
          />
        </Field>
      </FormSection>

      <FormSection title="Publication">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Statut" htmlFor="status">
            <Select id="status" name="status" defaultValue={service?.status ?? 'draft'}>
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
              <option value="archived">Archivé</option>
            </Select>
          </Field>
          <Field label="Ordre d’affichage" htmlFor="position">
            <Input id="position" name="position" type="number" defaultValue={service?.position ?? 0} />
          </Field>
        </div>

        <Checkbox
          name="featured"
          defaultChecked={service?.featured ?? false}
          label="Mettre en avant sur la page d’accueil"
        />
      </FormSection>

      <FormActions>
        <SaveButton label={service ? 'Enregistrer' : 'Créer le service'} />
      </FormActions>
    </form>
  )
}
