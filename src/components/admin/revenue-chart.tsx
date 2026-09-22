'use client'

import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatPrice } from '@/lib/utils'

/**
 * Recharts applique les couleurs en attributs SVG : il lui faut des valeurs
 * littérales, pas des classes Tailwind.
 *
 * Elles étaient donc recopiées en dur, avec un commentaire demandant de les
 * tenir synchronisées à la main. Cette synchronisation n'a pas eu lieu : le
 * graphique est resté sur les hexadécimaux sombres de l'ancienne palette et
 * dessinait une grille presque noire sur le fond clair du tableau de bord.
 *
 * Les valeurs sont maintenant LUES sur le document au moment du rendu. Une
 * copie ne peut plus diverger de sa source, et le graphique suit le thème
 * comme le reste de l'interface.
 */
const TOKENS = {
  grid: '--border',
  axis: '--border-strong',
  tick: '--text-subtle',
  line: '--primary-text',
  panel: '--surface-raised',
  text: '--text',
} as const

type Palette = Record<keyof typeof TOKENS, string>

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement)
  const entries = Object.entries(TOKENS).map(([key, variable]) => {
    // Les jetons sont stockés en canaux RVB séparés par des espaces, ce qui
    // permet les modificateurs d'opacité de Tailwind. Il faut donc les
    // réemballer ici.
    const channels = style.getPropertyValue(variable).trim()
    return [key, channels ? `rgb(${channels})` : 'currentColor']
  })
  return Object.fromEntries(entries) as Palette
}

/**
 * Le thème peut changer de deux façons : l'utilisateur bascule l'interrupteur,
 * ce qui écrit `data-theme` sur <html>, ou le système change d'avis pendant que
 * la page est ouverte. Les deux doivent redessiner le graphique.
 */
function usePalette(): Palette | null {
  const [palette, setPalette] = useState<Palette | null>(null)

  useEffect(() => {
    const sync = () => setPalette(readPalette())
    sync()

    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', sync)

    return () => {
      observer.disconnect()
      media.removeEventListener('change', sync)
    }
  }, [])

  return palette
}

export interface RevenuePoint {
  day: string
  value: number
}

function shortDate(iso: string) {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(date)
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const hasRevenue = data.some((d) => d.value > 0)
  const colors = usePalette()

  if (!hasRevenue) {
    return (
      <div className="flex h-56 items-center justify-center rounded-md bg-canvas-subtle text-base text-fg-subtle">
        Aucune vente enregistrée sur cette période.
      </div>
    )
  }

  // Avant la lecture des jetons — rendu serveur, première peinture — on réserve
  // la hauteur plutôt que de dessiner avec de fausses couleurs.
  if (!colors) return <div className="h-56 w-full" aria-hidden />

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.line} stopOpacity={0.35} />
              <stop offset="100%" stopColor={colors.line} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={shortDate}
            tick={{ fontSize: 11, fill: colors.tick }}
            tickLine={false}
            axisLine={{ stroke: colors.axis }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: colors.tick }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            labelFormatter={(label: string) => shortDate(label)}
            formatter={(value: number) => [formatPrice(value), 'Revenus']}
            // Sans curseur explicite, Recharts dessine une bande quasi opaque
            // qui éblouit en thème sombre.
            cursor={{ stroke: colors.axis, strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${colors.axis}`,
              backgroundColor: colors.panel,
              fontSize: 13,
              color: colors.text,
            }}
            labelStyle={{ color: colors.tick }}
            itemStyle={{ color: colors.text }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.line}
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
