import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl.replace(/\/$/, '')

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Zones privées : jamais indexées.
        disallow: ['/admin', '/compte', '/api', '/commande', '/auth'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
