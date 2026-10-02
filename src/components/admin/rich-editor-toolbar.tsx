'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Editor } from '@tiptap/react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Code,
  Highlighter,
  ImageIcon,
  Italic,
  Lightbulb,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  MousePointerClick,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
  Upload,
  Youtube,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { ColorPicker } from '@/components/admin/color-picker'
import { CALLOUT_TONES, CTA_VARIANTS, FONT_FAMILIES } from '@/lib/rich-content'

/* ------------------------------------------------------------------ */
/* Briques d'interface                                                 */
/* ------------------------------------------------------------------ */

function ToolButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-primary-subtle text-primary-text'
          : 'text-fg-muted hover:bg-canvas-subtle hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

function TextButton({
  onClick,
  disabled,
  children,
  tone = 'neutral',
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  tone?: 'neutral' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40',
        tone === 'danger'
          ? 'text-danger hover:bg-danger-subtle'
          : 'text-fg-muted hover:bg-canvas-subtle hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-canvas-subtle" aria-hidden />
}

/** Petit menu ancré, fermé au clic extérieur ou à la touche Échap. */
function Popover({
  label,
  title,
  active,
  width = 'w-64',
  children,
}: {
  label: ReactNode
  title: string
  active?: boolean
  width?: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  // Ancré à gauche par défaut ; s'il déborde de l'écran (bouton proche du
  // bord droit, téléphone), il bascule à droite pour rester entier.
  useLayoutEffect(() => {
    if (!open) {
      setAlignRight(false)
      return
    }
    const rect = panel.current?.getBoundingClientRect()
    if (rect && rect.right > window.innerWidth - 8) setAlignRight(true)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-8 items-center gap-1 rounded-md px-1.5 transition-colors',
          active || open
            ? 'bg-primary-subtle text-primary-text'
            : 'text-fg-muted hover:bg-canvas-subtle hover:text-fg',
        )}
      >
        {label}
        <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
      </button>

      {open && (
        <div
          ref={panel}
          className={cn(
            'absolute top-full z-30 mt-1 max-w-[calc(100vw-1.5rem)] rounded-lg border border-line bg-surface p-3 shadow-e3',
            alignRight ? 'right-0' : 'left-0',
            width,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

/** Champ + bouton de validation, utilisé pour les liens et les vidéos. */
function UrlForm({
  initial = '',
  placeholder,
  submitLabel,
  onSubmit,
}: {
  initial?: string
  placeholder: string
  submitLabel: string
  onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState(initial)

  return (
    <div className="flex gap-1.5">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onSubmit(value.trim())
          }
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-md border border-line-strong bg-canvas px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-primary-text"
      />
      <button
        type="button"
        onClick={() => onSubmit(value.trim())}
        className="shrink-0 rounded-md bg-primary px-2.5 text-primary-fg transition-colors hover:bg-primary-hover"
        title={submitLabel}
        aria-label={submitLabel}
      >
        <Check className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Barre d'outils                                                      */
/* ------------------------------------------------------------------ */

const FONT_SIZES = ['', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px']

export function RichEditorToolbar({
  editor,
  onUploadImage,
  uploading,
}: {
  editor: Editor
  onUploadImage: (file: File) => void
  uploading: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const blockValue = editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
      ? 'h3'
      : editor.isActive('heading', { level: 4 })
        ? 'h4'
        : editor.isActive('codeBlock')
          ? 'code'
          : 'p'

  const setBlock = (value: string) => {
    const chain = editor.chain().focus()
    if (value === 'p') chain.setParagraph().run()
    else if (value === 'code') chain.toggleCodeBlock().run()
    else chain.toggleHeading({ level: Number(value.slice(1)) as 2 | 3 | 4 }).run()
  }

  const currentFont = (editor.getAttributes('textStyle').fontFamily as string) ?? ''
  const currentSize = (editor.getAttributes('textStyle').fontSize as string) ?? ''

  return (
    <div className="sticky top-0 z-20 rounded-t-lg border-b border-line bg-canvas-subtle/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        {/* Historique */}
        <ToolButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Annuler (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" aria-hidden />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rétablir (Ctrl+Maj+Z)"
        >
          <Redo2 className="h-4 w-4" aria-hidden />
        </ToolButton>

        <Divider />

        {/* Niveau de texte */}
        <select
          value={blockValue}
          onChange={(e) => setBlock(e.target.value)}
          title="Niveau de texte"
          className="h-8 rounded-md border border-line bg-surface px-2 text-sm text-fg outline-none hover:border-line-strong focus:border-primary-text"
        >
          <option value="p">Paragraphe</option>
          <option value="h2">Titre 1</option>
          <option value="h3">Titre 2</option>
          <option value="h4">Titre 3</option>
          <option value="code">Bloc de code</option>
        </select>

        {/* Police */}
        <select
          value={currentFont}
          onChange={(e) => {
            const value = e.target.value
            if (value) editor.chain().focus().setFontFamily(value).run()
            else editor.chain().focus().unsetFontFamily().run()
          }}
          title="Police"
          className="h-8 max-w-[10rem] rounded-md border border-line bg-surface px-2 text-sm text-fg outline-none hover:border-line-strong focus:border-primary-text"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        {/* Taille */}
        <select
          value={currentSize}
          onChange={(e) => {
            const value = e.target.value
            if (value) editor.chain().focus().setFontSize(value).run()
            else editor.chain().focus().unsetFontSize().run()
          }}
          title="Taille du texte"
          className="h-8 rounded-md border border-line bg-surface px-2 text-sm text-fg outline-none hover:border-line-strong focus:border-primary-text"
        >
          {FONT_SIZES.map((size) => (
            <option key={size || 'auto'} value={size}>
              {size || 'Taille auto'}
            </option>
          ))}
        </select>

        <Divider />

        {/* Marques */}
        <ToolButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Gras (Ctrl+B)"
        >
          <Bold className="h-4 w-4" aria-hidden />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italique (Ctrl+I)"
        >
          <Italic className="h-4 w-4" aria-hidden />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Souligné (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" aria-hidden />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Barré"
        >
          <Strikethrough className="h-4 w-4" aria-hidden />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Code en ligne"
        >
          <Code className="h-4 w-4" aria-hidden />
        </ToolButton>

        <Divider />

        {/* Couleurs */}
        <Popover
          title="Couleur du texte"
          active={Boolean(editor.getAttributes('textStyle').color)}
          label={
            <span className="flex flex-col items-center leading-none">
              <Type className="h-4 w-4" aria-hidden />
              <span
                className="mt-0.5 h-1 w-4 rounded-full"
                style={{ backgroundColor: (editor.getAttributes('textStyle').color as string) || 'currentColor' }}
              />
            </span>
          }
          width="w-72"
        >
          {(close) => (
            <ColorPicker
              value={editor.getAttributes('textStyle').color as string | undefined}
              onPick={(color) => {
                editor.chain().focus().setColor(color).run()
                close()
              }}
              onClear={() => {
                editor.chain().focus().unsetColor().run()
                close()
              }}
            />
          )}
        </Popover>

        <Popover
          title="Surlignage"
          active={editor.isActive('highlight')}
          label={
            <span className="flex flex-col items-center leading-none">
              <Highlighter className="h-4 w-4" aria-hidden />
              <span
                className="mt-0.5 h-1 w-4 rounded-full"
                style={{ backgroundColor: (editor.getAttributes('highlight').color as string) || 'transparent' }}
              />
            </span>
          }
          width="w-72"
        >
          {(close) => (
            <ColorPicker
              value={editor.getAttributes('highlight').color as string | undefined}
              clearLabel="Retirer le surlignage"
              onPick={(color) => {
                editor.chain().focus().setHighlight({ color }).run()
                close()
              }}
              onClear={() => {
                editor.chain().focus().unsetHighlight().run()
                close()
              }}
            />
          )}
        </Popover>

        <Divider />

        {/* Alignement */}
        {(
          [
            ['left', AlignLeft, 'Aligner à gauche'],
            ['center', AlignCenter, 'Centrer'],
            ['right', AlignRight, 'Aligner à droite'],
            ['justify', AlignJustify, 'Justifier'],
          ] as const
        ).map(([value, Icon, title]) => (
          <ToolButton
            key={value}
            onClick={() => editor.chain().focus().setTextAlign(value).run()}
            active={editor.isActive({ textAlign: value })}
            title={title}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </ToolButton>
        ))}

        <Divider />

        {/* Listes et citation */}
        <ToolButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Liste à puces"
        >
          <List className="h-4 w-4" aria-hidden />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Liste numérotée"
        >
          <ListOrdered className="h-4 w-4" aria-hidden />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Citation"
        >
          <Quote className="h-4 w-4" aria-hidden />
        </ToolButton>

        <Divider />

        {/* Lien */}
        <Popover
          title="Insérer un lien"
          active={editor.isActive('link')}
          label={<Link2 className="h-4 w-4" aria-hidden />}
        >
          {(close) => (
            <UrlForm
              initial={(editor.getAttributes('link').href as string) ?? ''}
              placeholder="https://… ou /formations"
              submitLabel="Appliquer le lien"
              onSubmit={(value) => {
                const chain = editor.chain().focus().extendMarkRange('link')
                if (value) chain.setLink({ href: value }).run()
                else chain.unsetLink().run()
                close()
              }}
            />
          )}
        </Popover>

        {editor.isActive('link') && (
          <ToolButton
            onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
            title="Retirer le lien"
          >
            <Unlink className="h-4 w-4" aria-hidden />
          </ToolButton>
        )}

        {/* Image */}
        <Popover
          title="Insérer une image"
          label={
            uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ImageIcon className="h-4 w-4" aria-hidden />
            )
          }
        >
          {(close) => (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-2.5 text-sm font-medium text-fg-muted hover:border-primary-text hover:bg-primary-subtle"
              >
                <Upload className="h-4 w-4" aria-hidden />
                Téléverser une image
              </button>
              <div className="flex items-center gap-2 text-xs text-fg-subtle">
                <span className="h-px flex-1 bg-canvas-subtle" />
                ou par adresse
                <span className="h-px flex-1 bg-canvas-subtle" />
              </div>
              <UrlForm
                placeholder="https://…/image.jpg"
                submitLabel="Insérer l’image"
                onSubmit={(value) => {
                  if (value) editor.chain().focus().setImage({ src: value }).run()
                  close()
                }}
              />
            </div>
          )}
        </Popover>

        {/* Vidéo */}
        <Popover title="Insérer une vidéo" label={<Youtube className="h-4 w-4" aria-hidden />}>
          {(close) => (
            <div className="space-y-2">
              <p className="text-xs text-fg-subtle">Collez l’adresse d’une vidéo YouTube.</p>
              <UrlForm
                placeholder="https://www.youtube.com/watch?v=…"
                submitLabel="Insérer la vidéo"
                onSubmit={(value) => {
                  if (value) editor.chain().focus().setYoutubeVideo({ src: value }).run()
                  close()
                }}
              />
            </div>
          )}
        </Popover>

        {/* Tableau */}
        <ToolButton
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          active={editor.isActive('table')}
          title="Insérer un tableau"
        >
          <TableIcon className="h-4 w-4" aria-hidden />
        </ToolButton>

        {/* Encadré */}
        <Popover
          title="Encadré"
          active={editor.isActive('callout')}
          label={<Lightbulb className="h-4 w-4" aria-hidden />}
          width="w-52"
        >
          {(close) => (
            <div className="space-y-1">
              {CALLOUT_TONES.map((tone) => (
                <button
                  key={tone.value}
                  type="button"
                  onClick={() => {
                    if (editor.isActive('callout')) {
                      editor.chain().focus().setCalloutTone(tone.value).run()
                    } else {
                      editor.chain().focus().toggleCallout(tone.value).run()
                    }
                    close()
                  }}
                  className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-fg-muted transition-colors hover:bg-canvas-subtle hover:text-fg"
                >
                  {tone.label}
                </button>
              ))}
              {editor.isActive('callout') && (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleCallout().run()
                    close()
                  }}
                  className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-danger hover:bg-danger-subtle"
                >
                  Retirer l’encadré
                </button>
              )}
            </div>
          )}
        </Popover>

        {/* Bouton d'action */}
        <ToolButton
          onClick={() => editor.chain().focus().insertCtaButton().run()}
          active={editor.isActive('ctaButton')}
          title="Insérer un bouton d’action"
        >
          <MousePointerClick className="h-4 w-4" aria-hidden />
        </ToolButton>

        <ToolButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Séparateur"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </ToolButton>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUploadImage(file)
          e.target.value = ''
        }}
      />

      <ContextualBar editor={editor} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Deuxième rangée : options de l'élément sélectionné                  */
/* ------------------------------------------------------------------ */

function ContextualBar({ editor }: { editor: Editor }) {
  if (editor.isActive('image')) return <ImageOptions editor={editor} />
  if (editor.isActive('ctaButton')) return <CtaOptions editor={editor} />
  if (editor.isActive('table')) return <TableOptions editor={editor} />
  return null
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-line bg-canvas-subtle px-3 py-1.5">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {label}
      </span>
      {children}
    </div>
  )
}

function ImageOptions({ editor }: { editor: Editor }) {
  const attrs = editor.getAttributes('image')
  const update = (next: Record<string, unknown>) =>
    editor.chain().focus().updateAttributes('image', next).run()

  return (
    <Row label="Image">
      {[25, 50, 75, 100].map((width) => (
        <TextButton key={width} onClick={() => update({ width })}>
          <span className={cn(attrs.width === width && 'font-bold text-primary-text')}>{width} %</span>
        </TextButton>
      ))}
      <Divider />
      {(
        [
          ['left', 'Gauche'],
          ['center', 'Centre'],
          ['right', 'Droite'],
        ] as const
      ).map(([value, label]) => (
        <TextButton key={value} onClick={() => update({ align: value })}>
          <span className={cn(attrs.align === value && 'font-bold text-primary-text')}>{label}</span>
        </TextButton>
      ))}
      <Divider />
      <input
        value={(attrs.alt as string) ?? ''}
        onChange={(e) => update({ alt: e.target.value })}
        placeholder="Texte alternatif (accessibilité)"
        className="h-7 w-52 rounded-md border border-line px-2 text-xs outline-none focus:border-primary-text"
      />
      <input
        value={(attrs.title as string) ?? ''}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Légende affichée"
        className="h-7 w-44 rounded-md border border-line px-2 text-xs outline-none focus:border-primary-text"
      />
      <TextButton tone="danger" onClick={() => editor.chain().focus().deleteSelection().run()}>
        Supprimer
      </TextButton>
    </Row>
  )
}

function CtaOptions({ editor }: { editor: Editor }) {
  const attrs = editor.getAttributes('ctaButton')

  return (
    <Row label="Bouton">
      <input
        value={(attrs.href as string) ?? ''}
        onChange={(e) => editor.chain().focus().updateCtaButton({ href: e.target.value }).run()}
        placeholder="Lien du bouton (/commande/…)"
        className="h-7 w-56 rounded-md border border-line px-2 text-xs outline-none focus:border-primary-text"
      />
      <Divider />
      {CTA_VARIANTS.map((variant) => (
        <TextButton
          key={variant.value}
          onClick={() => editor.chain().focus().updateCtaButton({ variant: variant.value }).run()}
        >
          <span className={cn(attrs.variant === variant.value && 'font-bold text-primary-text')}>
            {variant.label}
          </span>
        </TextButton>
      ))}
      <Divider />
      {(
        [
          ['left', 'Gauche'],
          ['center', 'Centre'],
          ['right', 'Droite'],
        ] as const
      ).map(([value, label]) => (
        <TextButton
          key={value}
          onClick={() => editor.chain().focus().updateCtaButton({ align: value }).run()}
        >
          <span className={cn(attrs.align === value && 'font-bold text-primary-text')}>{label}</span>
        </TextButton>
      ))}
    </Row>
  )
}

function TableOptions({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus()

  return (
    <Row label="Tableau">
      <TextButton onClick={() => chain().addColumnBefore().run()}>+ Colonne avant</TextButton>
      <TextButton onClick={() => chain().addColumnAfter().run()}>+ Colonne après</TextButton>
      <TextButton onClick={() => chain().deleteColumn().run()} tone="danger">
        Supprimer la colonne
      </TextButton>
      <Divider />
      <TextButton onClick={() => chain().addRowBefore().run()}>+ Ligne avant</TextButton>
      <TextButton onClick={() => chain().addRowAfter().run()}>+ Ligne après</TextButton>
      <TextButton onClick={() => chain().deleteRow().run()} tone="danger">
        Supprimer la ligne
      </TextButton>
      <Divider />
      <TextButton onClick={() => chain().toggleHeaderRow().run()}>Ligne d’en-tête</TextButton>
      <TextButton onClick={() => chain().mergeOrSplit().run()}>Fusionner / scinder</TextButton>
      <TextButton onClick={() => chain().deleteTable().run()} tone="danger">
        <span className="inline-flex items-center gap-1">
          <Trash2 className="h-3 w-3" aria-hidden />
          Supprimer le tableau
        </span>
      </TextButton>
    </Row>
  )
}
