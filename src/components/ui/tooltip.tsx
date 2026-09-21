'use client'

import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Infobulle.
 *
 * Le fournisseur porte un `delayDuration` commun : sans lui, chaque infobulle
 * gère son propre délai et survoler une rangée d'icônes déclenche une cascade
 * désordonnée. Radix mutualise aussi le « survol rapide » — une fois la
 * première ouverte, les suivantes apparaissent sans attendre.
 *
 * Une infobulle n'est JAMAIS le seul porteur d'une information : elle
 * n'apparaît ni au toucher, ni pour un lecteur d'écran si le déclencheur n'a
 * pas de nom accessible. Toujours doubler d'un `aria-label` ou d'un `sr-only`.
 */
export const TooltipProvider = RadixTooltip.Provider

export function Tooltip({
  content,
  side = 'top',
  children,
}: {
  content: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: ReactNode
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className={cn(
            'z-50 max-w-xs rounded-md border border-line bg-surface-raised px-2.5 py-1.5',
            'text-sm text-fg shadow-e2 data-[state=delayed-open]:animate-fade-in',
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-[rgb(var(--surface-raised))]" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
