'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CornerDownLeft, Search } from 'lucide-react'

import { ADMIN_NAV, type AdminNavItem } from '@/components/admin/nav-items'
import { cn } from '@/lib/utils'

/** Retire les accents pour que « medias » trouve « Médiathèque ». */
function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

interface Entry extends AdminNavItem {
  group: string
}

const ENTRIES: Entry[] = ADMIN_NAV.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.title ?? 'Général' })),
)

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const router = useRouter()
  const listRef = useRef<HTMLUListElement>(null)

  // Ctrl+K / Cmd+K. `preventDefault` est indispensable : Firefox assigne ce
  // raccourci à sa propre barre de recherche.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => {
    const q = fold(query.trim())
    if (!q) return ENTRIES
    return ENTRIES.filter((e) => fold(e.label).includes(q) || fold(e.group).includes(q))
  }, [query])

  // Le curseur peut pointer au-delà de la liste après un filtrage.
  useEffect(() => setCursor(0), [query])

  const go = (item: Entry | undefined) => {
    if (!item) return
    setOpen(false)
    setQuery('')
    router.push(item.href)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(results[cursor])
    }
  }

  // Maintient l'élément survolé au clavier dans le champ de vision.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-canvas-subtle px-3 text-sm text-fg-subtle transition-colors duration-fast hover:border-line-strong hover:text-fg-muted"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="ml-2 hidden rounded border border-line bg-surface px-1.5 font-sans text-xs text-fg-subtle sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <Dialog.Content
            onKeyDown={onKeyDown}
            className="fixed left-1/2 top-[15vh] z-50 w-[min(34rem,92vw)] -translate-x-1/2 overflow-hidden rounded-lg border border-line bg-surface-raised shadow-e3 data-[state=open]:animate-fade-up"
          >
            <Dialog.Title className="sr-only">Rechercher une page</Dialog.Title>
            <Dialog.Description className="sr-only">
              Saisissez pour filtrer, flèches pour naviguer, Entrée pour ouvrir.
            </Dialog.Description>

            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Aller à…"
                aria-label="Rechercher une page"
                className="h-12 flex-1 bg-transparent text-md text-fg outline-none placeholder:text-fg-subtle"
              />
            </div>

            <ul ref={listRef} className="max-h-[min(20rem,50vh)] overflow-y-auto p-2">
              {results.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-fg-subtle">
                  Aucune page ne correspond à « {query} ».
                </li>
              )}

              {results.map((item, index) => {
                const Icon = (Icons as unknown as Record<string, LucideIcon>)[item.icon]
                const active = index === cursor
                return (
                  <li key={item.href}>
                    <button
                      type="button"
                      data-active={active}
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => go(item)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-fast',
                        active ? 'bg-primary-subtle text-fg' : 'text-fg-muted',
                      )}
                    >
                      {Icon && (
                        <Icon
                          className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-fg-subtle')}
                          aria-hidden
                        />
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="text-xs text-fg-subtle">{item.group}</span>
                      {active && (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
