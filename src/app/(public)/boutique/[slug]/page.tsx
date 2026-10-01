import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Download, Gift, ShieldCheck, Sparkles } from 'lucide-react'

import { Accordion } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { RichContentView } from '@/components/ui/rich-content'
import { ProductCard } from '@/components/public/cards'
import { SecureFileList } from '@/components/account/secure-file-list'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { getProductBySlug, getPublishedProducts, getSiteSettings, hasProductAccess } from '@/lib/queries'
import { PRODUCT_KINDS } from '@/lib/products'
import { parseRichContent } from '@/lib/rich-content'
import { DOCUMENT_KIND_LABELS, documentKind } from '@/lib/uploads'
import {
  asArray,
  discountPercent,
  formatFileSize,
  formatPrice,
  isFreeOffer,
  payablePrice,
  truncate,
} from '@/lib/utils'
import type { FaqItem } from '@/lib/types'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product || product.status !== 'published') return { title: 'Produit introuvable' }
  const description = product.seo_description ?? truncate(product.summary, 160)
  const image = product.og_image_url ?? product.cover_url
  return {
    title: product.seo_title ?? product.title,
    description,
    openGraph: {
      title: product.seo_title ?? product.title,
      description,
      images: image ? [image] : [],
    },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product || product.status !== 'published') notFound()

  const user = await getCurrentUser()
  const [owned, settings, others] = await Promise.all([
    user ? hasProductAccess(user.id, product.id) : Promise.resolve(false),
    getSiteSettings(),
    getPublishedProducts({ limit: 4 }),
  ])

  // Le contenu du produit est annoncé au visiteur : titres, formats et
  // tailles, jamais les chemins de stockage. Lu avec la clé de service parce
  // que RLS ne montre à un non-acheteur que les extraits offerts.
  const admin = createAdminClient()
  const { data: contents } = await admin
    .from('product_files')
    .select('id, title, file_name, file_size, mime_type, is_preview')
    .eq('product_id', product.id)
    .order('position')

  const kind = PRODUCT_KINDS[product.kind] ?? PRODUCT_KINDS.other
  const free = isFreeOffer(product)
  const price = payablePrice(product)
  const discount = free ? null : discountPercent(product.price_cents, product.compare_at_price_cents)
  const highlights = asArray<string>(product.highlights)
  const faq = asArray<FaqItem>(product.faq)
  const previews = product.files.filter((f) => f.is_preview)
  const related = others.filter((p) => p.id !== product.id).slice(0, 3)
  const totalSize = (contents ?? []).reduce((sum, f) => sum + Number(f.file_size ?? 0), 0)

  return (
    <>
      <section className="bg-canvas">
        <div className="container-page py-10 lg:py-14">
          <Link
            href="/boutique"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-primary-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Boutique
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone="primary">
                  <kind.icon className="h-3.5 w-3.5" aria-hidden />
                  {kind.label}
                </Badge>
                {product.format_label && <Badge tone="neutral">{product.format_label}</Badge>}
              </div>
              <h1 className="text-3xl font-bold leading-tight text-fg sm:text-4xl">{product.title}</h1>
              {product.subtitle && <p className="mt-4 text-xl text-primary-text">{product.subtitle}</p>}
              {product.summary && (
                <p className="mt-5 text-lg leading-relaxed text-fg-muted">{product.summary}</p>
              )}

              <div className="mt-8 overflow-hidden rounded-lg bg-canvas-subtle ring-1 ring-line">
                {product.cover_url ? (
                  <img src={product.cover_url} alt="" className="aspect-[16/9] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-primary/30 to-canvas">
                    <kind.icon className="h-16 w-16 text-primary-text/60" aria-hidden />
                  </div>
                )}
              </div>
            </div>

            {/* Encart d'achat */}
            <aside className="overflow-hidden rounded-lg bg-surface text-fg shadow-e3 ring-1 ring-line lg:sticky lg:top-24">
              <div className="p-6">
                {discount && (
                  <span className="mb-3 inline-block rounded-pill bg-secondary px-3 py-1 text-xs font-bold text-secondary-fg">
                    −{discount} % en ce moment
                  </span>
                )}
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-primary-text">
                    {formatPrice(price, product.currency)}
                  </span>
                  {!free &&
                    product.compare_at_price_cents &&
                    product.compare_at_price_cents > product.price_cents && (
                      <span className="text-lg text-fg-subtle line-through">
                        {formatPrice(product.compare_at_price_cents, product.currency)}
                      </span>
                    )}
                </div>
                <p className="mt-1.5 text-sm text-fg-subtle">
                  {product.delivery_label ?? 'Accès immédiat depuis votre espace personnel'}
                </p>

                <div className="mt-6">
                  {owned ? (
                    <ButtonLink href={`/compte/produits#${product.slug}`} size="lg" fullWidth>
                      <Download className="h-5 w-5" aria-hidden />
                      Accéder à mes fichiers
                    </ButtonLink>
                  ) : (
                    <ButtonLink href={`/commande/produit/${product.slug}`} size="lg" variant="accent" fullWidth>
                      {free ? <Gift className="h-5 w-5" aria-hidden /> : null}
                      {free ? 'Obtenir gratuitement' : 'Acheter maintenant'}
                      <ArrowRight className="h-5 w-5" aria-hidden />
                    </ButtonLink>
                  )}
                </div>

                {!owned && !free && (
                  <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-fg-subtle">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary-text" aria-hidden />
                    {settings.payments_online_enabled
                      ? 'Paiement sécurisé Mobile Money (MTN, Moov, Celtiis)'
                      : 'Paiement par dépôt, accès ouvert après vérification'}
                  </p>
                )}

                {highlights.length > 0 && (
                  <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                    {highlights.map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-fg-muted">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {(contents ?? []).length > 0 && (
                  <div className="mt-6 border-t border-line pt-5">
                    <p className="mb-3 text-sm font-semibold text-fg">
                      Vous recevez {(contents ?? []).length} fichier
                      {(contents ?? []).length > 1 ? 's' : ''}
                      {totalSize > 0 && (
                        <span className="font-normal text-fg-subtle"> · {formatFileSize(totalSize)}</span>
                      )}
                    </p>
                    <ul className="space-y-2">
                      {(contents ?? []).map((file) => (
                        <li key={file.id} className="flex items-start gap-2.5 text-sm text-fg-muted">
                          <Download className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                          <span className="min-w-0">
                            {file.title}
                            <span className="text-xs text-fg-subtle">
                              {' · '}
                              {DOCUMENT_KIND_LABELS[documentKind(file.mime_type, file.file_name)]}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-12 pb-16 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-14">
          {previews.length > 0 && !owned && (
            <section className="rounded-lg border border-primary-text/30 bg-primary-subtle/50 p-6">
              <h2 className="mb-1 flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary-text" aria-hidden />
                Extrait offert
              </h2>
              <p className="mb-5 text-sm text-fg-muted">
                Consultez un extrait avant d’acheter, sans créer de compte.
              </p>
              <SecureFileList files={previews} endpoint="/api/produits/fichiers" />
            </section>
          )}

          {product.description && (
            <section>
              <h2 className="mb-5 text-2xl">Présentation</h2>
              <RichContentView content={parseRichContent(product.description)} />
            </section>
          )}

          {faq.length > 0 && (
            <section>
              <h2 className="mb-5 text-2xl">Questions fréquentes</h2>
              <Accordion items={faq} />
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="border-t border-line bg-canvas-subtle py-16">
          <div className="container-page">
            <h2 className="mb-6 text-2xl">Vous aimerez aussi</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
