import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { documentKind, isPlayableInline } from '@/lib/uploads'
import type { Product, ProductFile } from '@/lib/types'

export const dynamic = 'force-dynamic'

const PRODUCT_BUCKET = 'product-files'

/**
 * URL signée pour un fichier de la boutique.
 *
 *  · extrait offert d'un produit publié → accessible à tous ;
 *  · sinon → réservé à l'acheteur (achat actif) et à l'administration.
 *
 * `?mode=view` sert la lecture dans la page (PDF, vidéo, audio) ; le mode
 * par défaut force le téléchargement et compte dans le plafond éventuel du
 * produit. Le plafond freine le partage d'un compte sans gêner un acheteur :
 * relire en ligne n'est jamais limité.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mode = new URL(request.url).searchParams.get('mode') === 'view' ? 'view' : 'download'

  const admin = createAdminClient()
  const { data: file } = await admin
    .from('product_files')
    .select('*, product:products(id, status, download_limit, title)')
    .eq('id', id)
    .maybeSingle<ProductFile & { product: Pick<Product, 'id' | 'status' | 'download_limit' | 'title'> | null }>()

  if (!file || !file.product) {
    return NextResponse.json({ error: 'Ce fichier est introuvable.' }, { status: 404 })
  }

  const user = await getCurrentUser()
  const isAdmin = Boolean(user && ['admin', 'editor'].includes(user.profile.role))
  const publicPreview = file.is_preview && file.product.status === 'published'

  if (!publicPreview && !isAdmin) {
    if (!user) {
      return NextResponse.json({ error: 'Connectez-vous pour accéder à ce fichier.' }, { status: 401 })
    }
    const { data: purchase } = await admin
      .from('product_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', file.product_id)
      .eq('state', 'active')
      .maybeSingle()
    if (!purchase) {
      return NextResponse.json({ error: 'Ce fichier est réservé aux acheteurs.' }, { status: 403 })
    }

    const limit = file.product.download_limit ?? 0
    if (mode === 'download' && limit > 0) {
      const { count } = await admin
        .from('product_downloads')
        .select('id', { count: 'exact', head: true })
        .eq('product_file_id', file.id)
        .eq('user_id', user.id)
      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          {
            error:
              `Vous avez atteint la limite de ${limit} téléchargement${limit > 1 ? 's' : ''} ` +
              'pour ce fichier. Vous pouvez toujours le consulter en ligne, ou nous contacter.',
          },
          { status: 429 },
        )
      }
    }
  }

  const kind = documentKind(file.mime_type, file.file_name)
  // Une vidéo se regarde en plusieurs fois : quatre heures évitent que le
  // lecteur perde sa source en cours de séance. Un document n'a besoin que
  // de quelques minutes.
  const ttl = mode === 'view' && isPlayableInline(kind) ? 60 * 60 * 4 : 60 * 10

  const { data: signed, error } = await admin.storage
    .from(PRODUCT_BUCKET)
    .createSignedUrl(
      file.storage_path,
      ttl,
      mode === 'download' ? { download: file.file_name ?? true } : undefined,
    )

  if (error || !signed) {
    console.error('[produits] signature échouée :', error?.message)
    return NextResponse.json({ error: 'Fichier momentanément indisponible.' }, { status: 500 })
  }

  if (mode === 'download' && user && !isAdmin) {
    await admin.from('product_downloads').insert({
      user_id: user.id,
      product_id: file.product_id,
      product_file_id: file.id,
    })
  }

  return NextResponse.json({ url: signed.signedUrl }, { headers: { 'Cache-Control': 'no-store' } })
}
