'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Pipette } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Sélecteur de couleur complet.
 *
 * L'ancien choix se limitait à douze pastilles et à un `<input type="color">`
 * natif minuscule, dont la fenêtre système varie d'un navigateur à l'autre et
 * fait perdre la sélection du texte sous Safari. Ici tout est dans la page :
 *
 *   · un nuancier (saturation × luminosité) et une réglette de teinte — on
 *     atteint n'importe laquelle des seize millions de couleurs ;
 *   · le code hexadécimal, à saisir ou à coller depuis une charte graphique ;
 *   · une palette étendue, et les dernières couleurs employées ;
 *   · la pipette du navigateur quand il la propose (Chrome, Edge).
 *
 * Les pastilles s'appliquent d'un clic. Le nuancier, lui, se règle d'abord et
 * s'applique ensuite par « Appliquer » : appliquer à chaque mouvement de la
 * souris empilerait des centaines d'étapes dans l'historique d'annulation.
 */

const PALETTE: string[] = [
  // Gris
  '#000000', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#ffffff',
  // Teintes vives
  '#b91c1c', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a', '#0d9488', '#0284c7', '#4f46e5', '#9333ea',
  // Claires
  '#fca5a5', '#fdba74', '#fcd34d', '#fde047', '#bef264', '#86efac', '#5eead4', '#7dd3fc', '#a5b4fc', '#d8b4fe',
  // Pâles
  '#fee2e2', '#ffedd5', '#fef3c7', '#fef9c3', '#ecfccb', '#dcfce7', '#ccfbf1', '#e0f2fe', '#e0e7ff', '#f3e8ff',
  // Profondes
  '#7f1d1d', '#7c2d12', '#78350f', '#713f12', '#365314', '#14532d', '#134e4a', '#0c4a6e', '#312e81', '#581c87',
  // Marque BIZELAN et roses
  '#adff2f', '#517800', '#227455', '#33916b', '#d3831a', '#db2777', '#e11d48', '#f472b6', '#fbcfe8', '#831843',
]

const RECENT_KEY = 'bz-recent-colors'

/* ------------------------------------------------------------------ */
/* Conversions                                                         */
/* ------------------------------------------------------------------ */

export function normalizeHex(value: string): string | null {
  let v = value.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(v)) v = v.split('').map((c) => c + c).join('')
  return /^[0-9a-f]{6}$/.test(v) ? `#${v}` : null
}

function hexToHsv(hex: string): [number, number, number] {
  const n = normalizeHex(hex) ?? '#000000'
  const r = parseInt(n.slice(1, 3), 16) / 255
  const g = parseInt(n.slice(3, 5), 16) / 255
  const b = parseInt(n.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, max ? delta / max : 0, max]
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(list) ? list.filter((c): c is string => typeof c === 'string').slice(0, 10) : []
  } catch {
    return []
  }
}

function pushRecent(color: string) {
  try {
    const next = [color, ...readRecent().filter((c) => c !== color)].slice(0, 10)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Stockage indisponible (navigation privée) : la palette reste utilisable.
  }
}

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function ColorPicker({
  value,
  onPick,
  onClear,
  clearLabel = 'Retirer la couleur',
}: {
  value?: string | null
  onPick: (color: string) => void
  onClear?: () => void
  clearLabel?: string
}) {
  const initial = normalizeHex(value ?? '') ?? '#227455'
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(initial))
  const [hexInput, setHexInput] = useState(initial)
  const [recent, setRecent] = useState<string[]>([])
  const area = useRef<HTMLDivElement>(null)
  const hueBar = useRef<HTMLDivElement>(null)

  useEffect(() => setRecent(readRecent()), [])

  const current = hsvToHex(hsv[0], hsv[1], hsv[2])

  useEffect(() => setHexInput(current), [current])

  const pick = useCallback(
    (color: string) => {
      const hex = normalizeHex(color)
      if (!hex) return
      pushRecent(hex)
      setRecent(readRecent())
      onPick(hex)
    },
    [onPick],
  )

  /** Suit le pointeur jusqu'au relâchement, même hors du nuancier. */
  function track(
    ref: React.RefObject<HTMLDivElement | null>,
    onMove: (x: number, y: number) => void,
  ) {
    return (event: React.PointerEvent) => {
      const el = ref.current
      if (!el) return
      event.preventDefault()
      const update = (clientX: number, clientY: number) => {
        const rect = el.getBoundingClientRect()
        const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
        const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
        onMove(x, y)
      }
      update(event.clientX, event.clientY)
      const move = (e: PointerEvent) => update(e.clientX, e.clientY)
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }
  }

  const eyeDropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window

  async function pickFromScreen() {
    try {
      const Ctor = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } })
        .EyeDropper
      const result = await new Ctor().open()
      const hex = normalizeHex(result.sRGBHex)
      if (hex) setHsv(hexToHsv(hex))
    } catch {
      // Annulé par Échap : rien à faire.
    }
  }

  return (
    <div className="w-full space-y-3">
      {/* Nuancier saturation × luminosité */}
      <div
        ref={area}
        onPointerDown={track(area, (x, y) => setHsv(([h]) => [h, x, 1 - y]))}
        className="relative h-36 w-full cursor-crosshair touch-none rounded-md"
        style={{
          backgroundColor: hsvToHex(hsv[0], 1, 1),
          backgroundImage:
            'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
        }}
        role="slider"
        aria-label="Saturation et luminosité"
        aria-valuetext={current}
      >
        <span
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${hsv[1] * 100}%`, top: `${(1 - hsv[2]) * 100}%`, backgroundColor: current }}
        />
      </div>

      {/* Teinte */}
      <div
        ref={hueBar}
        onPointerDown={track(hueBar, (x) => setHsv(([, s, v]) => [x * 359.9, s, v]))}
        className="relative h-3.5 w-full cursor-pointer touch-none rounded-pill"
        style={{
          background:
            'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
        }}
        role="slider"
        aria-label="Teinte"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv[0])}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${(hsv[0] / 360) * 100}%` }}
        />
      </div>

      {/* Code et application */}
      <div className="flex items-center gap-2">
        <span
          className="h-8 w-8 shrink-0 rounded-md border border-line"
          style={{ backgroundColor: current }}
          aria-hidden
        />
        <input
          value={hexInput}
          onChange={(e) => {
            setHexInput(e.target.value)
            const hex = normalizeHex(e.target.value)
            if (hex) setHsv(hexToHsv(hex))
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              pick(hexInput)
            }
          }}
          spellCheck={false}
          aria-label="Code couleur hexadécimal"
          className="h-8 min-w-0 flex-1 rounded-md border border-line-control bg-canvas px-2 font-mono text-sm uppercase text-fg outline-none focus:border-primary-text"
        />
        {eyeDropperSupported && (
          <button
            type="button"
            onClick={pickFromScreen}
            title="Prélever une couleur à l’écran"
            aria-label="Prélever une couleur à l’écran"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line-control text-fg-muted hover:bg-canvas-subtle hover:text-fg"
          >
            <Pipette className="h-4 w-4" aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={() => pick(current)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-fg hover:bg-primary-hover"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Appliquer
        </button>
      </div>

      {recent.length > 0 && (
        <div>
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-fg-subtle">Récentes</p>
          <Swatches colors={recent} active={value} onPick={pick} />
        </div>
      )}

      <div>
        <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-fg-subtle">Palette</p>
        <Swatches colors={PALETTE} active={value} onPick={pick} />
      </div>

      {onClear && (
        <button type="button" onClick={onClear} className="text-xs font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline">
          {clearLabel}
        </button>
      )}
    </div>
  )
}

function Swatches({
  colors,
  active,
  onPick,
}: {
  colors: string[]
  active?: string | null
  onPick: (color: string) => void
}) {
  const activeHex = normalizeHex(active ?? '')
  return (
    <div className="grid grid-cols-10 gap-1">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onPick(color)}
          title={color.toUpperCase()}
          aria-label={color}
          className={cn(
            'aspect-square w-full rounded-[4px] border border-line transition-transform hover:z-10 hover:scale-125',
            activeHex === color && 'ring-2 ring-primary-text ring-offset-1 ring-offset-surface',
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}
