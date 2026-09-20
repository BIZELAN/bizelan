import type { Metadata } from 'next'
import { Newspaper } from 'lucide-react'
import { PostCard } from '@/components/public/cards'
import { EmptyState } from '@/components/ui/misc'
import { getPublishedPosts } from '@/lib/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Analyses et conseils pour structurer, chiffrer et financer votre activité.',
}

export default async function BlogPage() {
  const posts = await getPublishedPosts()
  const [featured, ...rest] = posts

  return (
    <>
      <section className="border-b border-surface-700 bg-surface-900">
        <div className="container-page py-16 sm:py-20">
          <p className="eyebrow mb-3">Le blog</p>
          <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl">
            Nos analyses pour structurer votre activité
          </h1>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          {posts.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="Aucun article publié pour le moment"
              description="Les articles apparaîtront ici dès leur publication depuis l’espace d’administration."
            />
          ) : (
            <div className="space-y-10">
              {featured && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <PostCard post={featured} />
                  {rest[0] && <PostCard post={rest[0]} />}
                </div>
              )}
              {rest.length > 1 && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.slice(1).map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
