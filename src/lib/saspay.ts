import crypto from 'node:crypto'

// Import de TYPE seul : il est effacé à la compilation, donc ce module reste
// chargeable tel quel par Node — ce dont `scripts/test-saspay.mjs` a besoin.
// Un ré-export d'exécution recréerait la dépendance : le code applicatif
// importe les réseaux depuis `lib/saspay-networks` directement.
import type { SaspayNetwork } from '@/lib/saspay-networks'

/**
 * Client SasPay.
 *
 * Contrat vérifié contre l'API réelle et la spécification OpenAPI le
 * 24/09/2026, pas seulement contre la prose : celle-ci annonce un champ
 * `return_url` dans le softpay, que le schéma ne contient pas — il appartient
 * au checkout hébergé, un autre point d'entrée. Et l'enveloppe réelle est
 * `{success, data}` / `{success: false, error, code}`, que la prose ne montre
 * nulle part.
 *
 * Ce module ne s'exécute QUE côté serveur : la clé `sk_live_…` autorise à
 * encaisser et à virer des fonds, et ne doit jamais atteindre le navigateur.
 */

const API = 'https://api.saspay.me/api/v1'

function apiKey(): string {
  const key = process.env.SASPAY_API_KEY
  if (!key) throw new Error('SASPAY_API_KEY absente de l’environnement.')
  return key
}

/* ------------------------------------------------------------------ */
/* Encaissement                                                        */
/* ------------------------------------------------------------------ */

export interface SoftpayInput {
  /** En unités entières de la devise — le tunnel raisonne en francs CFA. */
  amount: number
  currency: string
  network: SaspayNetwork
  email: string
  firstName: string
  lastName: string
  phone: string
  description?: string
  metadata?: Record<string, string>
  /** Rejouer la même valeur après un délai réseau évite un double débit. */
  idempotencyKey: string
}

export type SoftpayOutcome =
  /**
   * Demande poussée sur le téléphone : le client valide sans quitter le site.
   * C'est le cas des réseaux béninois actifs.
   */
  | { kind: 'push'; paymentId: string; status: string; instructions: string | null }
  /**
   * Certains réseaux — Wave, Orange Money, cartes — imposent leur page. Un
   * même réseau peut basculer d'un mode à l'autre sans préavis selon le
   * routage : les deux cas sont donc toujours traités.
   */
  | { kind: 'redirect'; paymentId: string; checkoutUrl: string }
  | { kind: 'error'; message: string; code?: string }

export async function softpay(input: SoftpayInput): Promise<SoftpayOutcome> {
  let response: Response
  try {
    response = await fetch(`${API}/payments/softpay/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        // Le montant part en CHAÎNE décimale : c'est ce qu'attend le schéma,
        // et un nombre flottant introduirait des arrondis sur des sommes.
        amount: input.amount.toFixed(2),
        currency: input.currency,
        country: 'BJ',
        network: input.network,
        ...(input.description ? { description: input.description } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
        customer: {
          email: input.email,
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone,
        },
      }),
      cache: 'no-store',
    })
  } catch (error) {
    console.error('[saspay] appel impossible :', error)
    return {
      kind: 'error',
      message: 'Le service de paiement est injoignable. Réessayez dans un instant.',
    }
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null

  if (!response.ok || !body) {
    const message = readError(body)
    console.error('[saspay] refus', response.status, message)
    return { kind: 'error', message, code: String(body?.code ?? response.status) }
  }

  // L'enveloppe varie : certains points d'entrée renvoient `{success, data}`,
  // le softpay répond à plat. On accepte les deux plutôt que de parier.
  const data = (body.data && typeof body.data === 'object' ? body.data : body) as Record<
    string,
    unknown
  >

  const paymentId = typeof data.id === 'string' ? data.id : null
  if (!paymentId) {
    console.error('[saspay] réponse sans identifiant :', JSON.stringify(body).slice(0, 300))
    return { kind: 'error', message: 'Réponse inattendue du service de paiement.' }
  }

  const checkoutUrl = typeof data.checkout_url === 'string' ? data.checkout_url.trim() : ''
  if (checkoutUrl) {
    return { kind: 'redirect', paymentId, checkoutUrl }
  }

  return {
    kind: 'push',
    paymentId,
    status: typeof data.status === 'string' ? data.status : 'PENDING',
    instructions: typeof data.instructions === 'string' ? data.instructions : null,
  }
}

/* ------------------------------------------------------------------ */
/* Vérification de statut                                              */
/* ------------------------------------------------------------------ */

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'UNKNOWN'

export interface VerifyResult {
  ok: boolean
  status: PaymentStatus
  amount?: number
  currency?: string
}

/**
 * Relit l'état réel auprès de la passerelle.
 *
 * La documentation insiste : « toujours l'état réel côté gateway, jamais
 * confiance dans un statut mémorisé ». C'est ce que le tunnel interroge
 * pendant que le client compose son code sur son téléphone.
 */
export async function verifyPayment(paymentId: string): Promise<VerifyResult> {
  try {
    const response = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}/verify/`, {
      headers: { Authorization: `Bearer ${apiKey()}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return { ok: false, status: 'UNKNOWN' }

    const body = (await response.json()) as Record<string, unknown>
    const data = (body.data && typeof body.data === 'object' ? body.data : body) as Record<
      string,
      unknown
    >

    const KNOWN: readonly string[] = ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED']
    const raw = typeof data.status === 'string' ? data.status.toUpperCase() : ''
    // `UNKNOWN` plutôt qu'un pari : un statut que nous ne connaissons pas ne
    // doit surtout pas être traité comme un échec, ce qui fermerait l'accès
    // d'un client ayant payé.
    const status: PaymentStatus = KNOWN.includes(raw) ? (raw as PaymentStatus) : 'UNKNOWN'

    return {
      ok: true,
      status,
      amount: data.amount ? Number(data.amount) : undefined,
      currency: typeof data.currency === 'string' ? data.currency : undefined,
    }
  } catch (error) {
    console.error('[saspay] vérification impossible :', error)
    return { ok: false, status: 'UNKNOWN' }
  }
}

/* ------------------------------------------------------------------ */
/* Webhooks                                                            */
/* ------------------------------------------------------------------ */

/** Écart toléré entre l'horodatage signé et maintenant. Voir plus bas. */
const TIMESTAMP_TOLERANCE_SECONDS = 3 * 60 * 60

/**
 * Vérifie la signature d'un webhook.
 *
 * La signature porte sur `"<horodatage>." + corps brut`, en HMAC-SHA256, et
 * arrive dans `X-Webhook-Signature` — en hexadécimal nu, sans préfixe.
 *
 * Sur la tolérance d'horodatage, un arbitrage s'impose. La documentation
 * conseille de rejeter au-delà de CINQ MINUTES, et décrit par ailleurs des
 * rejeux jusqu'à DEUX HEURES après la première tentative. Appliquer les deux
 * à la lettre reviendrait à refuser tout rejeu tardif — donc à perdre
 * l'encaissement que ces rejeux existent précisément pour rattraper.
 *
 * La fenêtre est donc portée à trois heures, ce qui couvre le calendrier de
 * rejeu annoncé. La protection contre la répétition ne repose pas sur elle
 * mais sur le journal des livraisons, qui la rend structurelle plutôt que
 * temporelle.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): { ok: boolean; reason?: string } {
  const secret = process.env.SASPAY_WEBHOOK_SECRET
  if (!secret) return { ok: false, reason: 'secret absent' }
  if (!signature || !timestamp) return { ok: false, reason: 'en-têtes incomplets' }

  const sent = Number(timestamp)
  if (!Number.isFinite(sent)) return { ok: false, reason: 'horodatage illisible' }

  const age = Math.abs(Math.floor(Date.now() / 1000) - sent)
  if (age > TIMESTAMP_TOLERANCE_SECONDS) return { ok: false, reason: 'horodatage trop ancien' }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex')

  const a = Buffer.from(signature.trim().toLowerCase())
  const b = Buffer.from(expected)
  // `timingSafeEqual` exige des longueurs égales : les comparer d'abord évite
  // une exception sur un en-tête tronqué, et la longueur n'est pas un secret.
  if (a.length !== b.length) return { ok: false, reason: 'signature de longueur invalide' }
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'signature invalide' }

  return { ok: true }
}

/* ------------------------------------------------------------------ */
/* Erreurs                                                             */
/* ------------------------------------------------------------------ */

/**
 * Traduit une erreur d'API en phrase lisible par un acheteur.
 *
 * Le corps d'erreur prend deux formes : `{error: {champ: [messages]}}` pour
 * une validation, et `{error: "texte"}` ou `{detail: "texte"}` sinon.
 */
function readError(body: Record<string, unknown> | null): string {
  if (!body) return 'Le paiement n’a pas pu être lancé.'

  const error = body.error
  if (typeof error === 'string' && error) return error

  if (error && typeof error === 'object') {
    const first = Object.values(error as Record<string, unknown>)[0]
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    if (typeof first === 'string') return first
  }

  if (typeof body.detail === 'string') return body.detail
  if (typeof body.message === 'string') return body.message
  return 'Le paiement n’a pas pu être lancé.'
}
