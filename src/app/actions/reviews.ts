'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/lib/auth'
import { canReview, findOwnReview, parseTarget } from '@/lib/reviews'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ReviewResult {
  ok: boolean
  message: string
}

/**
 * Dépôt ou modification de l'avis d'un client, sur une formation, un produit
 * ou le cabinet.
 *
 * Un avis par client et par sujet : s'il existe déjà, il est MODIFIÉ et
 * repart en relecture — un avis approuvé puis réécrit ne doit pas rester
 * publié sans que l'équipe ait vu le nouveau texte.
 *
 * Écriture par la clé de service APRÈS les contrôles : la politique
 * d'insertion directe a été retirée (0014). Le statut et la mise en avant sont
 * imposés ici, jamais choisis par le client.
 */
export async function saveReview(_prev: ReviewResult | null, formData: FormData): Promise<ReviewResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: 'Connectez-vous pour donner votre avis.' }

  const target = parseTarget(String(formData.get('targetType') ?? ''), String(formData.get('targetId') ?? ''))
  if (!target) return { ok: false, message: 'Sujet de l’avis introuvable.' }

  const rating = Math.round(Number(formData.get('rating') ?? 0))
  if (!(rating >= 1 && rating <= 5)) {
    return { ok: false, message: 'Merci de choisir une note entre 1 et 5 étoiles.' }
  }

  const comment = String(formData.get('comment') ?? '').trim().slice(0, 2000)
  if (comment.length < 10) {
    return { ok: false, message: 'Quelques mots de plus, s’il vous plaît : ils aident vraiment les autres clients.' }
  }

  const authorName =
    String(formData.get('authorName') ?? '').trim().slice(0, 80) || user.profile.full_name || 'Client'
  const authorRole = String(formData.get('authorRole') ?? '').trim().slice(0, 120) || null

  if (!(await canReview(user.id, target))) {
    return {
      ok: false,
      message:
        target.type === 'course'
          ? 'Seuls les participants de cette formation peuvent la noter.'
          : 'Seuls les acheteurs de ce produit peuvent le noter.',
    }
  }

  const supabase = createAdminClient()
  const existing = await findOwnReview(user.id, target)

  const fields = {
    author_name: authorName,
    author_role: authorRole,
    rating,
    comment,
    status: 'pending' as const,
    featured: false,
  }

  const { error } = existing
    ? await supabase.from('reviews').update(fields).eq('id', existing.id).eq('user_id', user.id)
    : await supabase.from('reviews').insert({
        ...fields,
        user_id: user.id,
        course_id: target.type === 'course' ? target.id : null,
        product_id: target.type === 'product' ? target.id : null,
      })

  if (error) {
    console.error('[avis] enregistrement impossible :', error.message)
    return { ok: false, message: 'Votre avis n’a pas pu être enregistré. Réessayez dans un instant.' }
  }

  revalidatePath('/compte/avis')
  revalidatePath('/admin/avis')

  return {
    ok: true,
    message: existing
      ? 'Votre avis est mis à jour. Il sera de nouveau publié après relecture.'
      : 'Merci ! Votre avis sera publié après une rapide relecture.',
  }
}
