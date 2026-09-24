/**
 * Découpe un nom complet en prénom et nom.
 *
 * Les passerelles de paiement exigent les deux séparément, alors que le site
 * ne collecte qu'un nom complet — et le lui demander en deux champs ajouterait
 * une friction dans le tunnel d'achat pour le seul confort d'un prestataire.
 *
 * Le premier mot devient le prénom, le reste le nom. Quand il n'y a qu'un mot,
 * il est repris des deux côtés plutôt que d'envoyer une chaîne vide, que les
 * API refusent.
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: 'Client', lastName: 'Bizelan' }
  if (parts.length === 1) {
    return { firstName: parts[0].slice(0, 50), lastName: parts[0].slice(0, 50) }
  }
  return {
    firstName: parts[0].slice(0, 50),
    lastName: parts.slice(1).join(' ').slice(0, 50),
  }
}
