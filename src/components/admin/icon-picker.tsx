'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/field'
import { ICON_GROUPS, ICON_LIST, resolveIcon, searchIcons, type IconEntry } from '@/lib/icons'
import { cn } from '@/lib/utils'

/**
 * Choix d'une icône.
 *
 * Toute la bibliothèque s'affiche D'UN COUP, en grandes vignettes, dans une
 * fenêtre large : on choisit des yeux plutôt qu'en devinant un nom. Le
 * précédent menu déroulant faisait 320 px de haut et cachait l'essentiel des
 * icônes derrière un défilement qu'on ne remarquait pas.
 *
 * Deux façons de réduire la grille sans rien masquer par défaut :
 *   · les onglets de thème (Formation, Agriculture, Finance…) ;
 *   · la recherche, sur des libellés FRANÇAIS et des mots-clés — « argent »
 *     trouve la pièce, le portefeuille et la tirelire.
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
  const [open, setOpen] = useState(false)
  const Current = resolveIcon(value)
  const currentEntry = ICON_LIST.find((entry) => entry.Icon === Current)

  return (
    <div>
      {/* La valeur part dans le formulaire comme avant : le sélecteur ne change
          que la façon de la saisir, pas ce qui est enregistré. */}
      {name && <input type="hidden" name={name} value={value} />}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'inline-flex h-12 items-center gap-3 rounded-md border px-3 text-sm transition-colors duration-fast',
            'border-line-control bg-surface hover:border-primary-text hover:bg-canvas-subtle',
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-subtle text-primary-text">
            {Current ? (
              <Current className="h-5 w-5" aria-hidden />
            ) : (
              <span className="h-4 w-4 rounded-sm border border-dashed border-line-control" aria-hidden />
            )}
          </span>
          <span className={cn('font-medium', !Current && 'text-fg-subtle')}>
            {Current ? (currentEntry?.label ?? value) : 'Choisir une icône'}
          </span>
          {Current && <span className="text-xs text-fg-subtle">Changer</span>}
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

      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <IconGallery
            value={value}
            onSelect={(iconName) => {
              onChange(iconName)
              setOpen(false)
            }}
          />
        )}
      </Dialog>
    </div>
  )
}

function IconGallery({ value, onSelect }: { value: string; onSelect: (name: string) => void }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string>('all')

  const sections = useMemo(() => {
    if (query.trim()) return [{ title: `Résultats pour « ${query.trim()} »`, icons: searchIcons(query) }]
    if (group === 'all') return ICON_GROUPS
    return ICON_GROUPS.filter((g) => g.title === group)
  }, [query, group])

  const count = sections.reduce((sum, s) => sum + s.icons.length, 0)

  return (
    <DialogContent
      title="Choisir une icône"
      description={`${ICON_LIST.length} icônes. Cliquez sur celle qui vous convient.`}
      size="xl"
      className="flex max-h-[92dvh] flex-col [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-1 [&>div:last-child]:flex-col"
    >
      <div className="relative shrink-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher : argent, formation, agriculture, contact…"
          aria-label="Chercher une icône"
          className="pl-9"
          autoFocus
        />
      </div>

      {!query.trim() && (
        <div className="-mx-1 mt-3 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar" role="tablist">
          {[{ title: 'all', label: 'Toutes' }, ...ICON_GROUPS.map((g) => ({ title: g.title, label: g.title }))].map(
            (tab) => (
              <button
                key={tab.title}
                type="button"
                role="tab"
                aria-selected={group === tab.title}
                onClick={() => setGroup(tab.title)}
                className={cn(
                  'shrink-0 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors duration-fast',
                  group === tab.title
                    ? 'border-primary-text bg-primary-subtle text-primary-text'
                    : 'border-line text-fg-muted hover:bg-canvas-subtle hover:text-fg',
                )}
              >
                {tab.label}
              </button>
            ),
          )}
        </div>
      )}

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {count === 0 ? (
          <p className="py-10 text-center text-sm text-fg-subtle">
            Aucune icône pour « {query} ». Essayez un autre mot.
          </p>
        ) : (
          sections.map((section) => (
            <section key={section.title} className="mb-6 last:mb-0">
              <h3 className="sticky top-0 z-10 mb-2 bg-surface-raised py-1 text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                {section.title} <span className="font-normal normal-case tracking-normal">· {section.icons.length}</span>
              </h3>
              <Grid entries={section.icons} value={value} onSelect={onSelect} />
            </section>
          ))
        )}
      </div>
    </DialogContent>
  )
}

function Grid({
  entries,
  value,
  onSelect,
}: {
  entries: IconEntry[]
  value: string
  onSelect: (name: string) => void
}) {
  const selected = resolveIcon(value)
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
      {entries.map((entry) => {
        const active = entry.Icon === selected
        return (
          <button
            key={entry.name}
            type="button"
            onClick={() => onSelect(entry.name)}
            title={entry.label}
            aria-pressed={active}
            className={cn(
              'flex flex-col items-center gap-2 rounded-md border px-1.5 py-3 transition-colors duration-fast',
              active
                ? 'border-primary-text bg-primary-subtle text-primary-text'
                : 'border-line bg-surface text-fg hover:border-primary-text hover:bg-primary-subtle hover:text-primary-text',
            )}
          >
            <entry.Icon className="h-7 w-7" />
            {/* Le libellé plutôt que le nom technique : c'est ce qu'on cherche
                des yeux quand on parcourt une grille. */}
            <span className="line-clamp-2 w-full text-center text-[0.6875rem] leading-tight">
              {entry.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
