'use client'

import { useCallback, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Content } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Youtube from '@tiptap/extension-youtube'
import { TableKit } from '@tiptap/extension-table'
import {
  BackgroundColor,
  Color,
  FontFamily,
  FontSize,
  TextStyle,
} from '@tiptap/extension-text-style'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import { AlertCircle } from 'lucide-react'

import { RichEditorToolbar } from '@/components/admin/rich-editor-toolbar'
import { Callout, CtaButton, SizedImage } from '@/components/admin/rich-editor-nodes'
import { renderMarkdown } from '@/lib/markdown'
import { emptyRichDoc, parseRichContent, type RichContent, type RichDoc } from '@/lib/rich-content'
import { cn } from '@/lib/utils'

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

/**
 * Éditeur de contenu riche.
 *
 * Il produit du JSON ProseMirror, transmis soit par un champ caché (`name`,
 * pour les formulaires en Server Action), soit par `onChange` (pour l'éditeur
 * de blocs, qui gère son propre état).
 *
 * Les contenus markdown existants sont convertis à l'ouverture : le markdown
 * est d'abord rendu en HTML sûr par `renderMarkdown`, que TipTap sait analyser.
 * Rien n'est perdu, et la sauvegarde suivante bascule le champ en JSON.
 */
export function RichEditor({
  name,
  defaultValue,
  onChange,
  placeholder = 'Rédigez ici. Utilisez la barre d’outils pour insérer images, vidéos, tableaux et boutons.',
  minHeight = 'min-h-[22rem]',
}: {
  name?: string
  defaultValue?: RichContent
  onChange?: (doc: RichDoc) => void
  placeholder?: string
  minHeight?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculé une seule fois : l'éditeur devient ensuite la source de vérité.
  const initialContent = useMemo(() => {
    const parsed = parseRichContent(defaultValue)
    if (!parsed) return emptyRichDoc()
    if (typeof parsed === 'string') return renderMarkdown(parsed) || emptyRichDoc()
    return parsed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [serialized, setSerialized] = useState(() =>
    JSON.stringify(typeof initialContent === 'string' ? emptyRichDoc() : initialContent),
  )

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    // `RichDoc` est volontairement plus permissif que le type de TipTap
    // (attributs éventuellement nuls venant de la base) : conversion ici.
    content: initialContent as Content,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer' },
        },
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      BackgroundColor,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Youtube.configure({ nocookie: true, modestBranding: true, controls: true }),
      TableKit.configure({ table: { resizable: true } }),
      SizedImage,
      Callout,
      CtaButton,
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    editorProps: {
      attributes: {
        class: cn('rich-surface focus:outline-none', minHeight),
      },
      handleDrop: (_view, event) => {
        const file = event.dataTransfer?.files?.[0]
        if (!file || !IMAGE_TYPES.includes(file.type)) return false
        event.preventDefault()
        void uploadImage(file)
        return true
      },
      handlePaste: (_view, event) => {
        const file = event.clipboardData?.files?.[0]
        if (!file || !IMAGE_TYPES.includes(file.type)) return false
        event.preventDefault()
        void uploadImage(file)
        return true
      },
    },
    onUpdate: ({ editor: instance }) => {
      const doc = instance.getJSON() as RichDoc
      setSerialized(JSON.stringify(doc))
      onChange?.(doc)
    },
  })

  const uploadImage = useCallback(
    async (file: File) => {
      setUploading(true)
      setError(null)
      try {
        const body = new FormData()
        body.set('file', file)
        body.set('bucket', 'public-media')

        const response = await fetch('/api/admin/upload', { method: 'POST', body })
        const payload: { url?: string; error?: string } = await response.json()

        if (!response.ok || !payload.url) {
          throw new Error(payload.error ?? 'Le téléversement a échoué.')
        }
        editor?.chain().focus().setImage({ src: payload.url, alt: '' }).run()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Le téléversement a échoué.')
      } finally {
        setUploading(false)
      }
    },
    [editor],
  )

  const words = editor?.storage.characterCount?.words?.() ?? 0

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-e1 focus-within:border-primary">
      {name && <input type="hidden" name={name} value={serialized} />}

      {editor && (
        <RichEditorToolbar editor={editor} onUploadImage={uploadImage} uploading={uploading} />
      )}

      {error && (
        <div className="flex items-start gap-2 border-b border-danger/25 bg-danger-subtle px-4 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <EditorContent editor={editor} className="px-5 py-4" />

      <div className="flex items-center justify-between border-t border-line bg-canvas-subtle px-4 py-1.5 text-xs text-fg-subtle">
        <span>
          {words} mot{words > 1 ? 's' : ''} · ~{Math.max(1, Math.round(words / 200))} min de lecture
        </span>
        <span className="hidden sm:inline">
          Glissez une image dans le texte pour l’insérer directement.
        </span>
      </div>
    </div>
  )
}
