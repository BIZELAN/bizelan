import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPulseSignature } from '@/lib/chariow'
import { fulfillOrder } from '@/lib/orders'
import type { Order } from '@/lib/types'

/**
 * Réception des « Pulses » de Chariow.
 *
 * C'est le canal de livraison qui fait foi : il survit à un acheteur qui ferme
 * son onglet au mauvais moment, ce que le retour navigateur ne fait pas.
 *
 * À configurer dans Chariow : Automations > Pulses > Add Pulse, URL
 * `https://<votre-domaine>/api/paiement/chariow/webhook`, événements
 * `successful.sale` et `failed.sale`. Le secret de signature affiché dans
 * l'onglet Overview va dans `CHARIOW_PULSE_SECRET` — ce n'est PAS la clé d'API.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // Le corps est lu en TEXTE avant toute analyse : la signature porte sur les
  // octets reçus. Analyser puis re-sérialiser produirait une autre chaîne et
  // ferait échouer la comparaison, pour de mauvaises raisons.
  const raw = await request.text()

  if (!verifyPulseSignature(raw, request.headers.get('x-chariow-signature'))) {
    console.error('[chariow] signature invalide ou secret absent')
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 401 })
  }

  /** Enveloppe : `event` et `sale` sont à la RACINE, sans conteneur `data`. */
  let payload: {
    event?: string
    sale?: {
      id?: string
      status?: string
      amount?: { value?: number; currency?: string }
      custom_metadata?: Record<string, string> | null
    }
  }

  try {
    payload = JSON.parse(raw)
  } catch {
    // Corps illisible mais signé : inutile de le rejouer, on accuse réception.
    console.error('[chariow] corps non analysable')
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const event = payload.event ?? ''
  const sale = payload.sale
  const saleId = sale?.id

  if (!saleId) {
    console.error('[chariow] livraison sans identifiant de vente :', event)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const supabase = createAdminClient()

  /* ---------- Idempotence ------------------------------------------------
     Chariow rejoue pendant environ trois heures tant qu'il n'a pas de 2xx, et
     `x-pulse-delivery-id` reste IDENTIQUE d'une tentative à l'autre — la
     documentation est explicite : « the signature is computed once at dispatch
     and reused unchanged by every retry ».

     Conséquence, et c'est le piège : inscrire la livraison puis échouer
     reviendrait à condamner la commande. Le rejeu verrait un doublon,
     répondrait 200, et le client aurait payé sans jamais obtenir son accès.
     La trace est donc EFFACÉE si le traitement échoue, pour que la tentative
     suivante reparte de zéro. */
  const deliveryId = request.headers.get('x-pulse-delivery-id')
  if (deliveryId) {
    const { error } = await supabase
      .from('chariow_deliveries')
      .insert({ delivery_id: deliveryId, event, sale_id: saleId })

    if (error) {
      // 23505 = violation de clé unique : déjà traitée, rien à refaire.
      if (error.code === '23505') {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
      }
      // Toute autre panne de base doit être rejouée : la base est le seul
      // endroit où l'accès s'ouvre, et sans elle rien n'a été fait.
      console.error('[chariow] journal de livraison indisponible :', error.message)
      return NextResponse.json({ error: 'Indisponible.' }, { status: 503 })
    }
  }

  /* ---------- Correspondance avec la commande ---------------------------
     Par `chariow_sale_id`, enregistré au moment où la session de paiement a
     été ouverte. `custom_metadata` sert de second recours seulement : l'API ne
     le restitue pas sur la lecture d'une vente, donc on ne peut pas bâtir la
     corrélation dessus. */
  let order: Pick<Order, 'id' | 'reference' | 'status' | 'total_cents'> | null = null

  const { data: bySale } = await supabase
    .from('orders')
    .select('id, reference, status, total_cents')
    .eq('chariow_sale_id', saleId)
    .maybeSingle<Pick<Order, 'id' | 'reference' | 'status' | 'total_cents'>>()

  order = bySale ?? null

  if (!order) {
    const fallbackId = sale?.custom_metadata?.order_id
    if (fallbackId) {
      const { data } = await supabase
        .from('orders')
        .select('id, reference, status, total_cents')
        .eq('id', fallbackId)
        .maybeSingle<Pick<Order, 'id' | 'reference' | 'status' | 'total_cents'>>()
      order = data ?? null
    }
  }

  if (!order) {
    // Vente conclue hors du site — la boutique Chariow a ses propres canaux.
    // Ce n'est pas une erreur, et la rejouer ne ferait pas apparaître de
    // commande : on accuse réception.
    console.warn('[chariow] vente sans commande correspondante :', saleId)
    return NextResponse.json({ received: true, unmatched: true }, { status: 200 })
  }

  /* ---------- Traitement ------------------------------------------------- */

  if (event === 'failed.sale' || sale?.status === 'failed') {
    if (order.status !== 'paid') {
      await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id)
    }
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const succeeded = event === 'successful.sale' || sale?.status === 'completed'
  if (!succeeded) {
    // `abandoned.sale` et les autres : la commande reste en attente.
    return NextResponse.json({ received: true, ignored: event }, { status: 200 })
  }

  const result = await fulfillOrder(order.id, { transactionId: saleId, method: 'chariow' })

  if (!result.ok) {
    // La trace est retirée AVANT de demander un rejeu, sans quoi la prochaine
    // tentative se croirait déjà traitée et repartirait en 200.
    if (deliveryId) {
      await supabase.from('chariow_deliveries').delete().eq('delivery_id', deliveryId)
    }
    // 503 et non 200 : sans cela Chariow cesserait de rejouer et le client
    // aurait payé sans obtenir son accès, en silence.
    console.error('[chariow] ouverture d’accès échouée :', result.error)
    return NextResponse.json({ error: 'Traitement impossible.' }, { status: 503 })
  }

  return NextResponse.json({ received: true, reference: order.reference }, { status: 200 })
}
