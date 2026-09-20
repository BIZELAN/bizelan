import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { PostForm } from '@/components/admin/post-form'
import type { Category } from '@/lib/types'

export const metadata: Metadata = { title: 'Nouvel article' }
export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  const supabase = createAdminClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('kind', 'post')
    .order('position')

  return (
    <>
      <PageHeader title="Nouvel article" backHref="/admin/blog" backLabel="Blog" />
      <div className="max-w-3xl">
        <PostForm post={null} categories={(categories as Category[]) ?? []} />
      </div>
    </>
  )
}
