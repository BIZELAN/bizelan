import * as React from 'react'
import Link from 'next/link'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Bouton unique du système.
 *
 * Les variantes passent par `cva` plutôt que par un objet écrit à la main :
 * les combinaisons taille × variante × état deviennent déclaratives, et le
 * type des props se déduit de la définition — impossible de passer une
 * variante inexistante.
 */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
    'rounded-md transition-colors duration-fast',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-text',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-e1',
        secondary: 'bg-canvas-subtle text-fg hover:bg-line border border-line',
        outline: 'border border-line-control text-fg hover:bg-canvas-subtle',
        ghost: 'text-fg-muted hover:bg-canvas-subtle hover:text-fg',
        danger: 'bg-danger text-danger-fg hover:opacity-90 shadow-e1',
        /**
         * L'action de conversion du site public : acheter, s'inscrire.
         *
         * Elle est BLEUE et non GreenYellow. Le vert-jaune est la signature
         * de la marque — il ponctue, il ne peut pas porter tous les boutons
         * sans saturer la page. Le bleu isole donc l'action qui engage.
         *
         * Le nom `accent` est conservé : 14 points d'appel s'y réfèrent, et
         * il désigne bien un rôle — la couleur d'accentuation — et non un
         * jeton. Les classes `bg-accent`/`text-accent-fg` qu'il portait
         * auparavant n'existaient plus depuis le passage aux jetons de rôle :
         * la variante rendait des boutons sans aucun fond.
         */
        accent: 'bg-secondary text-secondary-fg hover:bg-secondary-hover shadow-e1',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-4 text-base',
        lg: 'h-11 px-6 text-md',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type Variants = VariantProps<typeof buttonVariants>

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
    Variants {
  /** Affiche un indicateur et neutralise le bouton, sans changer sa largeur. */
  loading?: boolean
  /** Rend l'élément enfant plutôt qu'un `<button>` — utile pour un lien stylé. */
  asChild?: boolean
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  loading,
  asChild,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* Le libellé reste monté et devient transparent : le remplacer par le
          seul indicateur ferait rétrécir le bouton et sauter la mise en page. */}
      {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
      {children}
    </Comp>
  )
}

export interface ButtonLinkProps extends React.ComponentProps<typeof Link>, Variants {}

export function ButtonLink({ className, variant, size, fullWidth, ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonVariants({ variant, size, fullWidth }), className)} {...props} />
  )
}
