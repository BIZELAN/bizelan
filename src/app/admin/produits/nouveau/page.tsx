import type { Metadata } from 'next'

import { PageHeader } from '@/components/admin/shell'
import { ProductForm } from '@/components/admin/product-form'

export const metadata: Metadata = { title: 'Nouveau produit' }

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        title="Nouveau produit"
        description="Décrivez le produit, puis ajoutez ses fichiers à l’étape suivante."
        backHref="/admin/produits"
        backLabel="Boutique"
      />
      <div className="max-w-3xl">
        <ProductForm product={null} />
      </div>
    </>
  )
}
