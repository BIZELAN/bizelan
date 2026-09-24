/**
 * Réseaux mobile money et format de numéro — partie utilisable CÔTÉ CLIENT.
 *
 * Séparée de `lib/saspay.ts` pour une raison précise : ce dernier importe
 * `node:crypto` pour vérifier les signatures de webhook, et le tunnel d'achat
 * est un composant client. L'import faisait échouer la compilation avec
 * « Reading from "node:crypto" is not handled by plugins » — le compilateur a
 * donc attrapé la fuite, mais le partage devait de toute façon être explicite.
 *
 * Rien ici ne touche à la clé d'API : ce sont des constantes d'affichage et
 * une normalisation de saisie.
 */

/* ------------------------------------------------------------------ */
/* Réseaux                                                             */
/* ------------------------------------------------------------------ */

/**
 * Réseaux mobile money actifs au Bénin, relevés sur `/networks/`.
 *
 * Figés ici plutôt qu'interrogés à chaque affichage : la liste change au
 * rythme des accords opérateurs, pas des visites, et une requête au chargement
 * du tunnel d'achat ajouterait une latence pour une information stable.
 */
export const SASPAY_NETWORKS = [
  { code: 'mtn_bj', label: 'MTN MoMo' },
  { code: 'moov_bj', label: 'Moov Money' },
  { code: 'celtiis_bj', label: 'Celtiis Cash' },
] as const

export type SaspayNetwork = (typeof SASPAY_NETWORKS)[number]['code']

export function isKnownNetwork(value: string): value is SaspayNetwork {
  return SASPAY_NETWORKS.some((n) => n.code === value)
}

/**
 * Normalise un numéro béninois.
 *
 * Trois formes sont acceptées par SasPay — `0197505050`, `2290197505050`,
 * `+2290197505050` — et le serveur ajoute l'indicatif s'il manque. On envoie
 * la forme internationale explicite : la documentation prévient qu'un numéro
 * mal saisi n'est détecté qu'au moment où le gateway le rejette, donc autant
 * lever toute ambiguïté avant de partir.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  const local = digits.startsWith('229') ? digits.slice(3) : digits
  // Le Bénin est passé à dix chiffres, préfixe `01` compris.
  if (local.length !== 10) return null
  return `+229${local}`
}
