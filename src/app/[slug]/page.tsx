import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BlockRenderer } from '@/components/public/blocks/block-renderer'
import { SiteFooter } from '@/components/public/site-footer'
import { SiteHeader } from '@/components/public/site-header'
import { ViewTracker } from '@/components/public/view-tracker'
import { getCurrentUser } from '@/lib/auth'
import { parseBlocks } from '@/lib/blocks'
import { getCourseBySlug, getPageBySlug, getServiceBySlug, getSiteSettings } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { truncate } from '@/lib/utils'
import type { Course, Service } from '@/lib/types'

export const revalidate = 60

/**
 * Landing pages composées dans l'admin, servies à la racine (ex. /bp).
 * Cette route est volontairement la dernière testée : les routes fixes
 * (/formations, /services, /blog, /contact…) ont toujours la priorité.
 */

async function loadContext(courseId: string | null, serviceId: string | null) {
  const supabase = await createClient()
  const [course, service] = await Promise.all([
    courseId
      ? supabase.from('courses').select('*').eq('id', courseId).maybeSingle<Course>()
      : Promise.resolve({ data: null }),
    serviceId
      ? supabase.from('services').select('*').eq('id', serviceId).maybeSingle<Service>()
      : Promise.resolve({ data: null }),
  ])
  return { course: course.data ?? null, service: service.data ?? null }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) return {}

  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? truncate(page.description, 160),
    openGraph: {
      title: page.seo_title ?? page.title,
      description: page.seo_description ?? truncate(page.description, 160),
      images: page.og_image_url ? [page.og_image_url] : [],
    },
  }
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPageBySlug(slug)

  if (!page || page.status !== 'published') notFound()

  const [context, settings, user] = await Promise.all([
    loadContext(page.course_id, page.service_id),
    getSiteSettings(),
    getCurrentUser(),
  ])

  // Une page de vente peut être « nue » : sans navigation ni pied de page,
  // pour concentrer l'attention sur l'offre (option cochée dans l'admin).
  return (
    <div className="flex min-h-screen flex-col">
      {!page.hide_header && (
        <SiteHeader
          siteName={settings.site_name}
          logoUrl={settings.logo_url}
          isLoggedIn={Boolean(user)}
          announcement={settings.announcement_active ? settings.announcement : null}
        />
      )}
      <main className="flex-1">
        <BlockRenderer blocks={parseBlocks(page.blocks)} context={context} />
      </main>
      {!page.hide_footer && <SiteFooter settings={settings} />}
      <ViewTracker />
    </div>
  )
}
