import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { PlayableVideo, VideoTarget } from '@/lib/video'

/**
 * Transforme une cible vidéo en vidéo jouable.
 *
 * `server-only` en tête : ce module emploie la clé de service, et l'importer
 * depuis un composant client ferait échouer la compilation plutôt que
 * d'expédier la clé au navigateur.
 *
 * L'appelant est responsable d'avoir vérifié le droit d'accès AVANT d'appeler.
 * Cette fonction ne le fait pas — elle ne sait pas de quoi il s'agit, et un
 * contrôle qu'on croit fait ici serait un contrôle absent.
 */
export async function signVideoTarget(
  target: VideoTarget | null,
  /**
   * Durée de validité. Quatre heures par défaut : assez pour une séance de
   * travail sans réveiller le lecteur en cours de lecture, assez peu pour
   * qu'un lien recopié depuis l'inspecteur cesse vite de servir.
   */
  expiresInSeconds = 60 * 60 * 4,
): Promise<PlayableVideo | null> {
  if (!target) return null
  if (target.kind !== 'storage') return target

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(target.bucket)
    .createSignedUrl(target.path, expiresInSeconds)

  if (error || !data?.signedUrl) {
    // Journalisé et non propagé : une vidéo manquante ne doit pas faire
    // écrouler la page de leçon, qui porte aussi les notes, les supports et le
    // questionnaire. Le lecteur affichera son message d'absence.
    console.error(
      `[video] signature impossible pour ${target.bucket}/${target.path} :`,
      error?.message ?? 'aucune URL renvoyée',
    )
    return null
  }

  // Le type est CONNU, pas deviné : ce fichier vient du stockage, donc c'est un
  // fichier direct. L'ancienne version relisait l'extension de l'URL signée
  // pour en décider, et se trompait sur `.mov` comme sur un chemin sans
  // extension — la vidéo partait alors dans un <iframe>.
  return { kind: 'file', url: data.signedUrl }
}
