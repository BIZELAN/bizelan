'use client'

import * as RadixSwitch from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

/**
 * Interrupteur.
 *
 * À réserver aux réglages qui s'appliquent **immédiatement**. Pour un champ de
 * formulaire validé par un bouton d'enregistrement, la case à cocher reste la
 * bonne forme : un interrupteur promet un effet instantané qu'un formulaire ne
 * tient pas.
 *
 * La bordure emploie `--control-border`, seul jeton dont le contraste de 3:1
 * est garanti — l'interrupteur est un contrôle, sa forme doit être perceptible.
 */
export function Switch({
  label,
  description,
  className,
  id,
  ...props
}: RadixSwitch.SwitchProps & { label?: string; description?: string }) {
  const control = (
    <RadixSwitch.Root
      id={id}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill border transition-colors duration-fast',
        'border-line-control bg-canvas-subtle',
        'data-[state=checked]:border-primary-text data-[state=checked]:bg-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-text focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-pill bg-surface shadow-e1',
          'translate-x-1 transition-transform duration-fast ease-out',
          'data-[state=checked]:translate-x-6 data-[state=checked]:bg-primary-fg',
        )}
      />
    </RadixSwitch.Root>
  )

  if (!label) return control

  return (
    <div className="flex items-start gap-3">
      {control}
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-base font-medium text-fg">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
    </div>
  )
}
