import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Info, Package } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PRODUCT_KINDS } from '@/lib/products'
import { ButtonLink } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { SecureFileList } from '@/components/account/secure-file-list'
import { formatDate } from '@/lib/utils'
import type { Product, ProductFile, ProductPurchase } from '@/lib/types'

export const metadata: Metadata = { title: 'Mes produits' }

export default async function MyProductsPage() {
  const user = await requireUser('/compte/produits')
  const supabase = await createClient()

  const { data: purchases } = await supabase
    .from('product_purchases')
    .select('*, product:products(*)')
    .eq('user_id', user.id)
    .eq('state', 'active')
    .order('created_at', { ascending: false })

  const owned = ((purchases ?? []) as (ProductPurchase & { product: Product | null })[]).filter(
    (p): p is ProductPurchase & { product: Product } => Boolean(p.product),
  )

  // RLS : un acheteur lit la liste complète des fichiers de ce qu'il possède.
  const productIds = owned.map((p) => p.product_id)
  const { data: fileRows } = productIds.length
    ? await supabase.from('product_files').select('*').in('product_id', productIds).order('position')
    : { data: [] as ProductFile[] }
  const files = (fileRows as ProductFile[]) ?? []

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl">Mes produits</h1>
        <p className="mt-1 text-fg-muted">
          Vos e-books, vidéos et modèles achetés, à lire en ligne ou à télécharger.
        </p>
      </header>

      {owned.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun produit pour le moment"
          description="Les e-books, packs vidéo et modèles que vous achetez apparaîtront ici."
          action={
            <ButtonLink href="/boutique">
              Découvrir la boutique
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-6">
          {owned.map(({ product, created_at }) => {
            const kind = PRODUCT_KINDS[product.kind] ?? PRODUCT_KINDS.other
            const productFiles = files.filter((f) => f.product_id === product.id)
            return (
              <article
                key={product.id}
                id={product.slug}
                className="scroll-mt-24 overflow-hidden rounded-lg border border-line bg-surface shadow-e1"
              >
                <header className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-subtle text-primary-text">
                    {product.cover_url ? (
                      <img src={product.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <kind.icon className="h-7 w-7" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="primary">{kind.label}</Badge>
                      <span className="text-xs text-fg-subtle">Acquis le {formatDate(created_at)}</span>
                    </div>
                    <h2 className="mt-1.5 text-lg font-semibold text-fg">{product.title}</h2>
                    {product.subtitle && <p className="text-sm text-fg-muted">{product.subtitle}</p>}
                  </div>
                  {product.status === 'published' && (
                    <Link
                      href={`/boutique/${product.slug}`}
                      className="shrink-0 text-sm font-medium text-fg-muted hover:text-primary-text"
                    >
                      Fiche du produit
                    </Link>
                  )}
                </header>

                <div className="p-5">
                  <SecureFileList
                    files={productFiles}
                    endpoint="/api/produits/fichiers"
                    emptyLabel="Les fichiers de ce produit sont en cours de préparation."
                  />
                  {product.download_limit > 0 && productFiles.length > 0 && (
                    <p className="mt-4 flex items-start gap-2 text-xs text-fg-subtle">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      Chaque fichier peut être téléchargé {product.download_limit} fois. La lecture
                      en ligne reste illimitée.
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
