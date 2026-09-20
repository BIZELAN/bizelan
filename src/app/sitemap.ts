import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

export const revalidate = 3600

/** Plan du site généré automatiquement à partir des contenus publiés. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl.replace(/\/$/, '')

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/formations`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/services`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/contact`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/mentions-legales`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/conditions`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/confidentialite`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  try {
    const supabase = await createClient()

    const [{ data: courses }, { data: services }, { data: posts }, { data: pages }] =
      await Promise.all([
        supabase.from('courses').select('slug, updated_at').eq('status', 'published'),
        supabase.from('services').select('slug, updated_at').eq('status', 'published'),
        supabase.from('bz_posts').select('slug, updated_at').eq('status', 'published'),
        supabase.from('pages').select('slug, updated_at, is_home').eq('status', 'published'),
      ])

    return [
      ...staticRoutes,
      ...(courses ?? []).map((c) => ({
        url: `${base}/formations/${c.slug}`,
        lastModified: new Date(c.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      })),
      ...(services ?? []).map((s) => ({
        url: `${base}/services/${s.slug}`,
        lastModified: new Date(s.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
      ...(posts ?? []).map((p) => ({
        url: `${base}/blog/${p.slug}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
      ...(pages ?? [])
        .filter((p) => !p.is_home)
        .map((p) => ({
          url: `${base}/${p.slug}`,
          lastModified: new Date(p.updated_at),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        })),
    ]
  } catch {
    // Base indisponible : on sert au moins les routes fixes.
    return staticRoutes
  }
}
