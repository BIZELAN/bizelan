import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { PostForm } from '@/components/admin/post-form'
import { getBlockData } from '@/lib/queries'
import type { Category, Post } from '@/lib/types'

export const metadata: Metadata = { title: 'Modifier l’article' }
export const dynamic = 'force-dynamic'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: post }, { data: categories }, previewData] = await Promise.all([
    supabase.from('bz_posts').select('*').eq('id', id).maybeSingle<Post>(),
    supabase.from('categories').select('*').eq('kind', 'post').order('position'),
    getBlockData(),
  ])

  if (!post) notFound()

  return (
    <>
      <PageHeader title={post.title} backHref="/admin/blog" backLabel="Blog" />
      <div className="max-w-6xl">
        <PostForm post={post} categories={(categories as Category[]) ?? []} previewData={previewData} />
      </div>
    </>
  )
}
