'use client'

import { useState } from 'react'
import { Laptop, Monitor, Smartphone } from 'lucide-react'

import { BlockRenderer, type BlockData } from '@/components/public/blocks/block-renderer'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import type { Block } from '@/lib/blocks'

/**
 * Aperçu en direct d'une composition de blocs.
 *
 * C'est le rendu RÉEL du site public, pas une imitation : le même moteur, les
 * mêmes composants, les mêmes feuilles de style. Il n'a été rendu possible
 * qu'en sortant les requêtes des blocs — ils interrogeaient chacun la base, ce
 * qui confinait le moteur au serveur. Les contenus arrivent maintenant en une
 * fois par `data`, et le rendu se refait à chaque frappe sans aller-retour.
 *
 * `data-site` restitue la palette PUBLIQUE à l'intérieur de la console, qui
 * porte la sienne sur <html>. Sans lui, l'aperçu s'afficherait en cyan et
 * mentirait sur ce que verra le visiteur.
 */

const WIDTHS = [
  { key: 'desktop', label: 'Ordinateur', icon: Monitor, width: '100%' },
  { key: 'tablet', label: 'Tablette', icon: Laptop, width: '48rem' },
  { key: 'mobile', label: 'Téléphone', icon: Smartphone, width: '23.4375rem' },
] as const

export function BlockPreview({ blocks, data }: { blocks: Block[]; data: BlockData }) {
  const [width, setWidth] = useState<(typeof WIDTHS)[number]['key']>('desktop')
  const visible = blocks.filter((b) => !b.hidden)

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Aperçu
        </p>

        <div className="ml-auto flex items-center gap-2">
          {/* Le sélecteur de thème agit sur <html> : l'aperçu suit, puisqu'il
              hérite du thème comme le site. On voit donc les deux rendus sans
              quitter l'éditeur. */}
          <ThemeToggle />

          <div
            className="inline-flex items-center gap-0.5 rounded-pill border border-line bg-canvas-subtle p-0.5"
            role="group"
            aria-label="Largeur d’aperçu"
          >
            {WIDTHS.map((option) => {
              const active = width === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setWidth(option.key)}
                  aria-pressed={active}
                  title={option.label}
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-pill transition-colors duration-fast',
                    active ? 'bg-surface text-fg shadow-e1' : 'text-fg-subtle hover:text-fg',
                  )}
                >
                  <option.icon className="h-4 w-4" aria-hidden />
                  <span className="sr-only">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-canvas-subtle p-4">
        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-fg-subtle">
            Ajoutez un bloc pour voir la page se construire ici.
          </p>
        ) : (
          <div
            data-site
            style={{ width: WIDTHS.find((w) => w.key === width)?.width }}
            className="mx-auto overflow-hidden rounded-md bg-canvas text-fg-muted shadow-e2 ring-1 ring-line transition-[width] duration-base"
          >
            {/* `key` sur la longueur ET les identifiants : un bloc retiré au
                milieu doit démonter le bon, pas décaler les suivants. */}
            <BlockRenderer key={visible.map((b) => b.id).join('|')} blocks={visible} context={{ data }} />
          </div>
        )}
      </div>
    </div>
  )
}
