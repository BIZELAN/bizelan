/**
 * Chargement d'une page publique.
 *
 * Placé sous le gabarit public, il remplace le seul contenu : l'en-tête et le
 * pied restent affichés pendant que la page suivante arrive. Sans lui, c'est
 * l'écran de chargement racine qui prenait la place de TOUTE la page, menu
 * compris — un aller-retour visuel à chaque clic.
 */
export default function PublicLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Chargement…</span>
      <div className="bg-canvas-subtle">
        <div className="container-page py-16 sm:py-20">
          <div className="h-4 w-32 rounded bg-line" />
          <div className="mt-5 h-10 w-full max-w-2xl rounded bg-line" />
          <div className="mt-3 h-10 w-full max-w-xl rounded bg-line" />
          <div className="mt-6 h-5 w-full max-w-lg rounded bg-line/70" />
        </div>
      </div>
      <div className="container-page grid gap-6 py-14 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="aspect-[16/9] bg-line/60" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 rounded bg-line" />
              <div className="h-4 w-full rounded bg-line/70" />
              <div className="h-4 w-2/3 rounded bg-line/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
