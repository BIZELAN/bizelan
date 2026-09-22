import { Skeleton, TableSkeleton } from '@/components/admin/shell'

/**
 * Silhouette affichée pendant le chargement d'un écran d'administration.
 *
 * Les blocs sont un cran plus clairs que la carte qui les porte : la version
 * précédente les dessinait dans la teinte même des cartes, ce qui les rendait
 * invisibles une fois le fond passé en sombre.
 */
export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Chargement…</span>

      <div className="mb-7">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2.5 h-4 w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-line bg-surface p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <TableSkeleton rows={6} />
      </div>
    </div>
  )
}
