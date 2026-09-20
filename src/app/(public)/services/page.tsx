import type { Metadata } from 'next'
import { Briefcase } from 'lucide-react'
import { ServiceCard } from '@/components/public/cards'
import { EmptyState } from '@/components/ui/misc'
import { QuoteForm } from '@/components/public/quote-form'
import { getPublishedServices } from '@/lib/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Diagnostic organisationnel, accompagnement stratégique et montage de plan d’affaires : les prestations du cabinet BIZELAN.',
}

export default async function ServicesPage() {
  const services = await getPublishedServices()

  return (
    <>
      <section className="border-b border-surface-700 bg-surface-900">
        <div className="container-page py-16 sm:py-20">
          <p className="eyebrow mb-3">Conseil et accompagnement</p>
          <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl">
            Un accompagnement sur mesure, du diagnostic aux résultats
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-onDark-md">
            Nous combinons analyse profonde de la santé organisationnelle, diagnostic clair,
            solutions adaptées et suivi dans la durée.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          {services.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Briefcase}
              title="Aucun service publié pour le moment"
              description="Les prestations apparaîtront ici dès leur publication depuis l’espace d’administration."
            />
          )}
        </div>
      </section>

      <section className="section bg-surface-900">
        <div className="container-page">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl">Parlons de votre projet</h2>
            <p className="mt-4 text-lg leading-relaxed text-onDark-md">
              Décrivez-nous votre besoin : nous revenons vers vous avec une proposition adaptée.
            </p>
          </div>
          <div className="mx-auto max-w-2xl">
            <QuoteForm serviceId={null} serviceName={null} />
          </div>
        </div>
      </section>
    </>
  )
}
