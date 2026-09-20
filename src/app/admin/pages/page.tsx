import type { Metadata } from 'next'
import Link from 'next/link'
import { Copy, ExternalLink, FileText, Home, Plus } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, Table, Td, Th } from '@/components/admin/shell'
import { ButtonLink } from '@/components/ui/button'
import { Badge, CONTENT_STATUS_LABELS, StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { ActionButton, DeleteButton } from '@/components/admin/form-bits'
import { deletePage, duplicatePage } from '@/app/actions/admin'
import { formatDateTime } from '@/lib/utils'
import { parseBlocks } from '@/lib/blocks'
import type { Page } from '@/lib/types'

export const metadata: Metadata = { title: 'Pages de vente' }
export const dynamic = 'force-dynamic'

export default async function AdminPagesPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('pages')
    .select('*')
    .order('is_home', { ascending: false })
    .order('updated_at', { ascending: false })

  const pages = (data as Page[]) ?? []

  return (
    <>
      <PageHeader
        title="Pages de vente"
        description="Composez vos landing pages bloc par bloc, sans toucher au code."
        actions={
          <ButtonLink href="/admin/pages/nouvelle">
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle page
          </ButtonLink>
        }
      />

      {pages.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucune page"
          description="Créez une page de vente pour présenter une formation ou une offre."
          action={
            <ButtonLink href="/admin/pages/nouvelle">
              <Plus className="h-4 w-4" aria-hidden />
              Nouvelle page
            </ButtonLink>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Page</Th>
              <Th>Blocs</Th>
              <Th>Statut</Th>
              <Th>Modifiée</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-surface-800">
                <Td>
                  <Link
                    href={`/admin/pages/${page.id}`}
                    className="block font-medium text-onDark-hi hover:text-brand-300"
                  >
                    {page.title}
                  </Link>
                  <span className="flex items-center gap-1.5 font-mono text-xs text-onDark-lo">
                    /{page.slug}
                    {page.is_home && (
                      <Badge tone="brand" className="font-sans">
                        <Home className="h-3 w-3" aria-hidden />
                        Accueil
                      </Badge>
                    )}
                  </span>
                </Td>
                <Td className="tabular-nums text-onDark-md">{parseBlocks(page.blocks).length}</Td>
                <Td>
                  <StatusBadge status={page.status} map={CONTENT_STATUS_LABELS} />
                </Td>
                <Td className="whitespace-nowrap text-xs text-onDark-lo">
                  {formatDateTime(page.updated_at)}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    {page.status === 'published' && (
                      <Link
                        href={page.is_home ? '/' : `/${page.slug}`}
                        target="_blank"
                        className="rounded-control p-2 text-onDark-lo transition-colors hover:bg-surface-700 hover:text-brand-300"
                        title="Voir la page"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </Link>
                    )}
                    <ActionButton action={duplicatePage.bind(null, page.id)} variant="ghost">
                      <Copy className="h-4 w-4" aria-hidden />
                    </ActionButton>
                    <DeleteButton
                      action={deletePage.bind(null, page.id)}
                      label=""
                      variant="ghost"
                      confirmText={`Supprimer la page « ${page.title} » ?`}
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
