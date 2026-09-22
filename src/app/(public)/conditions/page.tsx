import type { Metadata } from 'next'
import { Markdown } from '@/components/ui/markdown'
import { getSiteSettings } from '@/lib/queries'

export const revalidate = 300

export const metadata: Metadata = { title: 'Conditions générales de vente' }

export default async function TermsPage() {
  const settings = await getSiteSettings()

  return (
    <div className="container-page py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl">Conditions générales de vente</h1>
        {settings.terms ? (
          <Markdown content={settings.terms} />
        ) : (
          <p className="text-fg-subtle">
            Le texte des conditions générales se renseigne depuis l’espace d’administration, dans
            Paramètres → Textes légaux.
          </p>
        )}
      </div>
    </div>
  )
}
