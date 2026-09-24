'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'

import { Input } from '@/components/ui/field'
import { ICON_GROUPS, resolveIcon, searchIcons } from '@/lib/icons'
import { cn } from '@/lib/utils'

/**
 * Choix d'une icône.
 *
 * Le champ était un texte libre — « Icône (nom lucide) », à remplir avec
 * `clock` ou `play-circle` de mémoire. Une faute de frappe ne produisait
 * aucune erreur : `DynIcon` renvoyait `null` et l'icône manquait simplement
 * sur la page publiée, sans que rien ne le signale.
 *
 * La recherche porte sur des libellés FRANÇAIS et des mots-clés : on tape
 * « argent » et on trouve la pièce, le portefeuille et la tirelire, sans
 * avoir à deviner le nom anglais.
 */
export function IconPicker({
  name,
  value,
  onChange,
}: {
  /**
   * Nom du champ de formulaire. Omis quand le parent sérialise lui-même sa
   * valeur — l'éditeur de blocs dépose tout dans un champ caché unique, et un
   * second champ homonyme brouillerait la soumission.
   */
  name?: string
  value: string
  onChange: (value: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const Current = resolveIcon(value)
  const results = useMemo(() => (query ? searchIcons(query) : null), [query])

  const select = (iconName: string) => {
    onChange(iconName)
    setOpen(false)
    setQuery('')
  }

  return (
    <div>
      {/* La valeur part dans le formulaire comme avant : le sélecteur ne change
          que la façon de la saisir, pas ce qui est enregistré. */}
      {name && <input type="hidden" name={name} value={value} />}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors duration-fast',
            'border-line-control bg-surface hover:bg-canvas-subtle',
          )}
        >
          {Current ? (
            <Current className="h-4 w-4 text-primary-text" aria-hidden />
          ) : (
            <span className="h-4 w-4 rounded-sm border border-dashed border-line-control" aria-hidden />
          )}
          <span className={cn(!value && 'text-fg-subtle')}>
            {value && Current ? value : 'Choisir une icône'}
          </span>
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-danger-subtle hover:text-danger"
            aria-label="Retirer l’icône"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {/* Une valeur enregistrée avant le sélecteur peut ne correspondre à
          rien. Le dire vaut mieux que laisser une page publiée sans son
          icône, sans explication. */}
      {value && !Current && (
        <p className="mt-2 text-xs text-danger">
          « {value} » ne correspond à aucune icône de la bibliothèque. Choisissez-en une.
        </p>
      )}

      {open && (
        <div className="mt-3 rounded-md border border-line bg-surface">
          <div className="relative border-b border-line p-3">
            <Search
              className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher : argent, formation, contact…"
              aria-label="Chercher une icône"
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-3">
            {results ? (
              results.length === 0 ? (
                <p className="py-6 text-center text-sm text-fg-subtle">
                  Aucune icône pour « {query} ».
                </p>
              ) : (
                <Grid entries={results} value={value} onSelect={select} />
              )
            ) : (
              ICON_GROUPS.map((group) => (
                <div key={group.title} className="mb-5 last:mb-0">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                    {group.title}
                  </p>
                  <Grid entries={group.icons} value={value} onSelect={select} />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Grid({
  entries,
  value,
  onSelect,
}: {
  entries: { name: string; label: string; Icon: React.ComponentType<{ className?: string }> }[]
  value: string
  onSelect: (name: string) => void
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
      {entries.map((entry) => {
        const active = entry.name === value
        return (
          <button
            key={entry.name}
            type="button"
            onClick={() => onSelect(entry.name)}
            title={entry.label}
            aria-pressed={active}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-md border p-2 transition-colors duration-fast',
              active
                ? 'border-primary-text bg-primary-subtle text-primary-text'
                : 'border-transparent text-fg-muted hover:border-line hover:bg-canvas-subtle hover:text-fg',
            )}
          >
            <entry.Icon className="h-5 w-5" />
            {/* Le libellé plutôt que le nom technique : c'est ce qu'on cherche
                des yeux quand on parcourt une grille. */}
            <span className="w-full truncate text-center text-[0.6875rem] leading-tight">
              {entry.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
