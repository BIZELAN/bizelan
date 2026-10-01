import { BookOpen, Boxes, FileSpreadsheet, Headphones, Package, Video } from 'lucide-react'
import type { ProductKind } from '@/lib/types'

/**
 * Natures de produits digitaux proposées par la boutique.
 *
 * Le libellé au singulier sert sur la fiche, le pluriel dans les filtres du
 * catalogue. L'icône n'est qu'un repère visuel : elle remplace la couverture
 * quand l'administration n'en a pas fourni.
 */
export const PRODUCT_KINDS: Record<
  ProductKind,
  { label: string; plural: string; icon: typeof BookOpen; hint: string }
> = {
  ebook: {
    label: 'E-book',
    plural: 'E-books',
    icon: BookOpen,
    hint: 'Guide, livre blanc ou manuel en PDF ou EPUB.',
  },
  video: {
    label: 'Pack vidéo',
    plural: 'Vidéos',
    icon: Video,
    hint: 'Catalogue de vidéos à regarder en ligne ou à télécharger.',
  },
  template: {
    label: 'Modèle',
    plural: 'Modèles',
    icon: FileSpreadsheet,
    hint: 'Tableurs, modèles Word ou PowerPoint prêts à remplir.',
  },
  audio: {
    label: 'Audio',
    plural: 'Audios',
    icon: Headphones,
    hint: 'Podcasts, formations audio, méditations.',
  },
  bundle: {
    label: 'Pack',
    plural: 'Packs',
    icon: Boxes,
    hint: 'Plusieurs ressources réunies à prix groupé.',
  },
  other: {
    label: 'Produit digital',
    plural: 'Autres',
    icon: Package,
    hint: 'Tout autre fichier à télécharger.',
  },
}

export const PRODUCT_KIND_ORDER: ProductKind[] = ['ebook', 'video', 'template', 'audio', 'bundle', 'other']

export function isProductKind(value: string | null | undefined): value is ProductKind {
  return Boolean(value && value in PRODUCT_KINDS)
}
