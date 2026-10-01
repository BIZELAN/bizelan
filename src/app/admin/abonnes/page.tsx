import type { Metadata } from 'next'
import { Mail, MailX, UserPlus } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, StatCard, Table, Td, Th } from '@/components/admin/shell'
import { ExportButton } from '@/components/admin/export-button'
import { ActionButton, DeleteButton } from '@/components/admin/form-bits'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { Input } from '@/components/ui/field'
import { deleteSubscriber, setSubscriberStatus } from '@/app/actions/admin'
import { formatDate, sanitizeSearch } from '@/lib/utils'

export const metadata: Metadata = { title: 'Abonnés' }
export const dynamic = 'force-dynamic'

interface Subscriber {
  id: string
  email: string
  name: string | null
  source: string | null
  unsubscribed: boolean
  created_at: string
}

/**
 * Abonnés à la newsletter.
 *
 * Le formulaire d'inscription alimentait `newsletter_subscribers` depuis le
 * premier jour, mais aucun écran ne permettait de voir ces adresses ni de les
 * exporter : elles s'accumulaient sans servir.
 */
export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const search = sanitizeSearch(q)
  const supabase = createAdminClient()
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  let query = supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  if (search) query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)

  const [{ data }, { count: active }, { count: gone }, { count: recent }] = await Promise.all([
    query,
    supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('unsubscribed', false),
    supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('unsubscribed', true),
    supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthAgo),
  ])

  const list = (data as Subscriber[]) ?? []

  return (
    <>
      <PageHeader
        title="Abonnés"
        description="Les personnes inscrites à votre newsletter depuis le site."
        actions={<ExportButton type="abonnes" />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Abonnés actifs" value={active ?? 0} icon={Mail} tone="brand" />
        <StatCard label="Nouveaux (30 jours)" value={recent ?? 0} icon={UserPlus} tone="accent" />
        <StatCard label="Désinscrits" value={gone ?? 0} icon={MailX} />
      </div>

      <form className="mb-5 max-w-sm">
        <Input name="q" defaultValue={q ?? ''} placeholder="Rechercher une adresse ou un nom…" aria-label="Rechercher" />
      </form>

      {list.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={search ? 'Aucun résultat' : 'Aucun abonné pour le moment'}
          description={
            search
              ? 'Essayez un autre terme.'
              : 'Ajoutez un bloc « Appel à l’action » avec inscription sur vos pages pour collecter des adresses.'
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Adresse</Th>
              <Th>Source</Th>
              <Th>Inscrit le</Th>
              <Th>Statut</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <Td>
                  <a href={`mailto:${s.email}`} className="font-medium text-fg hover:text-primary-text">
                    {s.email}
                  </a>
                  {s.name && <span className="block text-xs text-fg-subtle">{s.name}</span>}
                </Td>
                <Td className="text-sm text-fg-muted">{s.source ?? '—'}</Td>
                <Td className="whitespace-nowrap text-xs text-fg-subtle">{formatDate(s.created_at)}</Td>
                <Td>
                  {s.unsubscribed ? <Badge tone="neutral">Désinscrit</Badge> : <Badge tone="success">Abonné</Badge>}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    <ActionButton
                      action={setSubscriberStatus.bind(null, s.id, !s.unsubscribed)}
                      variant="ghost"
                    >
                      {s.unsubscribed ? 'Réinscrire' : 'Désinscrire'}
                    </ActionButton>
                    <DeleteButton
                      action={deleteSubscriber.bind(null, s.id)}
                      label=""
                      variant="ghost"
                      confirmText={`Supprimer définitivement ${s.email} ? (droit à l’effacement)`}
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
