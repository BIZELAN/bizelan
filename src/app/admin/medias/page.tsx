import type { Metadata } from 'next'
import { ImageIcon } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { EmptyState } from '@/components/ui/misc'
import { MediaLibrary } from '@/components/admin/media-library'
import type { MediaItem } from '@/lib/types'

export const metadata: Metadata = { title: 'Médiathèque' }
export const dynamic = 'force-dynamic'

export default async function AdminMediaPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('media')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const items = (data as MediaItem[]) ?? []

  return (
    <>
      <PageHeader
        title="Médiathèque"
        description="Toutes les images téléversées. Cliquez pour copier l’adresse et la réutiliser dans une page."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Aucune image"
          description="Les images que vous téléversez depuis les formations ou les pages apparaîtront ici."
        />
      ) : (
        <MediaLibrary items={items} />
      )}
    </>
  )
}
