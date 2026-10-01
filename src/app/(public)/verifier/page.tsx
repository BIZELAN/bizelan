import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'

import { VerifyForm } from '@/components/public/verify-form'

export const metadata: Metadata = {
  title: 'Vérifier un certificat',
  description: 'Vérifiez l’authenticité d’un certificat délivré à la fin d’une formation.',
}

export default function VerifyIndexPage() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-primary-text" aria-hidden />
        <h1 className="mt-4 text-3xl">Vérifier un certificat</h1>
        <p className="mt-3 text-fg-muted">
          Saisissez le numéro inscrit sur le certificat, par exemple BZ-CERT-1A2B3C4D5E.
        </p>
        <div className="mt-8 text-left">
          <VerifyForm />
        </div>
      </div>
    </div>
  )
}
