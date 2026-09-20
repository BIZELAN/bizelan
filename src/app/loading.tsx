export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-surface-700 border-t-brand-400" />
        <span className="text-body text-onDark-lo">Chargement…</span>
      </div>
    </div>
  )
}
