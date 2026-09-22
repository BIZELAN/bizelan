import type { Metadata } from 'next'
import { Markdown } from '@/components/ui/markdown'
import { getSiteSettings } from '@/lib/queries'

export const revalidate = 300

export const metadata: Metadata = { title: 'Mentions légales' }

export default async function LegalPage() {
  const settings = await getSiteSettings()

  return (
    <div className="container-page py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl">Mentions légales</h1>
        {settings.legal_notice ? (
          <Markdown content={settings.legal_notice} />
        ) : (
          <div className="prose-bizelan">
            <p>
              Ce site est édité par <strong>{settings.site_name}</strong>
              {settings.address ? `, ${settings.address}` : ''}.
            </p>
            {settings.email && (
              <p>
                Contact : <a href={`mailto:${settings.email}`}>{settings.email}</a>
                {settings.phone ? ` — ${settings.phone}` : ''}
              </p>
            )}
            <p className="text-fg-subtle">
              Le contenu complet des mentions légales se renseigne depuis l’espace
              d’administration, dans Paramètres → Textes légaux.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
