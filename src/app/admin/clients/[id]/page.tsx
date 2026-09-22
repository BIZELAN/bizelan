import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mail, MapPin, Phone } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import { PageHeader, Table, Td, Th } from '@/components/admin/shell'
import { Badge, ORDER_STATUS_LABELS, StatusBadge } from '@/components/ui/badge'
import { EmptyState, ProgressBar } from '@/components/ui/misc'
import { ClientAccessPanel } from '@/components/admin/client-access-panel'
import { formatDate, formatDateTime, formatPrice } from '@/lib/utils'
import type { Course, Enrollment, Order, Profile } from '@/lib/types'

export const metadata: Metadata = { title: 'Fiche client' }
export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await requireAdmin()
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('bz_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle<Profile>()

  if (!profile) notFound()

  const [{ data: enrollments }, { data: orders }, { data: courses }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('*, course:courses(id, title, slug)')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('orders').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    supabase.from('courses').select('id, title').order('title'),
  ])

  const enrollmentList = (enrollments as (Enrollment & { course: Course })[]) ?? []
  const orderList = (orders as Order[]) ?? []
  const totalSpent = orderList
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + o.total_cents, 0)

  return (
    <>
      <PageHeader
        title={profile.full_name ?? profile.email}
        description={`Client depuis le ${formatDate(profile.created_at)}`}
        backHref="/admin/clients"
        backLabel="Clients"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <ClientAccessPanel
            userId={profile.id}
            enrollments={enrollmentList.map((e) => ({
              id: e.id,
              courseTitle: e.course?.title ?? 'Formation supprimée',
              state: e.state,
              progress: e.progress_percent,
              source: e.source,
            }))}
            courses={courses ?? []}
          />

          <section>
            <h2 className="mb-4 text-lg font-semibold">Progression</h2>
            {enrollmentList.length === 0 ? (
              <EmptyState title="Aucune formation suivie" />
            ) : (
              <div className="space-y-3">
                {enrollmentList.map((e) => (
                  <div key={e.id} className="rounded-lg border border-line bg-surface p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-medium text-fg">{e.course?.title}</span>
                      <Badge tone={e.state === 'revoked' ? 'danger' : 'primary'}>
                        {e.state === 'revoked'
                          ? 'Accès retiré'
                          : e.state === 'completed'
                            ? 'Terminée'
                            : 'En cours'}
                      </Badge>
                    </div>
                    <ProgressBar value={e.progress_percent} showLabel />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Commandes</h2>
            {orderList.length === 0 ? (
              <EmptyState title="Aucune commande" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Référence</Th>
                    <Th>Montant</Th>
                    <Th>Statut</Th>
                    <Th>Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {orderList.map((order) => (
                    <tr key={order.id} className="hover:bg-surface">
                      <Td>
                        <Link
                          href={`/admin/commandes/${order.id}`}
                          className="font-mono text-xs font-semibold text-primary-text hover:underline"
                        >
                          {order.reference}
                        </Link>
                      </Td>
                      <Td className="tabular-nums">{formatPrice(order.total_cents, order.currency)}</Td>
                      <Td>
                        <StatusBadge status={order.status} map={ORDER_STATUS_LABELS} />
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-fg-subtle">
                        {formatDateTime(order.created_at)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold">Coordonnées</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                <a href={`mailto:${profile.email}`} className="break-all text-primary-text hover:underline">
                  {profile.email}
                </a>
              </li>
              {profile.phone && (
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                  <a
                    href={`tel:${profile.phone.replace(/\s/g, '')}`}
                    className="text-primary-text hover:underline"
                  >
                    {profile.phone}
                  </a>
                </li>
              )}
              {profile.city && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                  <span className="text-fg">{profile.city}</span>
                </li>
              )}
            </ul>

            {profile.activity && (
              <p className="mt-4 border-t border-line pt-4 text-sm">
                <span className="block text-xs font-medium text-fg-subtle">Activité</span>
                <span className="text-fg">{profile.activity}</span>
              </p>
            )}
          </section>

          <section className="rounded-lg border border-line bg-surface p-6">
            <h2 className="mb-3 text-lg font-semibold">Valeur client</h2>
            <p className="text-2xl font-bold tabular-nums text-primary-text">
              {formatPrice(totalSpent)}
            </p>
            <p className="mt-1 text-xs text-fg-subtle">
              {orderList.filter((o) => o.status === 'paid').length} commande(s) payée(s)
            </p>
          </section>

          {admin.profile.role === 'admin' && (
            <section className="rounded-lg border border-line bg-surface p-6">
              <h2 className="mb-3 text-lg font-semibold">Rôle</h2>
              <p className="mb-3 text-sm text-fg-muted">
                Rôle actuel : <strong className="capitalize">{profile.role}</strong>
              </p>
              <p className="text-xs leading-relaxed text-fg-subtle">
                Un éditeur peut gérer le contenu. Un administrateur peut en plus gérer les rôles et
                les paramètres. Modifiez le rôle depuis la liste des clients.
              </p>
            </section>
          )}
        </aside>
      </div>
    </>
  )
}
