'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { Button } from '@/components/ui/button'

/** Copie une valeur dans le presse-papiers, avec un retour visible. */
export function CopyButton({
  value,
  label = 'Copier',
  size = 'sm',
  variant = 'outline',
}: {
  value: string
  label?: string
  size?: 'sm' | 'md'
  variant?: 'outline' | 'ghost' | 'secondary'
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Navigateur sans API presse-papiers (contexte non sécurisé) : repli.
      const area = document.createElement('textarea')
      area.value = value
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={copy} aria-live="polite">
      {copied ? (
        <Check className="h-4 w-4 text-success" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
      {copied ? 'Copié' : label}
    </Button>
  )
}
