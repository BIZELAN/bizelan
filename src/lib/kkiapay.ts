import 'server-only'

import { env } from '@/lib/env'

/**
 * Intégration KkiaPay (Mobile Money Bénin : MTN, Moov, Celtiis).
 *
 * Deux mécanismes complémentaires :
 *  1. Le webhook `POST /api/paiement/kkiapay/webhook` notifie le site.
 *  2. La vérification serveur ci-dessous interroge l'API KkiaPay.
 *
 * La source de vérité est TOUJOURS la vérification serveur : un webhook
 * n'ouvre jamais un accès sans que la transaction ait été re-vérifiée.
 * Doc : https://docs.kkiapay.me
 */

const BASE_URL = env.kkiapaySandbox
  ? 'https://api-sandbox.kkiapay.me'
  : 'https://api.kkiapay.me'

export interface KkiapayTransaction {
  transactionId: string
  status: string
  amount: number
  fees?: number
  method?: string
  performedAt?: string
  client?: {
    fullname?: string
    email?: string
    phoneNumber?: string
  }
  /** Données libres transmises au widget — on y place la référence de commande. */
  state?: string
  reason?: { code?: string; message?: string }
}

export interface VerificationResult {
  ok: boolean
  /** La transaction est confirmée payée par KkiaPay. */
  successful: boolean
  amount: number
  transaction: KkiapayTransaction | null
  error?: string
}

/**
 * Interroge KkiaPay pour connaître le vrai statut d'une transaction.
 * Réessaie jusqu'à 3 fois en cas d'erreur réseau.
 */
export async function verifyTransaction(transactionId: string): Promise<VerificationResult> {
  if (!transactionId) {
    return { ok: false, successful: false, amount: 0, transaction: null, error: 'transactionId manquant' }
  }

  let lastError = 'Erreur inconnue'

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/transactions/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-API-KEY': env.kkiapayPublicKey,
          'X-PRIVATE-KEY': env.kkiapayPrivateKey,
          'X-SECRET-KEY': env.kkiapaySecret,
        },
        body: JSON.stringify({ transactionId }),
        cache: 'no-store',
      })

      if (!response.ok) {
        lastError = `KkiaPay a répondu ${response.status}`
        // 4xx : inutile de réessayer, la requête elle-même est invalide.
        if (response.status >= 400 && response.status < 500) break
        continue
      }

      const data = (await response.json()) as KkiapayTransaction
      const status = String(data?.status ?? '').toUpperCase()
      const successful = status === 'SUCCESS'

      return {
        ok: true,
        successful,
        amount: Number(data?.amount ?? 0),
        transaction: data,
        error: successful ? undefined : `Statut KkiaPay : ${status || 'inconnu'}`,
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }

  return { ok: false, successful: false, amount: 0, transaction: null, error: lastError }
}

/**
 * Vérifie l'en-tête `x-kkiapay-secret` d'un webhook.
 * Comparaison à temps constant pour éviter les attaques temporelles.
 */
export function isValidWebhookSecret(received: string | null): boolean {
  const expected = process.env.KKIAPAY_SECRET ?? ''
  if (!expected || !received) return false
  if (received.length !== expected.length) return false

  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i)
  }
  return diff === 0
}

export interface KkiapayWebhookPayload {
  transactionId?: string
  isPaymentSucces?: boolean
  amount?: number
  fees?: number
  method?: string
  performedAt?: string
  event?: string
  stateData?: Record<string, unknown>
  state?: string
  failureCode?: string
  failureMessage?: string
}
