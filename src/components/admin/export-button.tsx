import { Download } from 'lucide-react'

/**
 * Lien de téléchargement d'un export CSV.
 *
 * Un simple lien : la route renvoie le fichier avec l'en-tête de
 * téléchargement, le navigateur fait le reste — rien à gérer côté client.
 */
export function ExportButton({
  type,
  label = 'Exporter (CSV)',
}: {
  type: 'commandes' | 'clients' | 'abonnes' | 'ventes'
  label?: string
}) {
  return (
    <a
      href={`/api/admin/export/${type}`}
      className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-line-control px-4 text-base font-medium text-fg transition-colors duration-fast hover:bg-canvas-subtle"
    >
      <Download className="h-4 w-4" aria-hidden />
      {label}
    </a>
  )
}
