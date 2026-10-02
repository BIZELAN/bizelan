/**
 * Chargement d'un écran de l'espace membre : la navigation latérale reste en
 * place, seul le contenu affiche sa silhouette.
 */
export default function AccountLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-6">
      <span className="sr-only">Chargement…</span>
      <div>
        <div className="h-7 w-56 rounded bg-line" />
        <div className="mt-2.5 h-4 w-80 max-w-full rounded bg-line/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-md bg-line" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-line" />
                <div className="h-3 w-1/2 rounded bg-line/70" />
              </div>
            </div>
            <div className="mt-5 h-2 w-full rounded-pill bg-line/70" />
          </div>
        ))}
      </div>
    </div>
  )
}
