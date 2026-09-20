import { cn } from '@/lib/utils'
import { initials } from '@/lib/utils'

const SIZES = {
  sm: 'h-8 w-8 text-[0.7rem]',
  md: 'h-11 w-11 text-meta',
  lg: 'h-14 w-14 text-body',
  xl: 'h-20 w-20 text-h3',
} as const

/**
 * Pastille de personne : photo si disponible, initiales sinon.
 * Réutilise `initials()` de `lib/utils.ts` plutôt que de refaire le découpage.
 */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name?: string | null
  src?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  const base = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-surface-600',
    SIZES[size],
    className,
  )

  if (src) {
    return (
      <span className={base}>
        <img src={src} alt={name ?? ''} className="h-full w-full object-cover" loading="lazy" />
      </span>
    )
  }

  return (
    <span
      className={cn(base, 'bg-surface-700 font-semibold uppercase tracking-wide text-brand-300')}
      aria-hidden={!name}
    >
      {initials(name)}
    </span>
  )
}

/** Rangée de portraits superposés — preuve sociale compacte. */
export function AvatarStack({
  people,
  max = 5,
  className,
}: {
  people: { name?: string | null; src?: string | null }[]
  max?: number
  className?: string
}) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length

  return (
    <div className={cn('flex items-center', className)}>
      <div className="flex -space-x-3">
        {shown.map((person, index) => (
          <Avatar
            key={index}
            name={person.name}
            src={person.src}
            size="sm"
            className="ring-2 ring-surface-950"
          />
        ))}
      </div>
      {rest > 0 && <span className="ml-3 text-meta text-onDark-lo">+{rest}</span>}
    </div>
  )
}
