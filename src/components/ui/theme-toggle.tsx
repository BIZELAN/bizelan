'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

import { applyTheme, readStoredTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Système', icon: Monitor },
]

/**
 * Sélecteur de thème en trois positions.
 *
 * « Système » est proposé explicitement plutôt qu'une simple bascule à deux
 * états : sans lui, un visiteur qui choisit une fois le clair reste enfermé
 * dedans même lorsque son appareil passe en sombre le soir.
 *
 * Le composant ne rend rien avant d'être monté : le thème n'est lisible que
 * côté navigateur, et afficher une position par défaut arbitraire au rendu
 * serveur provoquerait une erreur d'hydratation.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => setTheme(readStoredTheme()), [])

  const select = (next: Theme) => {
    setTheme(next)
    applyTheme(next)
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-pill border border-line bg-canvas-subtle p-0.5',
        className,
      )}
      role="group"
      aria-label="Thème de l’interface"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => select(option.value)}
            aria-pressed={theme === null ? undefined : active}
            title={option.label}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-pill transition-colors duration-fast',
              active
                ? 'bg-surface text-fg shadow-e1'
                : 'text-fg-subtle hover:text-fg',
            )}
          >
            <option.icon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
