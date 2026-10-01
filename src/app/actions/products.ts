'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'
import { isProductKind } from '@/lib/products'
import { slugify } from '@/lib/utils'

/**
 * Administration de la boutique de produits digitaux.
 *
 * Toutes les écritures passent par la clé de service APRÈS le contrôle de
 * rôle de `requireAdmin` : la clé contourne RLS, le contrôle ne doit donc
 * jamais manquer.
 */

export interface ProductResult {
  ok: boolean
  message?: string
  id?: string
}

function str(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function nullable(formData: FormData, name: string): string | null {
  return str(formData, name) || null
}

function int(formData: FormData, name: string, fallback = 0): number {
  const value = Number(str(formData, name))
  return Number.isFinite(value) ? Math.round(value) : fallback
}

function lines(formData: FormData, name: string): string[] {
  return str(formData, name)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function json<T>(formData: FormData, name: string, fallback: T): T {
  const raw = str(formData, name)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function mapError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('duplicate key') && m.includes('slug'))
    return 'Cette adresse (slug) est déjà utilisée. Choisissez-en une autre.'
  if (m.includes('duplicate key')) return 'Cet élément existe déjà.'
  if (m.includes('violates foreign key')) return 'Un élément lié est introuvable.'
  if (m.includes('does not exist') || m.includes('schema cache'))
    return 'La boutique n’est pas encore installée : appliquez la migration 0013 dans Supabase.'
  console.error('[boutique] erreur base :', message)
  return 'L’enregistrement a échoué. Merci de réessayer.'
}

function revalidateShop(slug?: string) {
  revalidatePath('/admin/produits')
  revalidatePath('/boutique')
  if (slug) revalidatePath(`/boutique/${slug}`)
}

/* ------------------------------------------------------------------ */
/* Produits                                                            */
/* ------------------------------------------------------------------ */

export async function saveProduct(
  _prev: ProductResult | null,
  formData: FormData,
): Promise<ProductResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const id = str(formData, 'id')
  const title = str(formData, 'title')
  if (!title) return { ok: false, message: 'Le titre est obligatoire.' }

  const slug = slugify(str(formData, 'slug') || title)
  if (!slug) return { ok: false, message: 'L’adresse du produit est invalide.' }

  const status = ['draft', 'published', 'archived'].includes(str(formData, 'status'))
    ? str(formData, 'status')
    : 'draft'
  const kind = isProductKind(str(formData, 'kind')) ? str(formData, 'kind') : 'ebook'
  const free = str(formData, 'pricing') === 'free'
  const price = Math.max(0, int(formData, 'price_cents'))
  const compareRaw = str(formData, 'compare_at_price_cents')
  const compareAt = compareRaw ? Math.max(0, Math.round(Number(compareRaw)) || 0) : null

  if (!free && price === 0 && status === 'published') {
    return {
      ok: false,
      message: 'Indiquez un prix, ou cochez « Produit gratuit » pour le proposer sans paiement.',
    }
  }

  let publishedAt: string | null = null
  if (status === 'published') {
    if (id) {
      const { data } = await supabase.from('products').select('published_at').eq('id', id).maybeSingle()
      publishedAt = (data?.published_at as string | null) ?? new Date().toISOString()
    } else {
      publishedAt = new Date().toISOString()
    }
  }

  const payload = {
    slug,
    title,
    subtitle: nullable(formData, 'subtitle'),
    summary: nullable(formData, 'summary'),
    description: nullable(formData, 'description'),
    cover_url: nullable(formData, 'cover_url'),
    kind,
    pricing: free ? 'free' : 'fixed',
    price_cents: free ? 0 : price,
    compare_at_price_cents: free ? null : compareAt && compareAt > price ? compareAt : null,
    currency: str(formData, 'currency') || 'XOF',
    format_label: nullable(formData, 'format_label'),
    delivery_label: nullable(formData, 'delivery_label'),
    highlights: lines(formData, 'highlights'),
    faq: json(formData, 'faq', [] as unknown[]),
    download_limit: Math.min(1000, Math.max(0, int(formData, 'download_limit'))),
    status,
    featured: formData.get('featured') === 'on',
    position: int(formData, 'position'),
    seo_title: nullable(formData, 'seo_title'),
    seo_description: nullable(formData, 'seo_description'),
    og_image_url: nullable(formData, 'og_image_url'),
    published_at: publishedAt,
  }

  if (id) {
    const { error } = await supabase.from('products').update(payload).eq('id', id)
    if (error) return { ok: false, message: mapError(error.message) }
    await logActivity(user.id, 'product.updated', 'product', id, { title })
  } else {
    const { data, error } = await supabase.from('products').insert(payload).select('id').single()
    if (error || !data) return { ok: false, message: mapError(error?.message ?? '') }
    await logActivity(user.id, 'product.created', 'product', data.id, { title })
    revalidateShop(slug)
    redirect(`/admin/produits/${data.id}?cree=1`)
  }

  revalidateShop(slug)
  revalidatePath(`/admin/produits/${id}`)
  return { ok: true, message: 'Produit enregistré.', id }
}

export async function deleteProduct(id: string): Promise<ProductResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const { count } = await supabase
    .from('product_purchases')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message:
        'Ce produit a déjà des acheteurs : archivez-le plutôt que de le supprimer, pour qu’ils gardent leur accès.',
    }
  }

  const { data: files } = await supabase.from('product_files').select('storage_path').eq('product_id', id)
  const paths = (files ?? []).map((f) => f.storage_path as string).filter(Boolean)
  if (paths.length) await supabase.storage.from('product-files').remove(paths)

  const { data: product } = await supabase.from('products').select('slug, title').eq('id', id).maybeSingle()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(user.id, 'product.deleted', 'product', id, { title: product?.title ?? null })
  revalidateShop(product?.slug as string | undefined)
  return { ok: true, message: 'Produit supprimé.' }
}

export async function duplicateProduct(id: string): Promise<ProductResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const { data: product } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
  if (!product) return { ok: false, message: 'Produit introuvable.' }

  const { id: _id, created_at: _c, updated_at: _u, ...rest } = product
  const { data: copy, error } = await supabase
    .from('products')
    .insert({
      ...rest,
      slug: `${product.slug}-copie-${Date.now().toString(36)}`,
      title: `${product.title} (copie)`,
      status: 'draft',
      featured: false,
      published_at: null,
    })
    .select('id')
    .single()

  if (error || !copy) return { ok: false, message: mapError(error?.message ?? '') }

  // Les fichiers ne sont PAS dupliqués : deux produits pointant le même objet
  // de stockage, la suppression de l'un casserait l'autre. On repart vide.
  await logActivity(user.id, 'product.duplicated', 'product', copy.id, { from: id })
  revalidatePath('/admin/produits')
  return { ok: true, message: 'Produit dupliqué (sans ses fichiers).', id: copy.id }
}

/* ------------------------------------------------------------------ */
/* Fichiers                                                            */
/* ------------------------------------------------------------------ */

/** Enregistre en base un fichier DÉJÀ déposé dans le bucket privé. */
export async function registerProductFile(input: {
  productId: string
  title: string
  description?: string | null
  storagePath: string
  fileName: string
  fileSize: number
  mimeType: string
  isPreview?: boolean
}): Promise<ProductResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  // Le chemin vient du navigateur : on n'accepte que la forme produite par
  // `storagePathFor` (année / nom assaini), jamais un chemin arbitraire.
  if (!/^\d{4}\/[a-z0-9][a-z0-9.-]*$/.test(input.storagePath)) {
    return { ok: false, message: 'Chemin de fichier invalide.' }
  }

  const { count } = await supabase
    .from('product_files')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', input.productId)

  const { data, error } = await supabase
    .from('product_files')
    .insert({
      product_id: input.productId,
      title: (input.title || input.fileName).slice(0, 200),
      description: input.description?.slice(0, 500) || null,
      storage_path: input.storagePath,
      file_name: input.fileName.slice(0, 255),
      file_size: Math.max(0, Math.round(input.fileSize)),
      mime_type: input.mimeType.slice(0, 120),
      is_preview: Boolean(input.isPreview),
      position: count ?? 0,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: mapError(error?.message ?? '') }

  await logActivity(user.id, 'product.file_added', 'product', input.productId, {
    file: input.fileName,
  })
  revalidatePath(`/admin/produits/${input.productId}`)
  return { ok: true, message: 'Fichier ajouté.', id: data.id }
}

export async function updateProductFile(
  fileId: string,
  productId: string,
  patch: { title?: string; description?: string | null; isPreview?: boolean; position?: number },
): Promise<ProductResult> {
  await requireAdmin()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  if (patch.title !== undefined) update.title = patch.title.trim().slice(0, 200) || 'Fichier'
  if (patch.description !== undefined) update.description = patch.description?.trim().slice(0, 500) || null
  if (patch.isPreview !== undefined) update.is_preview = patch.isPreview
  if (patch.position !== undefined) update.position = Math.round(patch.position)

  const { error } = await supabase
    .from('product_files')
    .update(update)
    .eq('id', fileId)
    .eq('product_id', productId)
  if (error) return { ok: false, message: mapError(error.message) }

  revalidatePath(`/admin/produits/${productId}`)
  return { ok: true, message: 'Fichier mis à jour.' }
}

/** Échange la position de deux fichiers voisins. */
export async function moveProductFile(
  fileId: string,
  productId: string,
  direction: 'up' | 'down',
): Promise<ProductResult> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: files } = await supabase
    .from('product_files')
    .select('id, position')
    .eq('product_id', productId)
    .order('position')
    .order('created_at')

  const list = files ?? []
  const index = list.findIndex((f) => f.id === fileId)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= list.length) return { ok: true }

  // Positions réécrites en séquence : des positions égales (fichiers ajoutés
  // avant que l'ordre n'existe) rendaient l'échange sans effet.
  const ordered = list.map((f) => f.id)
  ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
  await Promise.all(
    ordered.map((id, position) => supabase.from('product_files').update({ position }).eq('id', id)),
  )

  revalidatePath(`/admin/produits/${productId}`)
  return { ok: true }
}

export async function deleteProductFile(fileId: string, productId: string): Promise<ProductResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const { data: file } = await supabase
    .from('product_files')
    .select('storage_path, file_name')
    .eq('id', fileId)
    .eq('product_id', productId)
    .maybeSingle()

  if (!file) return { ok: false, message: 'Fichier introuvable.' }

  const { error } = await supabase.from('product_files').delete().eq('id', fileId)
  if (error) return { ok: false, message: mapError(error.message) }

  // Le fichier stocké part APRÈS la ligne : dans l'ordre inverse, un échec
  // de suppression en base laisserait une ligne pointant vers le vide.
  if (file.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('product-files')
      .remove([file.storage_path as string])
    if (storageError) console.error('[boutique] fichier non supprimé :', storageError.message)
  }

  await logActivity(user.id, 'product.file_deleted', 'product', productId, {
    file: file.file_name ?? null,
  })
  revalidatePath(`/admin/produits/${productId}`)
  return { ok: true, message: 'Fichier supprimé.' }
}

/* ------------------------------------------------------------------ */
/* Accès des clients                                                   */
/* ------------------------------------------------------------------ */

/** Offre un produit à un client : cadeau, geste commercial, partenaire. */
export async function grantProductAccess(
  _prev: ProductResult | null,
  formData: FormData,
): Promise<ProductResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const userId = str(formData, 'user_id')
  const productId = str(formData, 'product_id')
  if (!userId || !productId) return { ok: false, message: 'Client et produit obligatoires.' }

  const { error } = await supabase
    .from('product_purchases')
    .upsert(
      { user_id: userId, product_id: productId, state: 'active', source: 'admin_grant' },
      { onConflict: 'user_id,product_id' },
    )
  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(user.id, 'product.access_granted', 'product', productId, { userId })
  revalidatePath(`/admin/clients/${userId}`)
  revalidatePath(`/admin/produits/${productId}`)
  return { ok: true, message: 'Accès au produit ouvert.' }
}

export async function setProductAccess(
  purchaseId: string,
  userId: string,
  state: 'active' | 'revoked',
): Promise<ProductResult> {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('product_purchases')
    .update({ state })
    .eq('id', purchaseId)
    .select('product_id')
    .maybeSingle()
  if (error) return { ok: false, message: mapError(error.message) }

  await logActivity(
    user.id,
    state === 'active' ? 'product.access_restored' : 'product.access_revoked',
    'product',
    (row?.product_id as string | undefined) ?? null,
    { userId },
  )
  revalidatePath(`/admin/clients/${userId}`)
  if (row?.product_id) revalidatePath(`/admin/produits/${row.product_id}`)
  return { ok: true, message: state === 'active' ? 'Accès rétabli.' : 'Accès retiré.' }
}
