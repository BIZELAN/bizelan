/**
 * Conversion entre une date ISO (stockée, en UTC) et la valeur d'un champ
 * `<input type="datetime-local">` (affichée dans le fuseau du navigateur).
 *
 * Sans elle, une fin d'offre saisie « 20 h » à Cotonou serait enregistrée
 * comme 20 h UTC, soit 21 h sur place.
 */

export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function localInputToIso(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}
