import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink, Newspaper, Plus } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, Table, Td, Th } from '@/components/admin/shell'
import { ButtonLink } from '@/components/ui/button'
import { CONTENT_STATUS_LABELS, StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { DeleteButton } from '@/components/admin/form-bits'
import { deletePost } from '@/app/actions/admin'
import { formatDate } from '@/lib/utils'
import type { Post } from '@/lib/types'

export const metadata: Metadata = { title: 'Blog' }
export const dynamic = 'force-dynamic'

export default async function AdminBlogPage() {
  const supabase = createAdminClient()
  const { data } = await supabase.from('bz_posts').select('*').order('created_at', { ascending: false })
  const posts = (data as Post[]) ?? []

  return (
    <>
      <PageHeader
        title="Blog"
        description="Vos articles : un bon levier pour être trouvé sur Google."
        actions={
          <ButtonLink href="/admin/blog/nouveau">
            <Plus className="h-4 w-4" aria-hidden />
            Nouvel article
          </ButtonLink>
        }
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Aucun article"
          description="Publiez des analyses pour attirer des visiteurs et asseoir votre expertise."
          action={
            <ButtonLink href="/admin/blog/nouveau">
              <Plus className="h-4 w-4" aria-hidden />
              Nouvel article
            </ButtonLink>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Article</Th>
              <Th>Statut</Th>
              <Th>Publié le</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-surface">
                <Td>
                  <Link
                    href={`/admin/blog/${post.id}`}
                    className="block font-medium text-fg hover:text-primary-text"
                  >
                    {post.title}
                  </Link>
                  <span className="font-mono text-xs text-fg-subtle">/blog/{post.slug}</span>
                </Td>
                <Td>
                  <StatusBadge status={post.status} map={CONTENT_STATUS_LABELS} />
                </Td>
                <Td className="whitespace-nowrap text-xs text-fg-subtle">
                  {post.published_at ? formatDate(post.published_at) : '—'}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    {post.status === 'published' && (
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="rounded-md p-2 text-fg-subtle transition-colors hover:bg-canvas-subtle hover:text-primary-text"
                        title="Voir l’article"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </Link>
                    )}
                    <DeleteButton
                      action={deletePost.bind(null, post.id)}
                      label=""
                      variant="ghost"
                      confirmText={`Supprimer « ${post.title} » ?`}
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
