import crypto from 'node:crypto'

/**
 * Client Chariow.
 *
 * Contrat vérifié contre l'API réelle le 23/09/2026, pas seulement contre la
 * documentation — celle-ci donne des identifiants de vente en `sal_…` alors
 * que l'API renvoie des `SALE…`, et ne mentionne pas la validation stricte du
 * téléphone.
 *
 * Ce module ne s'exécute QUE côté serveur : la clé `sk_…` donne accès à la
 * boutique entière et ne doit jamais atteindre le navigateur.
 */

const API = 'https://api.chariow.com/v1'

function apiKey(): string {
  const key = process.env.CHARIOW_API_KEY
  if (!key) throw new Error('CHARIOW_API_KEY absente de l’environnement.')
  return key
}

/* ------------------------------------------------------------------ */
/* Ouverture d'un paiement                                             */
/* ------------------------------------------------------------------ */

export interface CheckoutInput {
  productId: string
  email: string
  firstName: string
  lastName: string
  /** Chiffres uniquement, au format local du pays. */
  phoneNumber: string
  /** ISO 3166-1 alpha-2, ex. « BJ ». */
  phoneCountry: string
  redirectUrl?: string
  discountCode?: string
  /** Dix clés au maximum, 255 caractères par valeur. */
  metadata?: Record<string, string>
}

export type CheckoutOutcome =
  /** Le client doit finaliser sur la page de paiement. */
  | { step: 'payment'; saleId: string; checkoutUrl: string; amountCents: number; currency: string }
  /** Produit gratuit : rien à payer, la vente est déjà conclue. */
  | { step: 'completed'; saleId: string }
  /** Le client possède déjà ce produit chez Chariow. */
  | { step: 'already_purchased'; saleId: string | null }
  | { step: 'error'; message: string; fieldErrors?: Record<string, string[]> }

/**
 * Découpe un nom complet en prénom / nom.
 *
 * Chariow exige les deux séparément, alors que le site ne collecte qu'un nom
 * complet. Le premier mot devient le prénom, le reste le nom ; quand il n'y a
 * qu'un mot, il est repris des deux côtés plutôt que d'envoyer une chaîne vide,
 * que l'API refuse.
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: 'Client', lastName: 'Bizelan' }
  if (parts.length === 1) return { firstName: parts[0].slice(0, 50), lastName: parts[0].slice(0, 50) }
  return {
    firstName: parts[0].slice(0, 50),
    lastName: parts.slice(1).join(' ').slice(0, 50),
  }
}

/**
 * Normalise un numéro pour Chariow, qui n'accepte que des chiffres et vérifie
 * la cohérence avec l'indicatif pays. Le préfixe international est retiré s'il
 * est présent : `+229 01 97 00 00 00` et `0197000000` désignent le même numéro,
 * mais seul le second passe.
 */
export function normalizePhone(raw: string, dialCode = '229'): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00' + dialCode)) digits = digits.slice(2 + dialCode.length)
  else if (digits.startsWith(dialCode)) digits = digits.slice(dialCode.length)
  return digits
}

export async function createCheckout(input: CheckoutInput): Promise<CheckoutOutcome> {
  let response: Response
  try {
    response = await fetch(`${API}/checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        product_id: input.productId,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: { number: input.phoneNumber, country_code: input.phoneCountry },
        ...(input.redirectUrl ? { redirect_url: input.redirectUrl } : {}),
        ...(input.discountCode ? { discount_code: input.discountCode } : {}),
        ...(input.metadata ? { custom_metadata: input.metadata } : {}),
      }),
      cache: 'no-store',
    })
  } catch (error) {
    console.error('[chariow] appel impossible :', error)
    return { step: 'error', message: 'Le service de paiement est injoignable. Réessayez dans un instant.' }
  }

  const body = (await response.json().catch(() => null)) as
    | {
        message?: string
        errors?: Record<string, string[]>
        data?: {
          step?: string
          purchase?: {
            id?: string
            amount?: { value?: number; currency?: string }
          }
          payment?: { checkout_url?: string | null }
        } | unknown[]
      }
    | null

  if (!response.ok || !body) {
    // En erreur, `data` vaut `[]` et non un objet : le détail est dans `errors`.
    const fieldErrors =
      body?.errors && !Array.isArray(body.errors) ? body.errors : undefined
    console.error('[chariow] refus', response.status, body?.message)
    return {
      step: 'error',
      message: body?.message ?? 'Le paiement n’a pas pu être ouvert.',
      fieldErrors,
    }
  }

  const data = Array.isArray(body.data) ? undefined : body.data
  const saleId = data?.purchase?.id ?? null
  const step = data?.step

  if (step === 'completed') {
    return { step: 'completed', saleId: saleId ?? '' }
  }
  if (step === 'already_purchased') {
    return { step: 'already_purchased', saleId }
  }
  if (step === 'payment' && data?.payment?.checkout_url && saleId) {
    return {
      step: 'payment',
      saleId,
      checkoutUrl: data.payment.checkout_url,
      amountCents: data.purchase?.amount?.value ?? 0,
      currency: data.purchase?.amount?.currency ?? 'XOF',
    }
  }

  console.error('[chariow] réponse inattendue :', JSON.stringify(body).slice(0, 400))
  return { step: 'error', message: 'Réponse inattendue du service de paiement.' }
}

/* ------------------------------------------------------------------ */
/* Consultation d'une vente                                            */
/* ------------------------------------------------------------------ */

export interface SaleStatus {
  ok: boolean
  status?: string
  amountCents?: number
  currency?: string
  metadata?: Record<string, string>
}

/**
 * Lit l'état d'une vente.
 *
 * C'est la source de vérité quand le client revient de la page de paiement :
 * ce que rapporte le navigateur n'engage personne. Le webhook reste le canal
 * principal ; cette lecture sert à ne pas faire patienter un client dont le
 * paiement est déjà passé.
 */
export async function getSale(saleId: string): Promise<SaleStatus> {
  try {
    const response = await fetch(`${API}/sales/${encodeURIComponent(saleId)}`, {
      headers: { Authorization: `Bearer ${apiKey()}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return { ok: false }

    const body = (await response.json()) as {
      data?: {
        status?: string
        amount?: { value?: number; currency?: string }
        custom_metadata?: Record<string, string>
      }
    }

    return {
      ok: true,
      status: body.data?.status,
      amountCents: body.data?.amount?.value,
      currency: body.data?.amount?.currency,
      metadata: body.data?.custom_metadata,
    }
  } catch (error) {
    console.error('[chariow] lecture de vente impossible :', error)
    return { ok: false }
  }
}

/* ------------------------------------------------------------------ */
/* Signature des webhooks (« Pulses »)                                 */
/* ------------------------------------------------------------------ */

/**
 * Vérifie la signature d'un Pulse.
 *
 * L'en-tête est `x-chariow-signature`, au format `sha256=<hex>`, et la
 * signature porte sur le corps BRUT. D'où l'obligation de lire la requête en
 * texte avant tout `JSON.parse` : re-sérialiser produirait un autre octet et
 * ferait échouer la comparaison.
 *
 * Le secret est celui du Pulse (`whsec_…`), distinct de la clé d'API — les
 * confondre est l'erreur que la documentation signale explicitement.
 */
export function verifyPulseSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.CHARIOW_PULSE_SECRET
  if (!secret || !header) return false

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  // `timingSafeEqual` exige des longueurs égales : les comparer d'abord évite
  // de lever une exception sur un en-tête tronqué, et la longueur d'une
  // signature n'est pas un secret.
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
