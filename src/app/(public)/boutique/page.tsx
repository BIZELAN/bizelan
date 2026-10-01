import type { Metadata } from 'next'
import Link from 'next/link'
import { Package } from 'lucide-react'

import { ProductCard } from '@/components/public/cards'
import { EmptyState } from '@/components/ui/misc'
import { getPublishedProducts } from '@/lib/queries'
import { PRODUCT_KINDS, PRODUCT_KIND_ORDER, isProductKind } from '@/lib/products'
import { cn } from '@/lib/utils'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Boutique',
  description:
    'E-books, packs vidéo, modèles prêts à l’emploi : des ressources concrètes pour faire avancer votre projet, disponibles immédiatement après achat.',
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const all = await getPublishedProducts()
  const activeKind = isProductKind(type) ? type : null
  const products = activeKind ? all.filter((p) => p.kind === activeKind) : all

  // Les filtres n'affichent que les types réellement présents : un filtre
  // qui ne mène à rien est une impasse.
  const kinds = PRODUCT_KIND_ORDER.filter((k) => all.some((p) => p.kind === k))
  const featured = !activeKind ? all.filter((p) => p.featured) : []
  const rest = !activeKind ? products.filter((p) => !p.featured) : products

  return (
    <>
      <section className="border-b border-line bg-canvas-subtle">
        <div className="container-page py-16 sm:py-20">
          <p className="eyebrow mb-3">Boutique</p>
          <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl">
            Des ressources prêtes à l’emploi, disponibles tout de suite
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-fg-muted">
            Guides, modèles et vidéos conçus par l’équipe. Payez par Mobile Money et accédez à vos
            fichiers immédiatement depuis votre espace.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          {kinds.length > 1 && (
            <nav aria-label="Filtrer par type" className="mb-8 flex flex-wrap gap-2">
              <FilterLink href="/boutique" active={!activeKind}>
                Tout ({all.length})
              </FilterLink>
              {kinds.map((k) => (
                <FilterLink key={k} href={`/boutique?type=${k}`} active={activeKind === k}>
                  {PRODUCT_KINDS[k].plural} ({all.filter((p) => p.kind === k).length})
                </FilterLink>
              ))}
            </nav>
          )}

          {products.length === 0 ? (
            <EmptyState
              icon={Package}
              title={activeKind ? 'Aucun produit de ce type' : 'La boutique ouvre bientôt'}
              description={
                activeKind
                  ? 'Essayez un autre filtre.'
                  : 'Nos premiers e-books et modèles arrivent. Revenez très vite.'
              }
            />
          ) : (
            <>
              {featured.length > 0 && (
                <div className="mb-10">
                  <h2 className="mb-5 text-xl">À la une</h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {featured.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}
              {rest.length > 0 && (
                <div>
                  {featured.length > 0 && <h2 className="mb-5 text-xl">Tous les produits</h2>}
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-pill px-4 py-2 text-sm font-medium ring-1 transition-colors duration-fast',
        active
          ? 'bg-primary text-primary-fg ring-primary'
          : 'bg-surface text-fg-muted ring-line hover:text-fg hover:ring-line-strong',
      )}
    >
      {children}
    </Link>
  )
}
