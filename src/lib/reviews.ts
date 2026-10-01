import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Review, ReviewTargetType } from '@/lib/types'

/**
 * Avis déposés par les clients.
 *
 * Trois sujets possibles : une formation (réservé aux inscrits), un produit
 * de la boutique (réservé aux acheteurs) ou le cabinet lui-même (tout compte
 * client). Chaque avis passe par la modération avant d'être publié ; un client
 * n'en dépose qu'un par sujet, qu'il peut modifier — il repart alors en relecture.
 *
 * Les lectures et écritures passent par la clé de service APRÈS les contrôles
 * ci-dessous : la politique d'insertion directe a été retirée (0014), parce
 * qu'elle laissait un inscrit choisir son statut ou se mettre « en avant ».
 */

export interface ReviewTarget {
  type: ReviewTargetType
  /** Identifiant de la formation ou du produit ; absent pour le cabinet. */
  id: string | null
}

export function parseTarget(type: string, id: string | null | undefined): ReviewTarget | null {
  if (type === 'site') return { type: 'site', id: null }
  if ((type === 'course' || type === 'product') && id && /^[0-9a-f-]{36}$/i.test(id)) {
    return { type, id }
  }
  return null
}

/** Le compte peut-il donner son avis sur ce sujet ? */
export async function canReview(userId: string, target: ReviewTarget): Promise<boolean> {
  const supabase = createAdminClient()

  if (target.type === 'course') {
    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', target.id!)
      .in('state', ['active', 'completed'])
      .maybeSingle()
    return Boolean(data)
  }

  if (target.type === 'product') {
    const { data } = await supabase
      .from('product_purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', target.id!)
      .eq('state', 'active')
      .maybeSingle()
    return Boolean(data)
  }

  // Le cabinet : tout compte client. Les prestations de conseil se règlent
  // souvent hors du site ; exiger une commande écarterait ces clients-là.
  return true
}

/** L'avis déjà déposé par ce compte sur ce sujet, s'il existe. */
export async function findOwnReview(userId: string, target: ReviewTarget): Promise<Review | null> {
  const supabase = createAdminClient()
  let query = supabase.from('reviews').select('*').eq('user_id', userId)

  if (target.type === 'course') query = query.eq('course_id', target.id!)
  else if (target.type === 'product') query = query.eq('product_id', target.id!)
  else query = query.is('course_id', null).is('product_id', null)

  const { data } = await query.order('created_at', { ascending: false }).limit(1)
  return ((data as Review[] | null) ?? [])[0] ?? null
}

export interface ReviewSummary {
  count: number
  average: number
  /** Nombre d'avis publiés par note, de 5 à 1. */
  distribution: { stars: number; count: number }[]
}

/** Note moyenne et répartition des avis PUBLIÉS sur un sujet (ou sur tout le site). */
export async function getReviewSummary(target: ReviewTarget | 'all'): Promise<ReviewSummary> {
  const supabase = createAdminClient()
  let query = supabase.from('reviews').select('rating').eq('status', 'approved')

  if (target !== 'all') {
    if (target.type === 'course') query = query.eq('course_id', target.id!)
    else if (target.type === 'product') query = query.eq('product_id', target.id!)
    else query = query.is('course_id', null).is('product_id', null)
  }

  const { data } = await query.limit(5000)
  const ratings = (data ?? []).map((r) => Number(r.rating)).filter((n) => n >= 1 && n <= 5)
  const count = ratings.length
  const average = count ? Math.round((ratings.reduce((s, n) => s + n, 0) / count) * 10) / 10 : 0

  return {
    count,
    average,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: ratings.filter((n) => n === stars).length,
    })),
  }
}

/** État du visiteur vis-à-vis du dépôt d'un avis, pour adapter l'interface. */
export type ReviewerState =
  | { kind: 'anonymous' }
  | { kind: 'not_eligible' }
  | { kind: 'can_review' }
  | { kind: 'has_review'; review: Review }

export async function getReviewerState(
  userId: string | null,
  target: ReviewTarget,
): Promise<ReviewerState> {
  if (!userId) return { kind: 'anonymous' }
  try {
    const own = await findOwnReview(userId, target)
    if (own) return { kind: 'has_review', review: own }
    return (await canReview(userId, target)) ? { kind: 'can_review' } : { kind: 'not_eligible' }
  } catch {
    // Migration 0014 absente ou base indisponible : on n'affiche simplement
    // pas le formulaire plutôt que de faire tomber la page.
    return { kind: 'not_eligible' }
  }
}
