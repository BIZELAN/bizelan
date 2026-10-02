'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

function remaining(endsAt: number, now: number) {
  const total = Math.max(0, endsAt - now)
  return {
    total,
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total / 3_600_000) % 24),
    minutes: Math.floor((total / 60_000) % 60),
    seconds: Math.floor((total / 1000) % 60),
  }
}

/**
 * Compte à rebours jusqu'à une date.
 *
 * Rien n'est calculé au rendu serveur : l'heure du serveur et celle du
 * visiteur diffèrent, et le premier affichage serait faux d'autant (et
 * provoquerait un écart d'hydratation). Le compteur apparaît dès que la page
 * est interactive, puis se met à jour chaque seconde.
 *
 * Une fois le délai écoulé, le message de fin remplace le compteur.
 */
export function Countdown({
  endsAt,
  label,
  expiredText = 'Cette offre est terminée.',
  size = 'md',
  className,
}: {
  endsAt: string
  label?: string | null
  expiredText?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const target = new Date(endsAt).getTime()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  if (!Number.isFinite(target)) return null

  const r = remaining(target, now ?? target)
  const expired = now !== null && r.total === 0

  if (expired) {
    return expiredText ? (
      <p className={cn('text-center font-medium text-fg-muted', className)}>{expiredText}</p>
    ) : null
  }

  const units = [
    { value: r.days, label: r.days > 1 ? 'jours' : 'jour' },
    { value: r.hours, label: 'heures' },
    { value: r.minutes, label: 'min' },
    { value: r.seconds, label: 'sec' },
  ]
  // Moins d'un jour : le compteur des jours (à zéro) n'apporte rien.
  const shown = r.days === 0 && now !== null ? units.slice(1) : units

  const box = {
    sm: 'min-w-[2.75rem] px-1.5 py-1.5 [&_strong]:text-lg',
    md: 'min-w-[3.75rem] px-2 py-2.5 [&_strong]:text-2xl',
    lg: 'min-w-[4.5rem] px-3 py-3.5 [&_strong]:text-3xl sm:min-w-[5.5rem] sm:[&_strong]:text-5xl',
  }[size]

  return (
    <div className={cn('flex flex-col items-center gap-2', className)} role="timer" aria-live="off">
      {label && <p className="text-center text-sm font-semibold text-fg">{label}</p>}
      <div className="flex items-stretch justify-center gap-1.5 sm:gap-2">
        {shown.map((u, i) => (
          <div
            key={u.label}
            className={cn(
              'flex flex-col items-center rounded-md border border-line bg-surface text-fg shadow-e1',
              box,
            )}
          >
            <strong className="font-bold tabular-nums leading-none">
              {now === null ? '--' : String(u.value).padStart(i === 0 && shown.length === 4 ? 1 : 2, '0')}
            </strong>
            <span className="mt-1 text-[0.6875rem] uppercase tracking-wider text-fg-subtle">{u.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
