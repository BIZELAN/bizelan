'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AccordionItem {
  question: string
  answer: string
}

export function Accordion({ items, className }: { items: AccordionItem[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0)

  if (!items.length) return null

  return (
    <div
      className={cn(
        'divide-y divide-line overflow-hidden rounded-lg bg-surface ring-1 ring-line',
        className,
      )}
    >
      {items.map((item, index) => {
        const isOpen = open === index
        return (
          <div key={`${item.question}-${index}`}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-canvas-subtle"
            >
              <span
                className={cn(
                  'text-base font-medium transition-colors',
                  isOpen ? 'text-primary-text' : 'text-fg',
                )}
              >
                {item.question}
              </span>
              <ChevronDown
                className={cn(
                  'h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-200',
                  isOpen && 'rotate-180 text-primary-text',
                )}
                aria-hidden
              />
            </button>
            {/* Le repli anime la hauteur via une grille 0fr → 1fr : inutile de
                mesurer le contenu en JavaScript, et le rendu reste fluide. */}
            <div
              className={cn(
                'grid transition-all duration-200 ease-out',
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-base leading-relaxed text-fg-muted">{item.answer}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
