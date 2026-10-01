'use client'

import { SecureFileList } from '@/components/account/secure-file-list'
import type { Resource } from '@/lib/types'

/**
 * Supports d'une formation ou d'une leçon.
 *
 * La lecture et le téléchargement passent par `/api/ressources/<id>`, qui
 * vérifie l'inscription avant de signer une URL de quelques minutes.
 */
export function ResourceList({ resources }: { resources: Resource[] }) {
  return <SecureFileList files={resources} endpoint="/api/ressources" />
}
