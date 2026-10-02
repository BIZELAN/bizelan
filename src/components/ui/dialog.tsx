'use client'

import * as React from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Modale et tiroir latéral, tous deux bâtis sur Radix Dialog.
 *
 * Radix fournit ce qu'une implémentation maison oublie presque toujours :
 * piège à focus, restitution du focus à la fermeture, `aria-modal`, inertie
 * du reste de la page pour les lecteurs d'écran, fermeture par Échap et par
 * clic extérieur. Rien de tout cela n'est réécrit ici.
 */

export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export const DialogClose = RadixDialog.Close

function Overlay({ className, ...props }: RadixDialog.DialogOverlayProps) {
  return (
    <RadixDialog.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-canvas/70 backdrop-blur-sm',
        'data-[state=open]:animate-fade-in',
        className,
      )}
      {...props}
    />
  )
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
} as const

/** Modale centrée. */
export function DialogContent({
  title,
  description,
  size = 'md',
  className,
  children,
  ...props
}: RadixDialog.DialogContentProps & {
  title: string
  description?: string
  size?: keyof typeof SIZES
}) {
  return (
    <RadixDialog.Portal>
      <Overlay />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
          'rounded-lg border border-line bg-surface-raised shadow-e3 focus:outline-none',
          'data-[state=open]:animate-fade-up',
          SIZES[size],
          className,
        )}
        {...props}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <RadixDialog.Title className="text-lg font-semibold text-fg">{title}</RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="mt-1 text-sm text-fg-muted">
                {description}
              </RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg">
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Fermer</span>
          </RadixDialog.Close>
        </header>

        <div className="px-5 py-5">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}

/** Pied de modale : actions alignées à droite, ordre inversé en mobile. */
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}

/** Tiroir latéral — même mécanique, ancré à un bord. */
export function DrawerContent({
  title,
  description,
  side = 'right',
  className,
  children,
  ...props
}: RadixDialog.DialogContentProps & {
  title: string
  description?: string
  side?: 'left' | 'right'
}) {
  return (
    <RadixDialog.Portal>
      <Overlay />
      <RadixDialog.Content
        className={cn(
          'fixed inset-y-0 z-50 flex w-[min(28rem,90vw)] flex-col bg-surface shadow-e3 focus:outline-none',
          'data-[state=open]:animate-fade-in',
          side === 'right' ? 'right-0 border-l border-line' : 'left-0 border-r border-line',
          className,
        )}
        {...props}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <RadixDialog.Title className="text-lg font-semibold text-fg">{title}</RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="mt-1 text-sm text-fg-muted">
                {description}
              </RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-canvas-subtle hover:text-fg">
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Fermer</span>
          </RadixDialog.Close>
        </header>

        {/* Seul le corps défile : l'en-tête et le pied restent accessibles. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}
