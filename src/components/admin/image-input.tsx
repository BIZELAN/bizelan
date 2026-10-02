'use client'

import { MediaInput } from '@/components/admin/media-input'
import type { MediaAccept } from '@/lib/media'

/**
 * Champ visuel des formulaires : image OU vidéo par défaut.
 *
 * Les champs qui ne peuvent porter qu'une image — image de partage sur les
 * réseaux, logo, favicon — passent `accept="image"` : Facebook ou WhatsApp
 * n'affichent pas une vidéo en aperçu de lien.
 */
export function ImageInput({
  name,
  defaultValue,
  accept = 'media',
}: {
  name: string
  defaultValue?: string | null
  /** Conservé pour compatibilité ; le libellé vient désormais du `Field`. */
  label?: string
  accept?: MediaAccept
}) {
  return <MediaInput name={name} defaultValue={defaultValue} accept={accept} />
}
