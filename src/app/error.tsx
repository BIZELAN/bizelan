'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[erreur]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-900 px-6 text-center">
      <TriangleAlert className="h-12 w-12 text-amber-500" aria-hidden />
      <h1 className="mt-5 text-2xl">Une erreur est survenue</h1>
      <p className="mt-3 max-w-md text-onDark-md">
        Le problème a été enregistré. Réessayez dans un instant — si cela persiste, contactez-nous.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Réessayer
        </Button>
        <ButtonLink href="/" variant="outline">
          Retour à l’accueil
        </ButtonLink>
      </div>

      {error.digest && (
        <p className="mt-8 font-mono text-xs text-onDark-lo">Référence : {error.digest}</p>
      )}

      <p className="mt-4 text-sm text-onDark-lo">
        <Link href="/contact" className="underline underline-offset-4 hover:text-brand-300">
          Nous signaler le problème
        </Link>
      </p>
    </div>
  )
}
