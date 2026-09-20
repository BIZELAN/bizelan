import { Node, mergeAttributes } from '@tiptap/core'
import Image from '@tiptap/extension-image'

import type { CalloutTone, CtaVariant, TextAlign } from '@/lib/rich-content'

/**
 * Nœuds sur mesure de l'éditeur.
 *
 * Ils couvrent les deux besoins propres aux pages de vente que les extensions
 * standard ne savent pas exprimer : l'encadré mis en valeur et le bouton
 * d'appel à l'action. Chacun se rend en HTML simple dans l'éditeur ; le site
 * public, lui, les redessine à partir du JSON (voir `ui/rich-content.tsx`).
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: (tone?: CalloutTone) => ReturnType
      setCalloutTone: (tone: CalloutTone) => ReturnType
    }
    ctaButton: {
      insertCtaButton: (attrs?: {
        href?: string
        variant?: CtaVariant
        align?: TextAlign
      }) => ReturnType
      updateCtaButton: (attrs: {
        href?: string
        variant?: CtaVariant
        align?: TextAlign
      }) => ReturnType
    }
  }
}

/* ------------------------------------------------------------------ */
/* Encadré                                                             */
/* ------------------------------------------------------------------ */

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-tone') ?? 'info',
        renderHTML: (attributes) => ({ 'data-tone': attributes.tone as string }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0]
  },

  addCommands() {
    return {
      toggleCallout:
        (tone = 'info') =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { tone }),
      setCalloutTone:
        (tone) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { tone }),
    }
  },
})

/* ------------------------------------------------------------------ */
/* Bouton d'appel à l'action                                           */
/* ------------------------------------------------------------------ */

/**
 * Le libellé est du contenu éditable en ligne, pas un attribut : l'admin tape
 * directement dans le bouton, comme dans n'importe quel traitement de texte.
 */
export const CtaButton = Node.create({
  name: 'ctaButton',
  group: 'block',
  content: 'inline*',
  marks: '',
  defining: true,

  addAttributes() {
    return {
      href: {
        default: '#',
        parseHTML: (element) => element.getAttribute('href') ?? '#',
        renderHTML: (attributes) => ({ href: attributes.href as string }),
      },
      variant: {
        default: 'primary',
        parseHTML: (element) => element.getAttribute('data-variant') ?? 'primary',
        renderHTML: (attributes) => ({ 'data-variant': attributes.variant as string }),
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') ?? 'center',
        renderHTML: (attributes) => ({ 'data-align': attributes.align as string }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-cta]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes, { 'data-cta': '' }), 0]
  },

  addCommands() {
    return {
      insertCtaButton:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { href: '#', variant: 'primary', align: 'center', ...attrs },
            content: [{ type: 'text', text: 'Je rejoins la formation' }],
          }),
      updateCtaButton:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    }
  },
})

/* ------------------------------------------------------------------ */
/* Image avec largeur et alignement                                    */
/* ------------------------------------------------------------------ */

export const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('data-width')
          return value ? Number(value) : null
        },
        renderHTML: (attributes) =>
          attributes.width
            ? {
                'data-width': String(attributes.width),
                style: `width:${attributes.width as number}%`,
              }
            : {},
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') ?? 'center',
        renderHTML: (attributes) => ({ 'data-align': attributes.align as string }),
      },
    }
  },
}).configure({
  inline: false,
  allowBase64: false,
})
