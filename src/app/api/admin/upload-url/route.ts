import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { UPLOAD_TARGETS, isUploadTarget, storagePathFor } from '@/lib/uploads'

/**
 * Délivre une URL de dépôt signée.
 *
 * Le fichier ne transite PAS par l'application. La route précédente lisait
 * tout le contenu avant de le relayer au stockage, ce qui plafonnait à la
 * limite de corps de requête de l'hébergeur — de l'ordre de quatre mégaoctets
 * sur Vercel. La promesse « supports jusqu'à 100 Mo » ne tenait donc qu'en
 * développement local, et une vidéo de cours était hors de portée.
 *
 * Ici, le serveur ne fait que trois choses : vérifier que l'appelant est
 * administrateur, décider du chemin, et signer. Le navigateur téléverse
 * ensuite en direct vers le stockage. La clé de service ne quitte jamais le
 * serveur ; le jeton renvoyé ne vaut que pour ce chemin et cette fois.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'editor'].includes(user.profile.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  let body: { target?: string; fileName?: string; contentType?: string; size?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const target = String(body.target ?? '')
  if (!isUploadTarget(target)) {
    return NextResponse.json({ error: 'Destination inconnue.' }, { status: 400 })
  }

  const rules = UPLOAD_TARGETS[target]
  const fileName = String(body.fileName ?? '').trim()
  const contentType = String(body.contentType ?? '').toLowerCase()
  const size = Number(body.size ?? 0)

  if (!fileName) {
    return NextResponse.json({ error: 'Nom de fichier manquant.' }, { status: 400 })
  }

  // La taille est annoncée par le navigateur et ne prouve rien : le bucket
  // porte la même limite côté serveur, et c'est elle qui fait foi. Ce contrôle
  // évite simplement de faire commencer un envoi voué à l'échec.
  if (size > rules.maxBytes) {
    return NextResponse.json(
      {
        error: `Fichier trop volumineux (maximum ${Math.round(rules.maxBytes / 1024 / 1024)} Mo).`,
      },
      { status: 413 },
    )
  }

  if (rules.mimeTypes && !rules.mimeTypes.includes(contentType)) {
    return NextResponse.json(
      { error: `Format non accepté ici (${contentType || 'type inconnu'}).` },
      { status: 415 },
    )
  }

  const path = storagePathFor(fileName)

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(rules.bucket).createSignedUploadUrl(path)

  if (error || !data) {
    console.error('[upload] signature impossible :', error?.message)
    return NextResponse.json({ error: 'Le dépôt n’a pas pu être préparé.' }, { status: 500 })
  }

  return NextResponse.json({
    bucket: rules.bucket,
    path: data.path,
    token: data.token,
    // Adresse publique quand le bucket l'est ; sinon la lecture passera par
    // une URL signée à la demande, et ce champ reste nul.
    publicUrl: rules.public
      ? supabase.storage.from(rules.bucket).getPublicUrl(data.path).data.publicUrl
      : null,
  })
}
