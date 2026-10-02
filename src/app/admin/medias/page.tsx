import type { Metadata } from 'next'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { MediaLibrary } from '@/components/admin/media-library'
import type { MediaItem } from '@/lib/types'

export const metadata: Metadata = { title: 'Médiathèque' }
export const dynamic = 'force-dynamic'

export default async function AdminMediaPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('media')
    .select('*')
    .eq('bucket', 'public-media')
    .order('created_at', { ascending: false })
    .limit(1000)

  const items = (data as MediaItem[]) ?? []

  return (
    <>
      <PageHeader
        title="Médiathèque"
        description="Tous vos fichiers : images, vidéos, PDF, documents, audio. Copiez le lien d’un fichier pour le réutiliser n’importe où sur le site."
      />

      {/* Affichée même vide : c'est elle qui porte la zone de dépôt. */}
      <MediaLibrary items={items} />
    </>
  )
}
