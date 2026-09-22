import type { Metadata } from 'next'
import Link from 'next/link'
import { Users } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, Table, Td, Th } from '@/components/admin/shell'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { Input } from '@/components/ui/field'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/lib/types'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, { label: string; tone: 'neutral' | 'primary' | 'accent' }> = {
  client: { label: 'Client', tone: 'neutral' },
  editor: { label: 'Éditeur', tone: 'primary' },
  admin: { label: 'Administrateur', tone: 'accent' },
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = createAdminClient()

  let query = supabase
    .from('bz_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)

  const [{ data }, { data: enrollments }] = await Promise.all([
    query,
    supabase.from('enrollments').select('user_id').in('state', ['active', 'completed']),
  ])

  const profiles = (data as Profile[]) ?? []
  const counts = new Map<string, number>()
  for (const e of enrollments ?? []) {
    counts.set(e.user_id, (counts.get(e.user_id) ?? 0) + 1)
  }

  return (
    <>
      <PageHeader title="Clients" description="Tous les comptes créés sur le site." />

      <form className="mb-5 max-w-sm">
        <Input name="q" defaultValue={q ?? ''} placeholder="Rechercher un nom ou un e-mail…" />
      </form>

      {profiles.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? 'Aucun résultat' : 'Aucun client'}
          description={q ? 'Essayez un autre terme de recherche.' : undefined}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Client</Th>
              <Th>Téléphone</Th>
              <Th>Formations</Th>
              <Th>Rôle</Th>
              <Th>Inscrit le</Th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const role = ROLE_LABELS[profile.role] ?? ROLE_LABELS.client
              return (
                <tr key={profile.id} className="hover:bg-surface">
                  <Td>
                    <Link
                      href={`/admin/clients/${profile.id}`}
                      className="block font-medium text-fg hover:text-primary-text"
                    >
                      {profile.full_name ?? '—'}
                    </Link>
                    <span className="block text-xs text-fg-subtle">{profile.email}</span>
                  </Td>
                  <Td className="text-fg-muted">{profile.phone ?? '—'}</Td>
                  <Td className="tabular-nums text-fg-muted">{counts.get(profile.id) ?? 0}</Td>
                  <Td>
                    <Badge tone={role.tone}>{role.label}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-fg-subtle">
                    {formatDate(profile.created_at)}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </>
  )
}
