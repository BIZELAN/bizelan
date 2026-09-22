import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl">Cette page n’existe pas</h1>
      <p className="mt-3 max-w-md text-onDark-md">
        Le lien est peut-être erroné, ou la page a été déplacée.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/">Retour à l’accueil</ButtonLink>
        <ButtonLink href="/formations" variant="outline">
          Voir les formations
        </ButtonLink>
      </div>
      <p className="mt-8 text-sm text-onDark-lo">
        Besoin d’aide ?{' '}
        <Link href="/contact" className="underline underline-offset-4 hover:text-primary">
          Contactez-nous
        </Link>
      </p>
    </div>
  )
}
