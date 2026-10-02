import 'server-only'

import { headers } from 'next/headers'

import { env } from '@/lib/env'

/**
 * Adresse publique du site, déduite de la requête en cours.
 *
 * Les liens envoyés aux clients (demande d'avis, relance, certificat,
 * e-mails) s'appuyaient sur `NEXT_PUBLIC_SITE_URL`, figée au déploiement :
 * connecter un nouveau nom de domaine laissait partir des messages pointant
 * vers l'ancien tant que personne ne pensait à changer la variable. Ici, le
 * domaine est celui par lequel le site est réellement servi — il suit tout
 * changement de domaine sans rien reconfigurer.
 *
 * Deux exceptions retombent sur la variable d'environnement :
 *   · hors requête (génération statique, tâche planifiée) : pas d'en-têtes ;
 *   · une adresse technique `*.vercel.app` alors qu'un vrai domaine est
 *     configuré : un message client ne doit pas porter l'adresse interne de
 *     l'hébergeur, qu'on aurait ouverte pour un test.
 */
export async function getSiteUrl(): Promise<string> {
  const fallback = env.siteUrl.replace(/\/$/, '')

  try {
    const h = await headers()
    const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0].trim()
    if (!host) return fallback

    const configuredIsReal = !/localhost|127\.0\.0\.1/.test(fallback) && !fallback.includes('.vercel.app')
    if (host.endsWith('.vercel.app') && configuredIsReal) return fallback

    const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
    const proto = (h.get('x-forwarded-proto') ?? '').split(',')[0].trim() || (isLocal ? 'http' : 'https')
    return `${proto}://${host}`
  } catch {
    return fallback
  }
}

/** Le domaine seul, pour l'affichage : `bizelan.com`. */
export function displayHost(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
