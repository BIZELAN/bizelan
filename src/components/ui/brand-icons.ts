import { createElement, forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * Icônes de marque, absentes de lucide.
 *
 * lucide a retiré les logos de marque de son jeu : il n'y a donc pas d'icône
 * WhatsApp, et le pied de page comme la page Contact affichaient un
 * `MessageCircle` — une bulle de dialogue générique. Personne ne la reconnaît
 * comme WhatsApp, or c'est le premier canal de contact ici : l'icône générique
 * coûtait des conversations.
 *
 * Écrite en SVG inline plutôt qu'avec un paquet d'icônes de marque. Une
 * dépendance entière pour un seul glyphe referait l'erreur du `import * as
 * Icons` de la phase 13, qui avait embarqué 5230 icônes et fait passer
 * l'éditeur de 321 à 471 ko.
 *
 * ── Pourquoi `createElement` et non du JSX ───────────────────────────────
 * Ce fichier est un `.ts`, pas un `.tsx`, et c'est délibéré. `src/lib/icons.ts`
 * l'importe pour proposer l'icône dans la console, et `scripts/test-icons.mjs`
 * charge `icons.ts` sous Node. Or Node sait retirer les annotations de type
 * mais NE SAIT PAS transformer du JSX : un seul `.tsx` dans la chaîne rendait
 * tout le registre d'icônes invérifiable. Un glyphe, un appel — le JSX
 * n'apportait ici que l'agrément.
 *
 * La signature reprend celle de lucide (`LucideProps`, `forwardRef` vers le
 * <svg>), pour que ces icônes soient interchangeables avec les autres, y
 * compris dans les entrées de `icons.ts` typées `LucideIcon`.
 *
 * Une différence à connaître : les icônes lucide sont tracées au CONTOUR
 * (`stroke`), celle-ci est PLEINE (`fill`). Une classe `text-…` les colore
 * toutes les deux, mais `strokeWidth` n'a aucun effet ici.
 */

/**
 * Tracé officiel, repris de simple-icons (v13, `icons/whatsapp.svg`). Ni
 * redessiné ni simplifié : un logo approximatif se remarque, et il engage
 * l'image de marque du client. `scripts/test-whatsapp.mjs` en gèle la somme de
 * contrôle, calculée sur la source amont.
 */
const WHATSAPP_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'

export const WhatsAppIcon = forwardRef<SVGSVGElement, LucideProps>(function WhatsAppIcon(
  { size = 24, className, ...props },
  ref,
) {
  return createElement(
    'svg',
    {
      ref,
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: 'currentColor',
      className,
      ...props,
    },
    createElement('path', { d: WHATSAPP_PATH }),
  )
})

/**
 * Vert WhatsApp officiel.
 *
 * Volontairement HORS du système de jetons : ce n'est pas une couleur du site,
 * c'est celle d'une marque tierce, et la teindre aux couleurs de BIZELAN
 * priverait le bouton de ce qui le rend reconnaissable d'un coup d'œil.
 *
 * Le glyphe blanc sur ce vert mesure 1,99:1 — sous le seuil de 3:1 du critère
 * WCAG 1.4.11, qui exempte toutefois explicitement les logotypes. La
 * conséquence pratique est ailleurs : ce vert contre une page claire mesure lui
 * aussi 1,99:1, de sorte que c'est la BORDURE du bouton qui doit le détacher,
 * pas sa couleur. D'où l'ombre et le liseré dans `whatsapp-float.tsx`.
 */
export const WHATSAPP_GREEN = '#25D366'
