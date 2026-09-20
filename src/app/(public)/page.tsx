import type { Metadata } from 'next'

import { BlockRenderer } from '@/components/public/blocks/block-renderer'
import { HomeLanding } from '@/components/public/home-landing'
import { parseBlocks } from '@/lib/blocks'
import {
  getApprovedReviews,
  getHomePage,
  getPublishedCourses,
  getPublishedPosts,
  getPublishedServices,
  getSiteSettings,
} from '@/lib/queries'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getHomePage(), getSiteSettings()])
  return {
    title: page?.seo_title ?? settings.default_seo_title ?? settings.site_name,
    description: page?.seo_description ?? settings.default_seo_description ?? undefined,
  }
}

export default async function HomePage() {
  const page = await getHomePage()

  // Une page d'accueil composée dans l'admin prend toujours le dessus.
  if (page) {
    return <BlockRenderer blocks={parseBlocks(page.blocks)} />
  }

  // Repli : accueil généré automatiquement tant qu'aucune page n'est composée.
  const [courses, services, posts, reviews, settings] = await Promise.all([
    getPublishedCourses({ limit: 6 }),
    getPublishedServices(3),
    getPublishedPosts({ limit: 3 }),
    getApprovedReviews(undefined, 6),
    getSiteSettings(),
  ])

  return (
    <HomeLanding
      settings={settings}
      courses={courses}
      services={services}
      posts={posts}
      reviews={reviews}
    />
  )
}
