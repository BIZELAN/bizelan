'use client'

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
 * littérales, pas des classes Tailwind. Ces constantes reprennent donc à
 * l'identique les jetons du thème — à tenir synchronisées avec
 * `tailwind.config.ts` si la palette évolue.
 */
const COLORS = {
  grid: '#1b3a2b', // surface-700
  axis: '#27503b', // surface-600
  tick: '#718c7f', // onDark-lo
  line: '#55ae87', // brand-400
  panel: '#13291e', // surface-800
  text: '#eaf2ed', // onDark-hi
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

  if (!hasRevenue) {
    return (
      <div className="flex h-56 items-center justify-center rounded-control bg-surface-900 text-body text-onDark-lo">
        Aucune vente enregistrée sur cette période.
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.line} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLORS.line} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={shortDate}
            tick={{ fontSize: 11, fill: COLORS.tick }}
            tickLine={false}
            axisLine={{ stroke: COLORS.axis }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: COLORS.tick }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            labelFormatter={(label: string) => shortDate(label)}
            formatter={(value: number) => [formatPrice(value), 'Revenus']}
            // Sans curseur explicite, Recharts dessine une bande blanche
            // quasi opaque qui éblouit sur un fond sombre.
            cursor={{ stroke: COLORS.axis, strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${COLORS.axis}`,
              backgroundColor: COLORS.panel,
              fontSize: 13,
              color: COLORS.text,
            }}
            labelStyle={{ color: COLORS.tick }}
            itemStyle={{ color: COLORS.text }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={COLORS.line}
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
