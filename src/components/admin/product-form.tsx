'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { saveProduct, type ProductResult } from '@/app/actions/products'
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
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { PRODUCT_KINDS, PRODUCT_KIND_ORDER } from '@/lib/products'
import { asArray, cn, discountPercent, formatPrice, slugify } from '@/lib/utils'
import type { FaqItem, Product, ProductKind } from '@/lib/types'

export function ProductForm({ product, previewData }: { product: Product | null; previewData?: BlockData }) {
  const [state, action] = useActionState<ProductResult | null, FormData>(saveProduct, null)
  const [kind, setKind] = useState<ProductKind>(product?.kind ?? 'ebook')
  const [free, setFree] = useState(product?.pricing === 'free')
  const [price, setPrice] = useState(String(product?.price_cents ?? ''))
  const [compare, setCompare] = useState(String(product?.compare_at_price_cents ?? ''))

  const discount = discountPercent(Number(price) || 0, Number(compare) || null)

  return (
    <form action={action} className="space-y-6">
      <ActionFeedback state={state} />

      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="currency" value={product?.currency ?? 'XOF'} />

      <FormSection title="Type de produit" description="Ce que l’acheteur va recevoir.">
        <input type="hidden" name="kind" value={kind} />
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Type de produit">
          {PRODUCT_KIND_ORDER.map((value) => {
            const def = PRODUCT_KINDS[value]
            const selected = kind === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setKind(value)}
                className={cn(
                  'flex items-start gap-3 rounded-md border-2 p-3 text-left transition-colors duration-fast',
                  selected
                    ? 'border-primary-text bg-primary-subtle'
                    : 'border-line hover:border-line-control hover:bg-canvas-subtle',
                )}
              >
                <def.icon
                  className={cn('mt-0.5 h-5 w-5 shrink-0', selected ? 'text-primary-text' : 'text-fg-subtle')}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg">{def.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-fg-subtle">{def.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </FormSection>

      <FormSection
        title="Informations principales"
        description="Ce que le visiteur voit sur la fiche du produit et dans le catalogue."
      >
        <Field label="Titre" htmlFor="title" required>
          <Input
            id="title"
            name="title"
            defaultValue={product?.title ?? ''}
            required
            onChange={(e) => {
              if (product) return
              const slugField = document.getElementById('slug') as HTMLInputElement | null
              if (slugField && !slugField.dataset.touched) slugField.value = slugify(e.target.value)
            }}
          />
        </Field>

        <Field
          label="Adresse de la page (slug)"
          htmlFor="slug"
          help="La fiche sera accessible à /boutique/votre-slug. Évitez de la changer une fois partagée."
        >
          <Input
            id="slug"
            name="slug"
            defaultValue={product?.slug ?? ''}
            onInput={(e) => {
              ;(e.target as HTMLInputElement).dataset.touched = 'true'
            }}
            placeholder="guide-business-plan"
          />
        </Field>

        <Field label="Sous-titre" htmlFor="subtitle">
          <Input id="subtitle" name="subtitle" defaultValue={product?.subtitle ?? ''} />
        </Field>

        <Field label="Résumé" htmlFor="summary" help="Deux ou trois lignes, affichées dans le catalogue.">
          <Textarea id="summary" name="summary" rows={3} defaultValue={product?.summary ?? ''} />
        </Field>


        <Field label="Image de couverture" help="Format paysage 16:9 conseillé (ex. 1600 × 900).">
          <ImageInput name="cover_url" defaultValue={product?.cover_url} />
        </Field>
      </FormSection>

      <FormSection
        title="Présentation de la page"
        description="Sommaire, extraits, captures, vidéos de démonstration, témoignages… composés par blocs, chacun avec son fond."
      >
        <PresentationEditor
          blocks={product?.blocks}
          legacy={product?.description}
          legacyName="description"
          previewData={previewData}
        />
      </FormSection>

      <FormSection title="Prix" description="Montants en FCFA, sans décimales.">
        <Checkbox
          name="pricing"
          value="free"
          checked={free}
          onChange={(e) => setFree(e.target.checked)}
          label="Produit gratuit — accessible après simple création de compte (idéal pour un aimant à prospects)"
        />
        {!free && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Prix de vente" htmlFor="price_cents" required>
              <Input
                id="price_cents"
                name="price_cents"
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </Field>
            <Field
              label="Prix barré"
              htmlFor="compare_at_price_cents"
              help={
                discount
                  ? `Affiché « −${discount} % » sur la fiche.`
                  : 'Laissez vide s’il n’y a pas de promotion.'
              }
            >
              <Input
                id="compare_at_price_cents"
                name="compare_at_price_cents"
                type="number"
                min={0}
                step={1}
                value={compare}
                onChange={(e) => setCompare(e.target.value)}
              />
            </Field>
          </div>
        )}
        {!free && Number(price) > 0 && (
          <p className="text-sm text-fg-muted">
            Prix affiché : <strong className="text-fg">{formatPrice(Number(price))}</strong>
          </p>
        )}
      </FormSection>

      <FormSection
        title="Compte à rebours et quantité limitée"
        description="Une offre de lancement datée, ou un nombre d’exemplaires limité : affichés en direct sur la page du produit."
      >
        <ScarcityFields item={product} unitHint="exemplaires disponibles" />
      </FormSection>

      <FormSection title="En pratique" description="Les mentions affichées dans l’encart d’achat.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Format" htmlFor="format_label">
            <Input
              id="format_label"
              name="format_label"
              defaultValue={product?.format_label ?? ''}
              placeholder={
                kind === 'video'
                  ? '12 vidéos · 3 h 40'
                  : kind === 'template'
                    ? '8 modèles Excel et Word'
                    : kind === 'audio'
                      ? '6 épisodes MP3'
                      : 'PDF · 84 pages'
              }
            />
          </Field>
          <Field label="Livraison" htmlFor="delivery_label">
            <Input
              id="delivery_label"
              name="delivery_label"
              defaultValue={product?.delivery_label ?? ''}
              placeholder="Accès immédiat après paiement"
            />
          </Field>
        </div>

        <Field label="Points forts" help="Affichés sous le prix, un par ligne.">
          <StringListEditor
            name="highlights"
            defaultValue={asArray<string>(product?.highlights)}
            placeholder="Modèle de compte d’exploitation prêt à remplir"
          />
        </Field>

        <Field
          label="Téléchargements autorisés par fichier"
          htmlFor="download_limit"
          help="0 = illimité. Une limite (ex. 5) freine le partage d’un compte ; la lecture en ligne reste toujours possible."
        >
          <Input
            id="download_limit"
            name="download_limit"
            type="number"
            min={0}
            max={1000}
            defaultValue={product?.download_limit ?? 0}
            className="max-w-[10rem]"
          />
        </Field>
      </FormSection>

      <FormSection title="Questions fréquentes">
        <ObjectListEditor
          name="faq"
          itemLabel="Question"
          defaultValue={asArray<FaqItem>(product?.faq) as unknown as Record<string, unknown>[]}
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
          <Input id="seo_title" name="seo_title" defaultValue={product?.seo_title ?? ''} />
        </Field>
        <Field label="Description SEO" htmlFor="seo_description" help="160 caractères environ.">
          <Textarea
            id="seo_description"
            name="seo_description"
            rows={2}
            defaultValue={product?.seo_description ?? ''}
          />
        </Field>
        <Field label="Image de partage">
          <ImageInput name="og_image_url" defaultValue={product?.og_image_url} accept="image" />
        </Field>
      </FormSection>

      <FormSection title="Publication">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Statut" htmlFor="status">
            <Select id="status" name="status" defaultValue={product?.status ?? 'draft'}>
              <option value="draft">Brouillon — invisible sur le site</option>
              <option value="published">Publié — en vente dans la boutique</option>
              <option value="archived">Archivé — retiré de la vente, acheteurs conservés</option>
            </Select>
          </Field>
          <Field
            label="Ordre d’affichage"
            htmlFor="position"
            help="Plus le nombre est petit, plus le produit apparaît haut."
          >
            <Input id="position" name="position" type="number" defaultValue={product?.position ?? 0} />
          </Field>
        </div>
        <Checkbox
          name="featured"
          defaultChecked={product?.featured ?? false}
          label="Mettre en avant en tête de boutique"
        />
      </FormSection>

      <FormActions>
        <SaveButton label={product ? 'Enregistrer les modifications' : 'Créer le produit'} />
        {product?.status === 'published' && (
          <Link
            href={`/boutique/${product.slug}`}
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
