import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { ServiceForm } from '@/components/admin/service-form'
import type { Service } from '@/lib/types'

export const metadata: Metadata = { title: 'Modifier le service' }
export const dynamic = 'force-dynamic'

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .maybeSingle<Service>()

  if (!service) notFound()

  return (
    <>
      <PageHeader title={service.title} backHref="/admin/services" backLabel="Services" />
      <div className="max-w-3xl">
        <ServiceForm service={service} />
      </div>
    </>
  )
}
