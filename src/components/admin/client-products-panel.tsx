'use client'

import { useActionState } from 'react'
import { Package } from 'lucide-react'

import { grantProductAccess, setProductAccess, type ProductResult } from '@/app/actions/products'
import { ActionButton, ActionFeedback, SaveButton } from '@/components/admin/form-bits'
import { Field, Select } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'

export interface ProductAccessRow {
  id: string
  productId: string
  productTitle: string
  state: string
  source: string
}

/** Produits de la boutique possédés par un client : offrir, retirer, rétablir. */
export function ClientProductsPanel({
  userId,
  purchases,
  products,
}: {
  userId: string
  purchases: ProductAccessRow[]
  products: { id: string; title: string }[]
}) {
  const [state, action] = useActionState<ProductResult | null, FormData>(grantProductAccess, null)
  const owned = new Set(purchases.map((p) => p.productId))
  const available = products.filter((p) => !owned.has(p.id))

  if (purchases.length === 0 && products.length === 0) return null

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Package className="h-5 w-5 text-primary-text" aria-hidden />
        Produits de la boutique
      </h2>

      <ActionFeedback state={state} />

      {purchases.length > 0 && (
        <ul className="mb-5 divide-y divide-line">
          {purchases.map((purchase) => (
            <li key={purchase.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-fg">{purchase.productTitle}</span>
                <span className="block text-xs text-fg-subtle">
                  {purchase.source === 'admin_grant'
                    ? 'Offert'
                    : purchase.source === 'free'
                      ? 'Gratuit'
                      : 'Achat'}
                </span>
              </span>
              {purchase.state === 'revoked' ? (
                <>
                  <Badge tone="danger">Retiré</Badge>
                  <ActionButton action={setProductAccess.bind(null, purchase.id, userId, 'active')}>
                    Rétablir
                  </ActionButton>
                </>
              ) : (
                <ActionButton
                  action={setProductAccess.bind(null, purchase.id, userId, 'revoked')}
                  confirmText={`Retirer l’accès à « ${purchase.productTitle} » ?`}
                >
                  Retirer l’accès
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <form action={action} className="flex flex-wrap items-end gap-3 border-t border-line pt-5">
          <input type="hidden" name="user_id" value={userId} />
          <Field label="Offrir un produit" className="min-w-56 flex-1">
            <Select name="product_id" required defaultValue="">
              <option value="" disabled>
                Choisir un produit…
              </option>
              {available.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </Select>
          </Field>
          <SaveButton label="Offrir" />
        </form>
      )}
    </section>
  )
}
