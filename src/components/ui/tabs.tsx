'use client'

import * as RadixTabs from '@radix-ui/react-tabs'
import { motion, useReducedMotion } from 'motion/react'

import { cn } from '@/lib/utils'

/**
 * Onglets.
 *
 * L'indicateur actif glisse d'un onglet à l'autre via un `layoutId` partagé :
 * un seul élément est monté et Motion interpole sa position. Une bordure
 * rendue sous chaque onglet apparaîtrait et disparaîtrait sèchement.
 *
 * Radix gère la sémantique `role="tablist"` et la navigation aux flèches.
 */

export const Tabs = RadixTabs.Root

export function TabsList({ className, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={cn('relative flex items-center gap-1 border-b border-line', className)}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  children,
  value,
  ...props
}: RadixTabs.TabsTriggerProps) {
  const reduced = useReducedMotion()

  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        'group relative -mb-px px-3 py-2.5 text-base font-medium outline-none transition-colors duration-fast',
        'text-fg-muted hover:text-fg',
        'data-[state=active]:text-fg',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        className,
      )}
      {...props}
    >
      {children}
      <span className="absolute inset-x-0 bottom-0 hidden h-0.5 group-data-[state=active]:block">
        <motion.span
          layoutId="tabs-indicator"
          className="block h-full w-full rounded-pill bg-primary"
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
        />
      </span>
    </RadixTabs.Trigger>
  )
}

export function TabsContent({ className, ...props }: RadixTabs.TabsContentProps) {
  return (
    <RadixTabs.Content
      className={cn(
        'pt-5 outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'data-[state=active]:animate-fade-in',
        className,
      )}
      {...props}
    />
  )
}
