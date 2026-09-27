/**
 * Résolution de l'alias `@/` pour les scripts de vérification.
 *
 *     node --import ./scripts/tsalias.mjs scripts/test-icons.mjs
 *
 * Next résout `@/lib/video` grâce à `paths` dans `tsconfig.json` ; Node, non.
 * Un module du projet qui importe un autre module par son alias était donc
 * inchargeable hors de Next, et cela a déjà abîmé trois vérifications :
 *
 *   · `src/lib/uploads.ts` a dû être détaché de `slugify` pour être testable
 *   · `safeYoutubeSrc` n'a pu être vérifié qu'en lisant la source, faute de
 *     pouvoir l'exécuter
 *   · `src/lib/icons.ts` est devenu inchargeable dès qu'il a importé une icône
 *     de marque depuis `@/components`
 *
 * Contourner une quatrième fois aurait signifié tester moins bien à chaque
 * nouvelle dépendance interne. Ce crochet supprime la cause.
 *
 * Il fait deux choses, et rien d'autre :
 *   1. `@/x` devient `<racine>/src/x`
 *   2. un spécificateur sans extension reçoit `.ts`, `.tsx`, `/index.ts` ou
 *      `/index.tsx`, selon le fichier qui existe
 *
 * Il ne touche pas aux paquets de `node_modules`, que Node résout déjà.
 */
import { existsSync } from 'node:fs'
import { register } from 'node:module'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = dirname(dirname(fileURLToPath(import.meta.url)))
const SRC = resolvePath(RACINE, 'src')
// Pas de `.tsx` : Node retire les annotations de type mais ne transforme pas
// le JSX. L'y admettre echouerait plus loin, sur un message obscur.
const EXTENSIONS = ['.ts', '.mts', '/index.ts']

/** Ajoute l'extension qui correspond à un fichier réel. `null` si aucune. */
function avecExtension(chemin) {
  if (existsSync(chemin) && !existsSync(chemin + '.ts')) {
    // Déjà un fichier (extension explicite, ou un dossier traité plus bas).
    try {
      if (!chemin.endsWith('/')) return chemin
    } catch {
      /* ignoré */
    }
  }
  for (const ext of EXTENSIONS) {
    if (existsSync(chemin + ext)) return chemin + ext
  }
  return existsSync(chemin) ? chemin : null
}

export async function resolve(specifier, context, nextResolve) {
  // 1. L'alias du projet.
  if (specifier.startsWith('@/')) {
    const brut = resolvePath(SRC, specifier.slice(2))
    const trouve = avecExtension(brut)
    if (!trouve) {
      throw new Error(
        `[tsalias] « ${specifier} » ne correspond à aucun fichier sous src/ ` +
          `(essayé ${EXTENSIONS.join(', ')})`,
      )
    }
    return { url: pathToFileURL(trouve).href, shortCircuit: true }
  }

  // 2. Un chemin relatif sans extension, dans le projet.
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const base = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : RACINE
    const brut = resolvePath(base, specifier)
    if (!/\.[a-z]+$/i.test(specifier)) {
      const trouve = avecExtension(brut)
      if (trouve && trouve !== brut) {
        return { url: pathToFileURL(trouve).href, shortCircuit: true }
      }
    }
  }

  return nextResolve(specifier, context)
}

// Le crochet s'enregistre au chargement, avant que le script de test ne soit
// évalué : ses imports statiques passent donc par ici.
register(import.meta.url, import.meta.url)
