'use client'

import { useState } from 'react'
import { Ban, Blend, Film, ImageIcon, PaintBucket } from 'lucide-react'

import { ColorPicker } from '@/components/admin/color-picker'
import { MediaField } from '@/components/admin/media-input'
import { Checkbox, Select } from '@/components/ui/field'
import type { BlockBackgroundType, BlockStyle } from '@/lib/blocks'
import { cn } from '@/lib/utils'

const TYPES: { value: BlockBackgroundType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'none', label: 'Aucun', Icon: Ban },
  { value: 'color', label: 'Couleur', Icon: PaintBucket },
  { value: 'gradient', label: 'Dégradé', Icon: Blend },
  { value: 'image', label: 'Image', Icon: ImageIcon },
  { value: 'video', label: 'Vidéo en boucle', Icon: Film },
]

/**
 * Fond et mise en page d'un bloc.
 *
 * Le bloc garde son contenu ; seul son arrière-plan change. Sur une image ou
 * une vidéo, un voile règle la lisibilité, et la couleur du texte s'adapte
 * d'elle-même (ou se force).
 */
export function BlockStyleEditor({
  value,
  onChange,
}: {
  value: BlockStyle | undefined
  onChange: (style: BlockStyle | undefined) => void
}) {
  const style = value ?? {}
  const type = style.bgType ?? 'none'
  const set = (patch: Partial<BlockStyle>) => {
    const next = { ...style, ...patch }
    const meaningful = Object.entries(next).some(([k, v]) => v !== undefined && !(k === 'bgType' && v === 'none'))
    onChange(meaningful ? next : undefined)
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium text-fg">Arrière-plan</p>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5" role="radiogroup" aria-label="Type d’arrière-plan">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={type === t.value}
              onClick={() => set({ bgType: t.value })}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-md border px-2 py-2.5 text-xs font-medium transition-colors',
                type === t.value
                  ? 'border-primary-text bg-primary-subtle text-primary-text'
                  : 'border-line text-fg-muted hover:bg-canvas-subtle hover:text-fg',
              )}
            >
              <t.Icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {type === 'color' && (
        <ColorSlot label="Couleur du fond" value={style.bgColor} onChange={(c) => set({ bgColor: c })} />
      )}

      {type === 'gradient' && (
        <div className="space-y-3">
          <ColorSlot label="Première couleur" value={style.bgColor} onChange={(c) => set({ bgColor: c })} />
          <ColorSlot label="Seconde couleur" value={style.bgColor2} onChange={(c) => set({ bgColor2: c })} />
          <label className="block text-sm">
            <span className="mb-1 flex justify-between font-medium text-fg">
              Orientation <span className="text-fg-subtle">{style.bgAngle ?? 135}°</span>
            </span>
            <input
              type="range"
              min={0}
              max={360}
              step={15}
              value={style.bgAngle ?? 135}
              onChange={(e) => set({ bgAngle: Number(e.target.value) })}
              className="w-full accent-[rgb(var(--primary-text))]"
            />
          </label>
        </div>
      )}

      {type === 'image' && (
        <div className="space-y-3">
          <MediaField value={style.bgImage ?? ''} onChange={(v) => set({ bgImage: v || undefined })} accept="image" height="h-24" />
          <Checkbox
            checked={Boolean(style.fixed)}
            onChange={(e) => set({ fixed: e.target.checked || undefined })}
            label="Image fixe au défilement (effet de profondeur)"
          />
        </div>
      )}

      {type === 'video' && (
        <div className="space-y-3">
          <MediaField value={style.bgVideo ?? ''} onChange={(v) => set({ bgVideo: v || undefined })} accept="media" height="h-24" />
          <p className="text-xs text-fg-subtle">
            Vidéo MP4 ou WebM courte (10 à 30 s), sans son : elle tourne en boucle, muette. Visez
            moins de 15 Mo pour un chargement rapide sur mobile.
          </p>
          <div>
            <p className="mb-1.5 text-sm font-medium text-fg">Image d’attente (facultatif)</p>
            <MediaField value={style.bgPoster ?? ''} onChange={(v) => set({ bgPoster: v || undefined })} accept="image" height="h-16" />
          </div>
        </div>
      )}

      {(type === 'image' || type === 'video') && (
        <div className="space-y-3 rounded-md border border-line p-3">
          <label className="block text-sm">
            <span className="mb-1 flex justify-between font-medium text-fg">
              Voile pour la lisibilité <span className="text-fg-subtle">{style.overlay ?? 45} %</span>
            </span>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={style.overlay ?? 45}
              onChange={(e) => set({ overlay: Number(e.target.value) })}
              className="w-full accent-[rgb(var(--primary-text))]"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { c: '#000000', label: 'Sombre' },
              { c: '#ffffff', label: 'Clair' },
              { c: '#0d2b20', label: 'Vert profond' },
            ].map((o) => (
              <button
                key={o.c}
                type="button"
                onClick={() => set({ overlayColor: o.c })}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs',
                  (style.overlayColor ?? '#000000') === o.c ? 'border-primary-text text-primary-text' : 'border-line text-fg-muted',
                )}
              >
                <span className="h-3 w-3 rounded-full border border-line" style={{ backgroundColor: o.c }} />
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-fg">Couleur du texte</span>
          <Select value={style.tone ?? 'auto'} onChange={(e) => set({ tone: e.target.value as BlockStyle['tone'] })}>
            <option value="auto">Automatique (selon le fond)</option>
            <option value="light">Texte clair</option>
            <option value="dark">Texte foncé</option>
          </Select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-fg">Espacement vertical</span>
          <Select value={style.spacing ?? 'default'} onChange={(e) => set({ spacing: e.target.value as BlockStyle['spacing'] })}>
            <option value="default">Normal</option>
            <option value="sm">Réduit</option>
            <option value="lg">Large</option>
            <option value="none">Aucun</option>
          </Select>
        </label>
      </div>

      <Checkbox
        checked={Boolean(style.fullHeight)}
        onChange={(e) => set({ fullHeight: e.target.checked || undefined })}
        label="Occuper toute la hauteur de l’écran"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-xs font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline"
        >
          Réinitialiser le fond et la mise en page
        </button>
      )}
    </div>
  )
}

function ColorSlot({ label, value, onChange }: { label: string; value?: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-md border border-line-control px-3 py-2 text-left text-sm hover:bg-canvas-subtle"
      >
        <span
          className="h-6 w-6 shrink-0 rounded border border-line"
          style={{ backgroundColor: value ?? 'transparent' }}
          aria-hidden
        />
        <span className="flex-1 font-medium text-fg">{label}</span>
        <span className="font-mono text-xs uppercase text-fg-subtle">{value ?? 'À choisir'}</span>
      </button>
      {open && (
        <div className="mt-2 rounded-md border border-line p-3">
          <ColorPicker
            value={value}
            onPick={(c) => {
              onChange(c)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
