import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidWebhookSecret, verifyTransaction, type KkiapayWebhookPayload } from '@/lib/kkiapay'
import { fulfillOrder } from '@/lib/orders'
import type { Order } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Webhook KkiaPay.
 *
 * À configurer dans le tableau de bord KkiaPay :
 *   URL     : https://VOTRE-DOMAINE/api/paiement/kkiapay/webhook
 *   Secret  : la même valeur que KKIAPAY_SECRET
 *
 * Double sécurité :
 *   1. L'en-tête `x-kkiapay-secret` est comparé au secret configuré.
 *   2. La transaction est systématiquement re-vérifiée auprès de l'API KkiaPay.
 * Un webhook falsifié ne peut donc jamais ouvrir un accès.
 *
 * On répond toujours 200 après une requête authentifiée, pour éviter que
 * KkiaPay ne rejoue indéfiniment un événement déjà traité.
 */
export async function POST(request: Request) {
  const secretHeader =
    request.headers.get('x-kkiapay-secret') ?? request.headers.get('X-Kkiapay-Secret')

  if (!isValidWebhookSecret(secretHeader)) {
    console.warn('[kkiapay] webhook rejeté : secret invalide')
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  }

  let payload: KkiapayWebhookPayload
  try {
    payload = (await request.json()) as KkiapayWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Corps de requête illisible' }, { status: 400 })
  }

  const transactionId = payload.transactionId
  if (!transactionId) {
    return NextResponse.json({ received: true, note: 'transactionId absent' })
  }

  const supabase = createAdminClient()

  // La référence de commande est transmise au widget via `data`.
  const reference =
    typeof payload.state === 'string'
      ? payload.state
      : ((payload.stateData?.reference as string | undefined) ?? null)

  let order: Pick<Order, 'id' | 'reference' | 'status' | 'total_cents'> | null = null

  if (reference) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, reference, status, total_cents')
      .eq('reference', reference)
      .maybeSingle()

    // Une base injoignable ou une clé service_role invalide ne doit JAMAIS
    // être confondue avec « commande inexistante » : le client a payé, et
    // répondre 200 ici ferait renoncer KkiaPay définitivement.
    if (error) {
      console.error('[kkiapay] lecture de la commande impossible :', error.message)
      return NextResponse.json({ error: 'Base indisponible' }, { status: 503 })
    }
    order = data
  }

  // Repli : commande déjà associée à cette transaction
  if (!order) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, reference, status, total_cents')
      .eq('kkiapay_transaction_id', transactionId)
      .maybeSingle()

    if (error) {
      console.error('[kkiapay] lecture de la commande impossible :', error.message)
      return NextResponse.json({ error: 'Base indisponible' }, { status: 503 })
    }
    order = data
  }

  if (!order) {
    console.warn(`[kkiapay] webhook sans commande correspondante (transaction ${transactionId})`)
    return NextResponse.json({ received: true, note: 'commande introuvable' })
  }

  if (order.status === 'paid') {
    return NextResponse.json({ received: true, note: 'déjà traitée' })
  }

  // Vérification auprès de KkiaPay — source de vérité
  const verification = await verifyTransaction(transactionId)

  if (!verification.ok) {
    console.error('[kkiapay] vérification impossible :', verification.error)
    // 503 : KkiaPay rejouera l'événement.
    return NextResponse.json({ error: 'Vérification indisponible' }, { status: 503 })
  }

  if (!verification.successful) {
    await supabase
      .from('orders')
      .update({
        status: 'failed',
        kkiapay_transaction_id: transactionId,
        admin_note: payload.failureMessage ?? verification.error ?? null,
      })
      .eq('id', order.id)

    return NextResponse.json({ received: true, note: 'paiement non abouti' })
  }

  if (verification.amount > 0 && verification.amount < order.total_cents) {
    await supabase
      .from('orders')
      .update({
        status: 'failed',
        kkiapay_transaction_id: transactionId,
        admin_note: `Montant reçu (${verification.amount}) inférieur au montant dû (${order.total_cents}).`,
      })
      .eq('id', order.id)

    console.warn(`[kkiapay] montant insuffisant pour la commande ${order.reference}`)
    return NextResponse.json({ received: true, note: 'montant insuffisant' })
  }

  const result = await fulfillOrder(order.id, { transactionId, method: 'kkiapay' })

  if (!result.ok) {
    console.error('[kkiapay] ouverture d’accès échouée :', result.error)
    return NextResponse.json({ error: 'Traitement échoué' }, { status: 500 })
  }

  return NextResponse.json({ received: true, order: order.reference })
}

/** Permet de vérifier depuis un navigateur que l'URL du webhook répond. */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook KkiaPay opérationnel. Les notifications doivent arriver en POST.',
  })
}
