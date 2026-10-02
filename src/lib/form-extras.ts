import { parseBlocks } from '@/lib/blocks'

/**
 * Champs communs aux fiches de contenu (formations, services, produits,
 * articles), lus depuis un formulaire d'administration.
 *
 * Chaque groupe n'est renvoyé QUE si le formulaire l'a envoyé : un écran qui
 * ne les porte pas n'écrase rien, et n'échoue pas sur une base où la
 * migration 0015 manquerait.
 */

function text(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

/** Compte à rebours et quantité restante. */
export function scarcityFields(formData: FormData): Record<string, unknown> {
  if (!formData.has('countdown_ends_at') && !formData.has('stock_remaining')) return {}

  // L'éditeur envoie une date ISO complète (fuseau de l'administrateur déjà
  // appliqué dans le navigateur) : le serveur, en UTC, ne doit pas réinterpréter
  // une heure « locale » qui n'est pas la sienne.
  const rawEnd = text(formData, 'countdown_ends_at')
  const end = rawEnd ? new Date(rawEnd) : null
  const rawStock = text(formData, 'stock_remaining')
  const stock = rawStock === '' ? null : Math.max(0, Math.round(Number(rawStock)))

  return {
    countdown_ends_at: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
    countdown_label: text(formData, 'countdown_label').slice(0, 120) || null,
    countdown_closes_sale: ['on', 'true', '1'].includes(text(formData, 'countdown_closes_sale')),
    stock_remaining: stock === null || Number.isNaN(stock) ? null : stock,
    stock_label: text(formData, 'stock_label').slice(0, 80) || null,
  }
}

/** Présentation par blocs. */
export function blocksField(formData: FormData): Record<string, unknown> {
  if (!formData.has('blocks')) return {}
  try {
    return { blocks: parseBlocks(JSON.parse(text(formData, 'blocks') || '[]')) }
  } catch {
    return {}
  }
}

/** Champ facultatif, envoyé seulement par les formulaires qui le portent. */
export function optionalText(formData: FormData, name: string): Record<string, string | null> {
  if (!formData.has(name)) return {}
  return { [name]: text(formData, name) || null }
}

/** Case à cocher facultative : présente dans le formulaire via un témoin `name__present`. */
export function optionalBool(formData: FormData, name: string): Record<string, boolean> {
  if (!formData.has(`${name}__present`)) return {}
  return { [name]: ['on', 'true', '1'].includes(text(formData, name)) }
}

/** Message clair quand une colonne de la migration 0015 manque en base. */
export function missingColumnMessage(message: string): string | null {
  const m = message.toLowerCase()
  if (
    (m.includes('could not find') && m.includes('column')) ||
    (m.includes('column') && m.includes('does not exist'))
  ) {
    return 'La base de données doit être mise à jour : exécutez supabase/migrations/0015_evolutions.sql dans Supabase, puis réessayez.'
  }
  return null
}
