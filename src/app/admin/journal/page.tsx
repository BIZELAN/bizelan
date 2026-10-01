import type { Metadata } from 'next'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, Table, Td, Th } from '@/components/admin/shell'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { cn, formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Journal d’activité' }
export const dynamic = 'force-dynamic'

/** Libellés des actions tracées. Une action inconnue s'affiche telle quelle. */
const ACTIONS: Record<string, string> = {
  'course.created': 'Formation créée',
  'course.updated': 'Formation modifiée',
  'course.deleted': 'Formation supprimée',
  'course.duplicated': 'Formation dupliquée',
  'service.created': 'Service créé',
  'service.updated': 'Service modifié',
  'service.deleted': 'Service supprimé',
  'page.created': 'Page créée',
  'page.updated': 'Page modifiée',
  'page.deleted': 'Page supprimée',
  'page.restored': 'Page restaurée',
  'post.created': 'Article créé',
  'post.updated': 'Article modifié',
  'post.deleted': 'Article supprimé',
  'product.created': 'Produit créé',
  'product.updated': 'Produit modifié',
  'product.deleted': 'Produit supprimé',
  'product.duplicated': 'Produit dupliqué',
  'product.file_added': 'Fichier ajouté à un produit',
  'product.file_deleted': 'Fichier retiré d’un produit',
  'product.access_granted': 'Produit offert',
  'product.access_revoked': 'Accès produit retiré',
  'product.access_restored': 'Accès produit rétabli',
  'order.fulfilled': 'Commande payée',
  'order.status_changed': 'Statut de commande modifié',
  'order.amount_mismatch': 'Écart de montant détecté',
  'access.granted': 'Accès formation offert',
  'access.revoked': 'Accès formation retiré',
  'access.restored': 'Accès formation rétabli',
  'user.role_changed': 'Rôle modifié',
  'client.note_updated': 'Note client modifiée',
  'coupon.created': 'Code promo créé',
  'coupon.updated': 'Code promo modifié',
  'settings.updated': 'Paramètres modifiés',
  'settings.restored': 'Paramètres restaurés',
  'subscriber.deleted': 'Abonné supprimé',
  'export.downloaded': 'Export téléchargé',
  'followup.order': 'Relance paiement',
  'followup.learner': 'Relance apprenant',
  'followup.review': 'Demande d’avis',
}

const FILTERS = [
  { value: '', label: 'Tout' },
  { value: 'order', label: 'Commandes' },
  { value: 'course', label: 'Formations' },
  { value: 'product', label: 'Boutique' },
  { value: 'page', label: 'Pages' },
  { value: 'followup', label: 'Relances' },
  { value: 'access', label: 'Accès' },
]

/** Lien vers l'élément concerné, quand il a une page dans la console. */
function entityHref(entity: string | null, id: string | null): string | null {
  if (!id) return null
  switch (entity) {
    case 'order':
      return `/admin/commandes/${id}`
    case 'course':
      return `/admin/formations/${id}`
    case 'product':
      return `/admin/produits/${id}`
    case 'page':
      return `/admin/pages/${id}`
    case 'service':
      return `/admin/services/${id}`
    case 'post':
      return `/admin/blog/${id}`
    case 'profile':
      return `/admin/clients/${id}`
    default:
      return null
  }
}

function tone(action: string): 'danger' | 'success' | 'warning' | 'neutral' | 'primary' {
  if (action.endsWith('.deleted') || action.endsWith('revoked')) return 'danger'
  if (action === 'order.fulfilled') return 'success'
  if (action === 'order.amount_mismatch') return 'warning'
  if (action.startsWith('followup.')) return 'primary'
  return 'neutral'
}

/**
 * Journal d'activité.
 *
 * `activity_log` était alimenté depuis le premier jour sans qu'aucun écran ne
 * le montre. Il répond à « qui a changé ce prix ? », « quand cet accès a-t-il
 * été ouvert ? », « cette commande a-t-elle été relancée ? ».
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const filter = FILTERS.some((f) => f.value === type) ? (type ?? '') : ''
  const supabase = createAdminClient()

  let query = supabase
    .from('activity_log')
    .select('id, actor_id, action, entity, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  if (filter) query = query.like('action', `${filter}.%`)

  const { data } = await query
  const rows = (data ?? []) as {
    id: number
    actor_id: string | null
    action: string
    entity: string | null
    entity_id: string | null
    metadata: Record<string, unknown> | null
    created_at: string
  }[]

  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[]
  const { data: actors } = actorIds.length
    ? await supabase.from('bz_profiles').select('id, full_name, email').in('id', actorIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] }
  const actorName = new Map((actors ?? []).map((a) => [a.id, a.full_name ?? a.email]))

  return (
    <>
      <PageHeader
        title="Journal d’activité"
        description="Les 300 dernières actions : qui a fait quoi, et quand."
      />

      <nav aria-label="Filtrer" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/journal?type=${f.value}` : '/admin/journal'}
            aria-current={filter === f.value ? 'page' : undefined}
            className={cn(
              'rounded-pill px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors duration-fast',
              filter === f.value
                ? 'bg-primary-subtle text-primary-text ring-primary-text/30'
                : 'text-fg-muted ring-line hover:text-fg',
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune activité enregistrée" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Action</Th>
              <Th>Détail</Th>
              <Th>Par</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = entityHref(row.entity, row.entity_id)
              const meta = row.metadata ?? {}
              const detail =
                (meta.title as string) ||
                (meta.reference as string) ||
                (meta.code as string) ||
                (meta.slug as string) ||
                (meta.file as string) ||
                (meta.type as string) ||
                (meta.status as string) ||
                (meta.role as string) ||
                ''
              return (
                <tr key={row.id}>
                  <Td className="whitespace-nowrap text-xs text-fg-subtle">{formatDateTime(row.created_at)}</Td>
                  <Td>
                    <Badge tone={tone(row.action)}>{ACTIONS[row.action] ?? row.action}</Badge>
                  </Td>
                  <Td className="max-w-[28rem] text-sm text-fg-muted">
                    {href ? (
                      <Link href={href} className="hover:text-primary-text">
                        {detail || 'Voir'}
                      </Link>
                    ) : (
                      detail || '—'
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-sm text-fg-muted">
                    {row.actor_id ? (actorName.get(row.actor_id) ?? 'Compte supprimé') : 'Système'}
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
