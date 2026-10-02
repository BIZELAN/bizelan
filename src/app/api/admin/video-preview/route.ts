import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { resolveVideoRef, resolveVideoUrl } from '@/lib/video'
import { signVideoTarget } from '@/lib/video-sign'
import { env } from '@/lib/env'

/**
 * Aperçu d'une vidéo dans l'administration.
 *
 * Une vidéo de leçon déposée vit dans un espace privé : la prévisualiser
 * demande une URL signée, que seul le serveur peut émettre. Réservé aux
 * administrateurs, durée courte (30 minutes).
 *
 *   ?src=storage://lesson-videos/…   ou une URL
 *   ?provider=youtube|vimeo|bunny&id=…
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'editor'].includes(user.profile.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const url = new URL(request.url)
  const src = url.searchParams.get('src')
  const provider = url.searchParams.get('provider')
  const id = url.searchParams.get('id')

  const target = src
    ? resolveVideoUrl(src)
    : provider && id
      ? resolveVideoRef({
          provider: provider as 'youtube' | 'vimeo' | 'bunny',
          videoId: id,
          videoUrl: null,
          bunnyHostname: env.bunnyCdnHostname || null,
        })
      : null

  const playable = await signVideoTarget(target, 60 * 30)
  if (!playable) return NextResponse.json({ error: 'Vidéo introuvable ou illisible.' }, { status: 404 })
  return NextResponse.json({ playable })
}
