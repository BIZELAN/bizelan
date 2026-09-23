'use client'

import { useMemo, useState } from 'react'

import { FormSection } from '@/components/admin/shell'
import { Field, Input, Select } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { parseTheme, themeWarnings, type SiteTheme } from '@/lib/site-theme'
import { buildGradient, deriveRole, parseHex } from '@/lib/theme-tokens'
import { cn } from '@/lib/utils'
import type { SiteSettings } from '@/lib/types'

/**
 * Réglage de l'apparence du site public.
 *
 * L'administration ne choisit que des COULEURS DE MARQUE. Le texte lisible, le
 * survol et le voile sont recalculés à l'affichage, et le calcul s'arrête sur
 * une mesure de contraste : une couleur mal choisie ne peut pas rendre le site
 * illisible. C'est ce qui permet d'ouvrir ce réglage sans filet de sécurité
 * humain.
 *
 * Les fonds, les textes et les bordures restent volontairement hors de portée :
 * ce sont eux qui portent la lisibilité de l'ensemble, et les ouvrir
 * reviendrait à confier le contraste à l'œil de qui remplit le formulaire.
 *
 * L'aperçu est calculé avec EXACTEMENT les fonctions qui serviront au rendu :
 * ce qui est montré ici est ce qui sera publié, pas une approximation.
 */
export function ThemeSection({ settings }: { settings: SiteSettings }) {
  const initial = parseTheme(settings.theme)
  const [theme, setTheme] = useState<SiteTheme>(initial)

  const set = (patch: Partial<SiteTheme>) => setTheme((t) => ({ ...t, ...patch }))

  const warnings = useMemo(() => themeWarnings(theme), [theme])

  return (
    <FormSection
      title="Apparence"
      description="Les couleurs de marque du site public. La console d’administration garde les siennes."
    >
      {warnings.length > 0 && (
        <Alert tone="warning">
          <ul className="space-y-1">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <ColorField
          name="theme_primary"
          label="Couleur principale"
          help="Boutons, liens, éléments actifs."
          value={theme.primary ?? ''}
          onChange={(primary) => set({ primary })}
        />
        <ColorField
          name="theme_secondary"
          label="Couleur secondaire"
          help="Actions d’achat, accents de second rang."
          value={theme.secondary ?? ''}
          onChange={(secondary) => set({ secondary })}
        />
      </div>

      <Preview theme={theme} />

      <div className="grid gap-5 sm:grid-cols-3">
        <ColorField
          name="theme_gradient_from"
          label="Dégradé — début"
          value={theme.gradientFrom ?? ''}
          onChange={(gradientFrom) => set({ gradientFrom })}
        />
        <ColorField
          name="theme_gradient_to"
          label="Dégradé — fin"
          value={theme.gradientTo ?? ''}
          onChange={(gradientTo) => set({ gradientTo })}
        />
        <Field label="Inclinaison" htmlFor="theme_gradient_angle" help="En degrés. 135 = diagonale.">
          <Input
            id="theme_gradient_angle"
            name="theme_gradient_angle"
            type="number"
            min={0}
            max={359}
            value={theme.gradientAngle ?? 135}
            onChange={(e) => set({ gradientAngle: Number(e.target.value) })}
          />
        </Field>
      </div>

      <GradientPreview theme={theme} />

      <Field
        label="Arrondi des angles"
        htmlFor="theme_radius"
        help="S’applique aux boutons, champs et cartes du site public."
      >
        <Select
          id="theme_radius"
          name="theme_radius"
          value={theme.radius ?? 'md'}
          onChange={(e) => set({ radius: e.target.value as SiteTheme['radius'] })}
        >
          <option value="sm">Net — angles peu arrondis</option>
          <option value="md">Équilibré — réglage actuel</option>
          <option value="lg">Doux — angles très arrondis</option>
        </Select>
      </Field>
    </FormSection>
  )
}

/* ------------------------------------------------------------------ */

function ColorField({
  name,
  label,
  help,
  value,
  onChange,
}: {
  name: string
  label: string
  help?: string
  value: string
  onChange: (value: string) => void
}) {
  const valid = value === '' || parseHex(value) !== null

  return (
    <Field label={label} htmlFor={name} help={help}>
      <div className="flex gap-2">
        {/* Deux entrées pour la même valeur : le sélecteur natif pour choisir,
            le champ texte pour coller un code de charte graphique — celui-ci
            arrive presque toujours sous forme hexadécimale. */}
        <input
          type="color"
          aria-label={`${label} — sélecteur`}
          value={parseHex(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-line-control bg-surface p-1"
        />
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ADFF2F"
          spellCheck={false}
          aria-invalid={!valid}
          className={cn('font-mono', !valid && 'border-danger')}
        />
      </div>
    </Field>
  )
}

const LIGHT_BG = { r: 246, g: 248, b: 247 }
const DARK_BG = { r: 10, g: 16, b: 13 }

/** Aperçu des deux thèmes côte à côte : une couleur peut tenir dans l'un et pas dans l'autre. */
function Preview({ theme }: { theme: SiteTheme }) {
  const color = parseHex(theme.primary ?? '')
  if (!color) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(
        [
          ['Thème clair', LIGHT_BG, '#f6f8f7'],
          ['Thème sombre', DARK_BG, '#0a100d'],
        ] as const
      ).map(([label, bg, hex]) => {
        const role = deriveRole(color, bg)
        return (
          <div
            key={label}
            className="rounded-md border border-line p-4"
            style={{ backgroundColor: hex }}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] opacity-60"
               style={{ color: `rgb(${role.text})` }}>
              {label}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold"
                style={{ backgroundColor: `rgb(${role.fill})`, color: `rgb(${role.onFill})` }}
              >
                Bouton
              </span>
              <span
                className="inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: `rgb(${role.subtle})`, color: `rgb(${role.text})` }}
              >
                Pastille
              </span>
              <span className="text-sm underline" style={{ color: `rgb(${role.text})` }}>
                Un lien
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GradientPreview({ theme }: { theme: SiteTheme }) {
  const css = buildGradient({
    from: theme.gradientFrom ?? '',
    to: theme.gradientTo ?? '',
    angle: theme.gradientAngle ?? 135,
  })
  if (!css) return null

  return (
    <div
      className="flex h-24 items-center justify-center rounded-md border border-line"
      style={{ backgroundImage: css }}
    >
      <span className="text-sm font-semibold text-white mix-blend-difference">
        Aperçu du dégradé
      </span>
    </div>
  )
}
