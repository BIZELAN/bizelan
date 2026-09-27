import { WHATSAPP_GREEN, WhatsAppIcon } from '@/components/ui/brand-icons'
import { cn, whatsappLink } from '@/lib/utils'

/**
 * Bouton WhatsApp permanent, sur toutes les pages publiques.
 *
 * Il ne bouge pas : `fixed`, sans transformation au survol et sans apparition
 * au défilement. Un bouton qui se déplace ou qui surgit se manque, et sur un
 * écran de téléphone il vole un clic destiné au contenu.
 *
 * Aucun JavaScript. C'est une ancre rendue côté serveur — donc présente au
 * premier octet de HTML, avant toute hydratation. Sur une connexion lente, et
 * c'est le cas d'usage réel ici, un bouton de contact qui n'attend pas le
 * JavaScript arrive plusieurs secondes plus tôt.
 *
 * Le contraste mérite une note. Le glyphe blanc sur le vert WhatsApp mesure
 * 1,99:1 — sous les 3:1 du critère WCAG 1.4.11, qui exempte toutefois les
 * logotypes. La conséquence pratique est ailleurs : ce vert contre une page
 * claire mesure lui aussi 1,99:1, de sorte que le bouton se détache mal. C'est
 * donc l'ombre et le liseré qui font la frontière, et non la couleur. Le
 * liseré passe par `ring-line-strong`, un jeton qui s'inverse avec le thème :
 * sombre sur fond clair, clair sur fond sombre — là où une ombre seule
 * disparaîtrait en thème sombre.
 */
export function WhatsAppFloat({
  phone,
  enabled,
  message,
  position,
}: {
  phone: string | null
  enabled: boolean
  message: string | null
  /** Coin d'ancrage. Contraint en base à `left` ou `right`. */
  position: string | null
}) {
  const href = whatsappLink(phone, message ?? undefined)
  if (!enabled || !href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous écrire sur WhatsApp"
      title="Nous écrire sur WhatsApp"
      className={cn(
        'fixed bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full',
        // Le liseré et l'ombre portent la frontière du bouton, le vert n'y
        // suffit pas — voir l'en-tête de ce fichier.
        'text-white ring-1 ring-line-strong shadow-e3',
        // Pas de `scale` au survol : la consigne est qu'il ne bouge pas. Seule
        // la luminosité et l'ombre répondent.
        'transition-[filter,box-shadow] duration-fast hover:shadow-e4 hover:brightness-110',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-text focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        // Un bouton flottant n'a aucun sens sur une page imprimée.
        'print:hidden',
        position === 'left' ? 'left-5' : 'right-5',
      )}
      style={{
        backgroundColor: WHATSAPP_GREEN,
        // Encoche des iPhone : sans ce décalage, le bouton chevauche la barre
        // de gestes en bas de l'écran.
        marginBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <WhatsAppIcon size={28} aria-hidden />
    </a>
  )
}
