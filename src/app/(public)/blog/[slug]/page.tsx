import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { RichContentView } from '@/components/ui/rich-content'
import { parseRichContent } from '@/lib/rich-content'
import { PostCard } from '@/components/public/cards'
import { Glow } from '@/components/ui/surface'
import { Section, SectionHeader } from '@/components/ui/section'
import { getPostBySlug, getPublishedPosts } from '@/lib/queries'
import { formatDate, truncate } from '@/lib/utils'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Article introuvable' }

  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? truncate(post.excerpt, 160),
    openGraph: {
      type: 'article',
      title: post.seo_title ?? post.title,
      description: post.seo_description ?? truncate(post.excerpt, 160),
      publishedTime: post.published_at ?? undefined,
      images: post.cover_url ? [post.cover_url] : [],
    },
  }
}

/**
 * Article de blog.
 *
 * Seule page du site à conserver un fond clair, et uniquement pour le corps :
 * un texte long se lit mieux en noir sur blanc. Le reste de la page —
 * en-tête, image, articles liés — suit le système sombre, si bien que la zone
 * claire se lit comme une feuille posée sur la page et non comme une rupture.
 */
export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post || post.status !== 'published') notFound()

  const related = (await getPublishedPosts({ limit: 4 })).filter((p) => p.id !== post.id).slice(0, 3)

  return (
    <>
      <article>
        <header className="relative overflow-hidden bg-surface-950">
          <Glow tone="brand" />
          <div className="container-page relative pb-16 pt-10 sm:pb-20">
            <Link
              href="/blog"
              className="mb-8 inline-flex items-center gap-1.5 text-body font-medium text-onDark-md transition-colors hover:text-brand-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Tous les articles
            </Link>
            <div className="max-w-3xl">
              <p className="text-meta text-onDark-lo">
                {formatDate(post.published_at)} · {post.reading_minutes} min de lecture
              </p>
              <h1 className="mt-3 text-h1 text-onDark-hi sm:text-display">{post.title}</h1>
              {post.excerpt && (
                <p className="mt-5 text-body-lg text-onDark-md">{post.excerpt}</p>
              )}
            </div>
          </div>
        </header>

        {/* L'image chevauche la frontière sombre / claire : elle coud les deux
            zones au lieu de les laisser se heurter. */}
        <div className="relative bg-surface-950">
          <div className="absolute inset-x-0 bottom-0 top-1/2 bg-surface-900" aria-hidden />
          {post.cover_url && (
            <div className="container-page relative">
              <img
                src={post.cover_url}
                alt=""
                className="mx-auto max-w-4xl rounded-panel object-cover shadow-dark-lg ring-1 ring-surface-700"
              />
            </div>
          )}
        </div>

        <div className="bg-surface-900 pb-20 pt-14">
          <div className="container-page">
            <div className="mx-auto max-w-4xl rounded-panel bg-white px-6 py-12 shadow-dark-lg sm:px-12 sm:py-16">
              <div className="mx-auto max-w-reading">
                <RichContentView content={parseRichContent(post.content)} tone="light" />
              </div>
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <Section tone="base">
          <div className="container-page">
            <SectionHeader eyebrow="Pour aller plus loin" title="À lire aussi" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </Section>
      )}
    </>
  )
}
