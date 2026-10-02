import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { CheckoutShell } from '@/components/checkout/checkout-shell'
import { getProductBySlug, getSiteSettings, hasProductAccess } from '@/lib/queries'
import { getCurrentUser } from '@/lib/auth'
import { PRODUCT_KINDS } from '@/lib/products'
import { asArray, payablePrice } from '@/lib/utils'
import { offerState } from '@/lib/scarcity'

export const metadata: Metadata = { title: 'Commande', robots: { index: false } }

export default async function ProductCheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product || product.status !== 'published') notFound()

  const user = await getCurrentUser()
  if (!user) {
    redirect(`/connexion?suivant=${encodeURIComponent(`/commande/produit/${slug}`)}`)
  }

  // Déjà acquis : on renvoie vers les fichiers plutôt que de refacturer.
  if (await hasProductAccess(user.id, product.id)) {
    redirect(`/compte/produits#${slug}`)
  }

  // Complet ou délai écoulé : la page du produit explique pourquoi.
  if (!offerState(product).purchasable) redirect(`/boutique/${slug}`)

  const settings = await getSiteSettings()
  const kind = PRODUCT_KINDS[product.kind] ?? PRODUCT_KINDS.other

  return (
    <CheckoutShell
      backHref={`/boutique/${slug}`}
      backLabel="Retour au produit"
      coverUrl={product.cover_url}
      subtitle={product.subtitle ?? kind.label}
      accessLabel={product.delivery_label ?? 'Accès immédiat depuis votre espace'}
      highlights={asArray<string>(product.highlights)}
      onlineEnabled={settings.payments_online_enabled}
      form={{
        itemType: 'product',
        slug: product.slug,
        title: product.title,
        priceCents: payablePrice(product),
        currency: product.currency,
        customerName: user.profile.full_name ?? '',
        customerEmail: user.email,
        customerPhone: user.profile.phone ?? '',
        onlineEnabled: settings.payments_online_enabled,
        transferEnabled: settings.payments_transfer_enabled,
        transferInstructions: settings.bank_transfer_instructions,
      }}
    />
  )
}
