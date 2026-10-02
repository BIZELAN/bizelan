import type { Metadata } from 'next'
import Link from 'next/link'
import { Copy, Download, ExternalLink, Package, Plus, ShoppingBag, TrendingUp } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, StatCard, Table, Td, Th } from '@/components/admin/shell'
import { ButtonLink } from '@/components/ui/button'
import { Badge, CONTENT_STATUS_LABELS, StatusBadge } from '@/components/ui/badge'
import { Alert, EmptyState } from '@/components/ui/misc'
import { ActionButton, DeleteButton } from '@/components/admin/form-bits'
import { deleteProduct, duplicateProduct } from '@/app/actions/products'
import { PRODUCT_KINDS } from '@/lib/products'
import { formatPrice, payablePrice } from '@/lib/utils'
import type { Product } from '@/lib/types'
import { MediaView } from '@/components/ui/media-view'

export const metadata: Metadata = { title: 'Boutique' }
export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 30 * 86400000).toISOString()

  const [{ data, error }, { data: sales }, { data: files }, { count: downloads30 }] =
    await Promise.all([
      supabase.from('products').select('*').order('position').order('created_at', { ascending: false }),
      supabase.from('v_product_sales').select('*'),
      supabase.from('product_files').select('product_id'),
      supabase
        .from('product_downloads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
    ])

  // La table n'existe pas tant que la migration 0013 n'est pas appliquée.
  if (error) {
    return (
      <>
        <PageHeader title="Boutique" description="Produits digitaux : e-books, vidéos, modèles…" />
        <Alert tone="warning" title="La boutique n’est pas encore installée">
          Exécutez le fichier <code>supabase/migrations/0013_boutique_espace.sql</code> dans
          Supabase (SQL Editor), puis rechargez cette page.
        </Alert>
      </>
    )
  }

  const products = (data as Product[]) ?? []
  const salesById = new Map(
    ((sales ?? []) as { product_id: string; units_sold: number; revenue_cents: number }[]).map((s) => [
      s.product_id,
      s,
    ]),
  )
  const filesCount = new Map<string, number>()
  for (const f of files ?? []) filesCount.set(f.product_id, (filesCount.get(f.product_id) ?? 0) + 1)

  const totalUnits = [...salesById.values()].reduce((s, r) => s + Number(r.units_sold), 0)
  const totalRevenue = [...salesById.values()].reduce((s, r) => s + Number(r.revenue_cents), 0)

  return (
    <>
      <PageHeader
        title="Boutique"
        description="Vos produits digitaux : e-books, packs vidéo, modèles, audio. Livrés automatiquement après paiement."
        actions={
          <ButtonLink href="/admin/produits/nouveau">
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau produit
          </ButtonLink>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Produits en vente"
          value={products.filter((p) => p.status === 'published').length}
          hint={`${products.length} au total`}
          icon={Package}
        />
        <StatCard label="Ventes" value={totalUnits} icon={ShoppingBag} tone="accent" />
        <StatCard label="Chiffre d’affaires" value={formatPrice(totalRevenue)} icon={TrendingUp} tone="brand" />
        <StatCard label="Téléchargements (30 j)" value={downloads30 ?? 0} icon={Download} />
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun produit pour le moment"
          description="Créez votre premier e-book, pack vidéo ou modèle : il sera vendu dans /boutique et livré automatiquement après paiement."
          action={
            <ButtonLink href="/admin/produits/nouveau">
              <Plus className="h-4 w-4" aria-hidden />
              Créer un produit
            </ButtonLink>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Produit</Th>
              <Th>Prix</Th>
              <Th>Ventes</Th>
              <Th>Revenus</Th>
              <Th>Fichiers</Th>
              <Th>Statut</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const kind = PRODUCT_KINDS[product.kind] ?? PRODUCT_KINDS.other
              const stats = salesById.get(product.id)
              const nbFiles = filesCount.get(product.id) ?? 0
              return (
                <tr key={product.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      {product.cover_url ? (
                        <MediaView src={product.cover_url} alt="" className="h-11 w-16 shrink-0 rounded-sm object-cover" />
                      ) : (
                        <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-sm bg-canvas-subtle">
                          <kind.icon className="h-4 w-4 text-fg-subtle" aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/produits/${product.id}`}
                          className="block font-medium text-fg hover:text-primary-text"
                        >
                          {product.title}
                        </Link>
                        <span className="text-xs text-fg-subtle">
                          {kind.label} · /boutique/{product.slug}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap font-semibold tabular-nums">
                    {formatPrice(payablePrice(product), product.currency)}
                  </Td>
                  <Td className="tabular-nums text-fg-muted">{Number(stats?.units_sold ?? 0)}</Td>
                  <Td className="whitespace-nowrap tabular-nums text-fg-muted">
                    {formatPrice(Number(stats?.revenue_cents ?? 0) || null)}
                  </Td>
                  <Td>
                    {nbFiles === 0 ? (
                      <Badge tone="warning">Aucun</Badge>
                    ) : (
                      <span className="tabular-nums text-fg-muted">{nbFiles}</span>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={product.status} map={CONTENT_STATUS_LABELS} />
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1.5">
                      {product.status === 'published' && (
                        <Link
                          href={`/boutique/${product.slug}`}
                          target="_blank"
                          className="rounded-md p-2 text-fg-subtle transition-colors hover:bg-canvas-subtle hover:text-primary-text"
                          title="Voir sur le site"
                          aria-label="Voir sur le site"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden />
                        </Link>
                      )}
                      <ActionButton
                        action={duplicateProduct.bind(null, product.id)}
                        variant="ghost"
                        label="Dupliquer le produit"
                      >
                        <Copy className="h-4 w-4" aria-hidden />
                      </ActionButton>
                      <DeleteButton
                        action={deleteProduct.bind(null, product.id)}
                        label=""
                        variant="ghost"
                        confirmText={`Supprimer « ${product.title} » et ses fichiers ? Cette action est définitive.`}
                      />
                    </div>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </>
  )
}
