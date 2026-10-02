'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

import { Button, type ButtonProps } from '@/components/ui/button'

/**
 * Bouton d'envoi qui se désactive et tourne pendant l'envoi du formulaire
 * qui le contient : un second clic n'envoie pas une seconde fois.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: Omit<ButtonProps, 'type'> & { pendingLabel?: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
