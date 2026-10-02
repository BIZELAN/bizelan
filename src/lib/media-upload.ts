import { createClient } from '@/lib/supabase/client'
import type { MediaItem } from '@/lib/types'

/**
 * Dépôt d'un fichier dans la médiathèque, depuis le navigateur.
 *
 * Trois temps : le serveur signe un jeton pour un chemin précis, le navigateur
 * envoie DIRECTEMENT au stockage, puis le serveur inscrit le fichier dans la
 * médiathèque. L'ancienne route relayait le fichier par l'application et
 * butait sur la limite de corps de requête de l'hébergeur (4,5 Mo sur
 * Vercel) : une photo de téléphone récente, et a fortiori une vidéo, était
 * refusée.
 */
export async function uploadToLibrary(file: File): Promise<{ url: string; item: MediaItem | null }> {
  const prepared = await fetch('/api/admin/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target: 'media',
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    }),
  })
  const ticket = (await prepared.json()) as { bucket?: string; path?: string; token?: string; error?: string }
  if (!prepared.ok || !ticket.path || !ticket.token || !ticket.bucket) {
    throw new Error(ticket.error ?? 'Le dépôt n’a pas pu être préparé.')
  }

  const supabase = createClient()
  const { error } = await supabase.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type || 'application/octet-stream',
    })
  if (error) throw new Error(error.message || 'L’envoi a échoué.')

  const registered = await fetch('/api/admin/medias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: ticket.path,
      fileName: file.name,
      size: file.size,
      mimeType: file.type || null,
    }),
  })
  const payload = (await registered.json()) as { url?: string; item?: MediaItem | null; error?: string }
  if (!registered.ok || !payload.url) throw new Error(payload.error ?? 'Inscription dans la médiathèque impossible.')
  return { url: payload.url, item: payload.item ?? null }
}

/** Taille lisible pour les messages d'erreur et de progression. */
export function describeUploadError(cause: unknown): string {
  if (cause instanceof Error && cause.message) {
    if (/exceeded|too large|maximum allowed size/i.test(cause.message)) {
      return 'Fichier trop volumineux pour le stockage. Réduisez-le ou augmentez la limite dans Supabase (Storage > Settings).'
    }
    return cause.message
  }
  return 'Téléversement impossible. Vérifiez votre connexion.'
}
