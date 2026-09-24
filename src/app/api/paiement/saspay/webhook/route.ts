import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/saspay'
import { fulfillOrder } from '@/lib/orders'
import type { Order } from '@/lib/types'

/**
 * Réception des webhooks SasPay.
 *
 * C'est le canal de livraison qui fait foi : il survit à un acheteur qui ferme
 * son onglet pendant que son opérateur confirme. L'interrogation faite par le
 * tunnel ne sert qu'à afficher le résultat plus vite.
 *
 * À configurer dans SasPay : tableau de bord > Webhooks, URL
 * `https://<votre-domaine>/api/paiement/saspay/webhook`, événements
 * `transaction.success` et `transaction.failed`. Le `signing_secret` n'est
 * affiché QU'UNE FOIS, à la création — il va dans `SASPAY_WEBHOOK_SECRET`, et
 * ce n'est pas la clé d'API.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // Le corps est lu en TEXTE avant toute analyse : la signature porte sur les
  // octets reçus, précédés de l'horodatage. Analyser puis re-sérialiser
  // produirait une autre chaîne et ferait échouer la comparaison.
  const raw = await request.text()

  const signature = verifyWebhookSignature(
    raw,
    request.headers.get('x-webhook-signature'),
    request.headers.get('x-webhook-timestamp'),
  )

  if (!signature.ok) {
    console.error('[saspay] webhook rejeté :', signature.reason)
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 401 })
  }

  let payload: {
    event?: string
    data?: {
      id?: string
      reference?: string
      status?: string
      amount?: string
      currency?: string
    }
  }

  try {
    payload = JSON.parse(raw)
  } catch {
    // Corps illisible mais signé : le rejouer ne le rendrait pas lisible.
    console.error('[saspay] corps non analysable')
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const event = payload.event ?? ''
  const paymentId = payload.data?.id

  // Événement de test envoyé depuis le tableau de bord : on accuse réception
  // pour que la configuration se valide, sans rien chercher en base.
  if (event === 'webhook.test') {
    return NextResponse.json({ received: true, test: true }, { status: 200 })
  }

  if (!paymentId) {
    console.error('[saspay] livraison sans identifiant de paiement :', event)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const supabase = createAdminClient()

  /* ---------- Idempotence ------------------------------------------------
     SasPay rejoue cinq fois — immédiat, +30 s, +5 min, +30 min, +2 h — puis
     abandonne définitivement. Aucun en-tête d'identifiant de livraison n'est
     documenté : la clé est donc composée de l'événement et du paiement, ce qui
     suffit puisqu'un même couple ne doit être traité qu'une fois.

     La trace est EFFACÉE si le traitement échoue. Sans cela, un rejeu verrait
     un doublon, répondrait 200, et le client aurait payé sans jamais obtenir
     son accès — exactement le piège rencontré sur la passerelle précédente. */
  const deliveryKey = `saspay:${event}:${paymentId}`
  const { error: journalError } = await supabase
    .from('payment_deliveries')
    .insert({ delivery_id: deliveryKey, event, sale_id: paymentId, provider: 'saspay' })

  if (journalError) {
    // 23505 = violation de clé unique : déjà traitée, rien à refaire.
    if (journalError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
    }
    // Toute autre panne de base doit être rejouée : la base est le seul
    // endroit où l'accès s'ouvre, et sans elle rien n'a été fait.
    console.error('[saspay] journal de livraison indisponible :', journalError.message)
    return NextResponse.json({ error: 'Indisponible.' }, { status: 503 })
  }

  const forget = () =>
    supabase.from('payment_deliveries').delete().eq('delivery_id', deliveryKey)

  /* ---------- Correspondance avec la commande --------------------------- */
  const { data: order } = await supabase
    .from('orders')
    .select('id, reference, status, total_cents')
    .eq('saspay_payment_id', paymentId)
    .maybeSingle<Pick<Order, 'id' | 'reference' | 'status' | 'total_cents'>>()

  if (!order) {
    // Paiement né hors du site — un lien de paiement, le tableau de bord.
    // Ce n'est pas une erreur, et le rejouer ne ferait pas apparaître de
    // commande : on accuse réception.
    console.warn('[saspay] paiement sans commande correspondante :', paymentId)
    return NextResponse.json({ received: true, unmatched: true }, { status: 200 })
  }

  /* ---------- Traitement ------------------------------------------------- */

  if (event === 'transaction.failed' || event === 'transaction.cancelled') {
    if (order.status !== 'paid') {
      await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id)
    }
    return NextResponse.json({ received: true }, { status: 200 })
  }

  if (event !== 'transaction.success') {
    // `transaction.created` et le reste : la commande reste en attente.
    return NextResponse.json({ received: true, ignored: event }, { status: 200 })
  }

  const result = await fulfillOrder(order.id, { transactionId: paymentId, method: 'saspay' })

  if (!result.ok) {
    await forget()
    // 503 et non 200 : sans cela SasPay cesserait de rejouer et le client
    // aurait payé sans obtenir son accès, en silence.
    console.error('[saspay] ouverture d’accès échouée :', result.error)
    return NextResponse.json({ error: 'Traitement impossible.' }, { status: 503 })
  }

  return NextResponse.json({ received: true, reference: order.reference }, { status: 200 })
}
