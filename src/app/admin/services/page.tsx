import type { Metadata } from 'next'
import Link from 'next/link'
import { Briefcase, ExternalLink, Plus } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, Table, Td, Th } from '@/components/admin/shell'
import { ButtonLink } from '@/components/ui/button'
import { CONTENT_STATUS_LABELS, StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { DeleteButton } from '@/components/admin/form-bits'
import { deleteService } from '@/app/actions/admin'
import { formatPrice } from '@/lib/utils'
import type { Service } from '@/lib/types'

export const metadata: Metadata = { title: 'Services' }
export const dynamic = 'force-dynamic'

export default async function AdminServicesPage() {
  const supabase = createAdminClient()
  const { data } = await supabase.from('services').select('*').order('position')
  const services = (data as Service[]) ?? []

  return (
    <>
      <PageHeader
        title="Services"
        description="Vos prestations de conseil et d’accompagnement."
        actions={
          <ButtonLink href="/admin/services/nouveau">
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau service
          </ButtonLink>
        }
      />

      {services.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Aucun service"
          description="Présentez vos prestations pour recevoir des demandes de devis."
          action={
            <ButtonLink href="/admin/services/nouveau">
              <Plus className="h-4 w-4" aria-hidden />
              Nouveau service
            </ButtonLink>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Service</Th>
              <Th>Tarif</Th>
              <Th>Statut</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="hover:bg-surface">
                <Td>
                  <Link
                    href={`/admin/services/${service.id}`}
                    className="block font-medium text-fg hover:text-primary-text"
                  >
                    {service.title}
                  </Link>
                  <span className="font-mono text-xs text-fg-subtle">/services/{service.slug}</span>
                </Td>
                <Td className="whitespace-nowrap text-fg-muted">
                  {service.pricing === 'quote'
                    ? (service.price_label ?? 'Sur devis')
                    : formatPrice(service.price_cents, service.currency)}
                </Td>
                <Td>
                  <StatusBadge status={service.status} map={CONTENT_STATUS_LABELS} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    {service.status === 'published' && (
                      <Link
                        href={`/services/${service.slug}`}
                        target="_blank"
                        className="rounded-md p-2 text-fg-subtle transition-colors hover:bg-canvas-subtle hover:text-primary-text"
                        title="Voir sur le site"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </Link>
                    )}
                    <DeleteButton
                      action={deleteService.bind(null, service.id)}
                      label=""
                      variant="ghost"
                      confirmText={`Supprimer « ${service.title} » ?`}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
