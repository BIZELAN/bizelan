import type { Metadata } from 'next'
import { Markdown } from '@/components/ui/markdown'
import { getSiteSettings } from '@/lib/queries'

export const revalidate = 300

export const metadata: Metadata = { title: 'Politique de confidentialité' }

export default async function PrivacyPage() {
  const settings = await getSiteSettings()

  return (
    <div className="container-page py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl">Politique de confidentialité</h1>
        {settings.privacy_policy ? (
          <Markdown content={settings.privacy_policy} />
        ) : (
          <p className="text-fg-subtle">
            Le texte de la politique de confidentialité se renseigne depuis l’espace
            d’administration, dans Paramètres → Textes légaux.
          </p>
        )}
      </div>
    </div>
  )
}
