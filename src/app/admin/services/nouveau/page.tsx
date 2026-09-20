import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/shell'
import { ServiceForm } from '@/components/admin/service-form'

export const metadata: Metadata = { title: 'Nouveau service' }

export default function NewServicePage() {
  return (
    <>
      <PageHeader
        title="Nouveau service"
        backHref="/admin/services"
        backLabel="Services"
      />
      <div className="max-w-3xl">
        <ServiceForm service={null} />
      </div>
    </>
  )
}
