import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import slugifyLib from 'slugify'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format monétaire.
 * Le franc CFA n'a pas de subdivision utilisée : les montants sont stockés
 * en unités entières (14999 = 14 999 FCFA).
 */
export function formatPrice(amount: number | null | undefined, currency = 'XOF'): string {
  if (amount === null || amount === undefined) return '—'
  if (amount === 0) return 'Gratuit'

  if (currency === 'XOF') {
    return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** « 1 h 25 » à partir d'un nombre de secondes. */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${String(minutes).padStart(2, '0')}`
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  const units = ['o', 'Ko', 'Mo', 'Go']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

export function slugify(input: string): string {
  return slugifyLib(input, { lower: true, strict: true, locale: 'fr', trim: true })
}

/** Pourcentage de remise entre un prix barré et un prix courant. */
export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null
  return Math.round(((compareAt - price) / compareAt) * 100)
}

/**
 * Une offre est gratuite quand elle est déclarée comme telle OU que son prix
 * est nul. Les deux arrivent : l'administration choisit parfois « gratuit »
 * sans remettre le prix à zéro, et l'inverse. Tout ce qui affiche un prix ou
 * encaisse un montant passe par ici, pour que la page de vente, le tunnel et
 * le serveur racontent la même chose.
 */
export function isFreeOffer(item: { pricing?: string | null; price_cents: number | null }): boolean {
  return item.pricing === 'free' || !item.price_cents || item.price_cents <= 0
}

/** Montant dû, avant remise. */
export function payablePrice(item: { pricing?: string | null; price_cents: number | null }): number {
  return isFreeOffer(item) ? 0 : Math.max(0, Math.round(item.price_cents ?? 0))
}

/**
 * Prix de catalogue d'une ligne de commande.
 *
 * La ligne porte le montant NET encaissé — c'est sur lui que reposent les
 * statistiques de ventes. Pour une commande d'un seul article, le prix
 * affiché au client se retrouve en y ajoutant la remise de la commande ;
 * sans cela le détail montrait « prix 6 000, remise −2 000, total 6 000 ».
 */
export function orderLinePrice(unitCents: number, itemsCount: number, discountCents: number) {
  return itemsCount === 1 ? unitCents + Math.max(0, discountCents) : unitCents
}

/**
 * Échappe une saisie libre avant de l'insérer dans un filtre PostgREST
 * (`.or('name.ilike.%…%')`). Virgules, parenthèses et points y ont un sens :
 * les laisser passer permettait à une simple virgule de casser la requête,
 * voire d'ajouter une condition. On ne garde que ce qui sert à chercher.
 */
export function sanitizeSearch(input: string | null | undefined, max = 80): string {
  return (input ?? '')
    .replace(/[^\p{L}\p{N}@+\-_' ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/** Ligne CSV : chaque cellule est citée, les guillemets doublés. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  // Le BOM fait ouvrir le fichier en UTF-8 par Excel : sans lui, les accents
  // arrivent en « Ã© » chez la plupart des utilisateurs Windows.
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null || cell === undefined ? '' : String(cell)
          // Une cellule commençant par = + - @ serait interprétée comme une
          // formule par le tableur : on la neutralise.
          const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
          return `"${safe.replace(/"/g, '""')}"`
        })
        .join(';'),
    )
    .join('\r\n')
  return `﻿${body}`
}

/** Tronque proprement un texte pour les aperçus et métadonnées SEO. */
export function truncate(text: string | null | undefined, max = 160): string {
  if (!text) return ''
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}

/** Garantit un tableau, même si la valeur JSONB est nulle ou mal formée. */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function initials(name: string | null | undefined, fallback = 'BZ'): string {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback
}

/** Lien WhatsApp pré-rempli. */
export function whatsappLink(phone: string | null | undefined, message?: string): string | null {
  if (!phone) return null
  const clean = phone.replace(/\D/g, '')
  if (!clean) return null
  const base = `https://wa.me/${clean}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/** Estimation du temps de lecture d'un article (200 mots/minute). */
export function readingMinutes(content: string | null | undefined): number {
  if (!content) return 1
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}
