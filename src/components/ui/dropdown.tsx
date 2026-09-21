'use client'

import * as RadixMenu from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Menu déroulant. Radix apporte la navigation au clavier complète (flèches,
 * Début/Fin, recherche par frappe), le repositionnement automatique quand le
 * menu déborde de la fenêtre, et la fermeture au clic extérieur.
 */

export const Dropdown = RadixMenu.Root
export const DropdownTrigger = RadixMenu.Trigger
export const DropdownGroup = RadixMenu.Group

const ITEM =
  'flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-base outline-none ' +
  'text-fg-muted transition-colors duration-fast ' +
  'data-[highlighted]:bg-canvas-subtle data-[highlighted]:text-fg ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'

export function DropdownContent({
  className,
  align = 'end',
  sideOffset = 8,
  ...props
}: RadixMenu.DropdownMenuContentProps) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[12rem] rounded-lg border border-line bg-surface-raised p-1.5 shadow-e2',
          'data-[state=open]:animate-fade-up',
          className,
        )}
        {...props}
      />
    </RadixMenu.Portal>
  )
}

export function DropdownItem({ className, ...props }: RadixMenu.DropdownMenuItemProps) {
  return <RadixMenu.Item className={cn(ITEM, className)} {...props} />
}

export function DropdownCheckboxItem({
  className,
  children,
  ...props
}: RadixMenu.DropdownMenuCheckboxItemProps) {
  return (
    <RadixMenu.CheckboxItem className={cn(ITEM, 'pl-8', className)} {...props}>
      <RadixMenu.ItemIndicator className="absolute left-2.5">
        <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
      </RadixMenu.ItemIndicator>
      {children}
    </RadixMenu.CheckboxItem>
  )
}

export function DropdownLabel({ className, ...props }: RadixMenu.DropdownMenuLabelProps) {
  return (
    <RadixMenu.Label
      className={cn('px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle', className)}
      {...props}
    />
  )
}

export function DropdownSeparator({ className, ...props }: RadixMenu.DropdownMenuSeparatorProps) {
  return <RadixMenu.Separator className={cn('my-1 h-px bg-line', className)} {...props} />
}
