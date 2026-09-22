'use client'

import { useActionState, useState } from 'react'

import { savePost, type AdminResult } from '@/app/actions/admin'
import { FormActions, FormSection } from '@/components/admin/shell'
import { ActionFeedback, SaveButton } from '@/components/admin/form-bits'
import { ImageInput } from '@/components/admin/image-input'
import { RichEditor } from '@/components/admin/rich-editor'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { parseRichContent } from '@/lib/rich-content'
import { slugify } from '@/lib/utils'
import type { Category, Post } from '@/lib/types'

export function PostForm({ post, categories }: { post: Post | null; categories: Category[] }) {
  const [state, action] = useActionState<AdminResult | null, FormData>(savePost, null)
  const [slug, setSlug] = useState(post?.slug ?? '')

  return (
    <form action={action} className="space-y-6">
      <ActionFeedback state={state} />
      {post && <input type="hidden" name="id" value={post.id} />}

      <FormSection title="Article">
        <Field label="Titre" htmlFor="title" required>
          <Input
            id="title"
            name="title"
            defaultValue={post?.title ?? ''}
            required
            onChange={(e) => {
              if (!post && !slug) setSlug(slugify(e.target.value))
            }}
          />
        </Field>

        <Field label="Adresse (slug)" htmlFor="slug" help={`Article accessible à /blog/${slug || '…'}`}>
          <Input id="slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>

        <Field label="Accroche" htmlFor="excerpt" help="Deux ou trois lignes affichées dans la liste.">
          <Textarea id="excerpt" name="excerpt" rows={3} defaultValue={post?.excerpt ?? ''} />
        </Field>

        <Field label="Image de couverture">
          <ImageInput name="cover_url" defaultValue={post?.cover_url} />
        </Field>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">Contenu</label>
          <RichEditor
            name="content"
            defaultValue={parseRichContent(post?.content)}
            minHeight="min-h-[30rem]"
            placeholder="Rédigez votre article. Insérez images, vidéos et tableaux depuis la barre d’outils."
          />
        </div>
      </FormSection>

      <FormSection title="Classement et publication">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Catégorie" htmlFor="category_id">
            <Select id="category_id" name="category_id" defaultValue={post?.category_id ?? ''}>
              <option value="">Aucune</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Statut" htmlFor="status">
            <Select id="status" name="status" defaultValue={post?.status ?? 'draft'}>
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
              <option value="archived">Archivé</option>
            </Select>
          </Field>
        </div>

        <Checkbox
          name="featured"
          defaultChecked={post?.featured ?? false}
          label="Mettre en avant"
        />
      </FormSection>

      <FormSection title="Référencement (SEO)">
        <Field label="Titre SEO" htmlFor="seo_title">
          <Input id="seo_title" name="seo_title" defaultValue={post?.seo_title ?? ''} />
        </Field>
        <Field label="Description SEO" htmlFor="seo_description">
          <Textarea
            id="seo_description"
            name="seo_description"
            rows={2}
            defaultValue={post?.seo_description ?? ''}
          />
        </Field>
      </FormSection>

      <FormActions>
        <SaveButton label={post ? 'Enregistrer' : 'Créer l’article'} />
      </FormActions>
    </form>
  )
}
