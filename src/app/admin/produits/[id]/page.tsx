import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, ShoppingBag, TrendingUp, Users } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { FormSection, PageHeader, StatCard } from '@/components/admin/shell'
import { ProductForm } from '@/components/admin/product-form'
import { getBlockData } from '@/lib/queries'
import { ProductFilesManager } from '@/components/admin/product-files-manager'
import { Alert } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Product, ProductFile } from '@/lib/types'

export const metadata: Metadata = { title: 'Modifier le produit' }
export const dynamic = 'force-dynamic'

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ cree?: string }>
}) {
  const { id } = await params
  const { cree } = await searchParams
  const supabase = createAdminClient()

  const [{ data: product }, { data: files }, { data: sales }, { data: downloads }, { data: buyers }, previewData] =
    await Promise.all([
      supabase.from('products').select('*').eq('id', id).maybeSingle<Product>(),
      supabase.from('product_files').select('*').eq('product_id', id).order('position').order('created_at'),
      supabase.from('v_product_sales').select('*').eq('product_id', id).maybeSingle(),
      supabase.from('product_downloads').select('product_file_id, user_id').eq('product_id', id),
      supabase
        .from('product_purchases')
        .select('id, state, source, created_at, profile:bz_profiles(id, full_name, email)')
        .eq('product_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      getBlockData(),
    ])

  if (!product) notFound()

  const fileList = (files as ProductFile[]) ?? []
  const downloadsByFile: Record<string, number> = {}
  for (const d of downloads ?? []) {
    const key = d.product_file_id as string
    downloadsByFile[key] = (downloadsByFile[key] ?? 0) + 1
  }
  const uniqueDownloaders = new Set((downloads ?? []).map((d) => d.user_id)).size
  const buyerList = (buyers ?? []) as unknown as {
    id: string
    state: string
    source: string
    created_at: string
    profile: { id: string; full_name: string | null; email: string } | null
  }[]

  return (
    <>
      <PageHeader
        title={product.title}
        description="Fiche, fichiers livrés et acheteurs."
        backHref="/admin/produits"
        backLabel="Boutique"
      />

      {cree && (
        <Alert tone="success" title="Produit créé" className="mb-6">
          Ajoutez maintenant ses fichiers ci-dessous, puis passez-le en « Publié » pour l’ouvrir à la vente.
        </Alert>
      )}
      {product.status === 'published' && fileList.length === 0 && (
        <Alert tone="warning" title="Produit publié sans fichier" className="mb-6">
          Un acheteur ne recevrait rien. Ajoutez au moins un fichier.
        </Alert>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ventes" value={Number(sales?.units_sold ?? 0)} icon={ShoppingBag} />
        <StatCard
          label="Revenus"
          value={formatPrice(Number(sales?.revenue_cents ?? 0) || null)}
          icon={TrendingUp}
          tone="brand"
        />
        <StatCard label="Acheteurs" value={buyerList.filter((b) => b.state === 'active').length} icon={Users} />
        <StatCard
          label="Téléchargements"
          value={(downloads ?? []).length}
          hint={`par ${uniqueDownloaders} acheteur${uniqueDownloaders > 1 ? 's' : ''}`}
          icon={Download}
          tone="accent"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <FormSection
            title="Fichiers livrés"
            description="Ce que l’acheteur reçoit. Il peut les lire en ligne (PDF, vidéo, audio) ou les télécharger."
          >
            <ProductFilesManager productId={product.id} files={fileList} downloadsByFile={downloadsByFile} />
          </FormSection>

          <ProductForm product={product} previewData={previewData} />
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="mb-1 text-base font-semibold">Derniers acheteurs</h2>
            <p className="mb-4 text-sm text-fg-muted">
              Pour offrir ce produit, ouvrez la fiche d’un client puis « Offrir un produit ».
            </p>
            {buyerList.length === 0 ? (
              <p className="text-sm text-fg-subtle">Aucun acheteur pour le moment.</p>
            ) : (
              <ul className="divide-y divide-line">
                {buyerList.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      {b.profile ? (
                        <Link
                          href={`/admin/clients/${b.profile.id}`}
                          className="block truncate font-medium text-fg hover:text-primary-text"
                        >
                          {b.profile.full_name ?? b.profile.email}
                        </Link>
                      ) : (
                        <span className="block text-fg-subtle">Compte supprimé</span>
                      )}
                      <span className="block text-xs text-fg-subtle">
                        {formatDate(b.created_at)}
                        {b.source === 'admin_grant' ? ' · offert' : b.source === 'free' ? ' · gratuit' : ''}
                      </span>
                    </span>
                    {b.state !== 'active' && <Badge tone="neutral">Retiré</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}
