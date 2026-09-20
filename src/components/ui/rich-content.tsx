import { Fragment, type CSSProperties, type ReactNode } from 'react'

import { Markdown } from '@/components/ui/markdown'
import { cn } from '@/lib/utils'
import {
  safeAlign,
  safeCalloutTone,
  safeColor,
  safeCtaVariant,
  safeFontFamily,
  safeFontSize,
  safeUrl,
  safeWidth,
  safeYoutubeSrc,
  type RichContent,
  type RichMark,
  type RichNode,
} from '@/lib/rich-content'

/**
 * Rendu public du contenu riche.
 *
 * Chaque nœud et chaque attribut passe par une liste blanche : tout ce qui
 * n'est pas explicitement prévu ici est ignoré. Il n'y a volontairement aucun
 * `dangerouslySetInnerHTML` — le JSON de l'éditeur devient directement des
 * éléments React, ce qui rend l'injection de script structurellement impossible.
 *
 * Le même contenu s'affiche sur deux fonds : sombre partout sur le site, clair
 * dans le corps des articles de blog. Le `tone` est donc transmis à chaque
 * nœud plutôt que figé en classes.
 */
type Tone = 'dark' | 'light'

export function RichContentView({
  content,
  tone = 'dark',
  className,
}: {
  content: RichContent
  tone?: Tone
  className?: string
}) {
  if (!content) return null

  // Contenus historiques : markdown échappé par le rendu existant.
  if (typeof content === 'string') {
    return <Markdown content={content} className={className} />
  }

  return (
    <div className={cn(tone === 'light' ? 'prose-bizelan' : 'prose-dark', className)}>
      {renderNodes(content.content, tone)}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Nœuds                                                               */
/* ------------------------------------------------------------------ */

function renderNodes(nodes: RichNode[] | undefined, tone: Tone): ReactNode {
  if (!nodes?.length) return null
  return nodes.map((node, index) => <Fragment key={index}>{renderNode(node, tone)}</Fragment>)
}

function alignClass(node: RichNode): string | undefined {
  const align = safeAlign(node.attrs?.textAlign)
  if (!align || align === 'left') return undefined
  return align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-justify'
}

function renderNode(node: RichNode, tone: Tone): ReactNode {
  switch (node.type) {
    case 'text':
      return applyMarks(node.text ?? '', node.marks)

    case 'paragraph': {
      if (!node.content?.length) return <p className="h-0" aria-hidden />
      return <p className={alignClass(node)}>{renderNodes(node.content, tone)}</p>
    }

    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 2, 2), 4)
      const Tag = (['h2', 'h3', 'h4'] as const)[level - 2]
      return <Tag className={alignClass(node)}>{renderNodes(node.content, tone)}</Tag>
    }

    case 'bulletList':
      return <ul>{renderNodes(node.content, tone)}</ul>

    case 'orderedList': {
      const start = Number(node.attrs?.start)
      return (
        <ol start={Number.isFinite(start) && start > 1 ? start : undefined}>
          {renderNodes(node.content, tone)}
        </ol>
      )
    }

    case 'listItem':
      return <li>{renderNodes(node.content, tone)}</li>

    case 'blockquote':
      return <blockquote>{renderNodes(node.content, tone)}</blockquote>

    case 'codeBlock':
      return (
        <pre>
          <code>{renderNodes(node.content, tone)}</code>
        </pre>
      )

    case 'horizontalRule':
      return <hr />

    case 'hardBreak':
      return <br />

    case 'image':
      return renderImage(node, tone)

    case 'youtube':
      return renderYoutube(node, tone)

    case 'table':
      return (
        <div className="my-7 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <tbody>{renderNodes(node.content, tone)}</tbody>
          </table>
        </div>
      )

    case 'tableRow':
      return <tr>{renderNodes(node.content, tone)}</tr>

    case 'tableHeader':
    case 'tableCell':
      return renderCell(node, tone)

    case 'callout':
      return renderCallout(node, tone)

    case 'ctaButton':
      return renderCta(node, tone)

    // Nœud inconnu : on tente d'afficher son contenu plutôt que de le perdre.
    default:
      return renderNodes(node.content, tone)
  }
}

function renderImage(node: RichNode, tone: Tone): ReactNode {
  const src = safeUrl(node.attrs?.src)
  if (!src) return null

  const width = safeWidth(node.attrs?.width)
  const align = safeAlign(node.attrs?.align) ?? 'center'
  const caption = typeof node.attrs?.title === 'string' ? node.attrs.title.trim() : ''
  const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''

  return (
    <figure
      className={cn(
        'my-7 flex flex-col',
        align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center',
      )}
    >
      {/* Les URL sont arbitraires (médiathèque ou lien externe) : next/image
          exigerait de déclarer chaque domaine, on sert donc l'image telle quelle. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        title={caption || undefined}
        loading="lazy"
        decoding="async"
        style={width ? { width: `${width}%` } : undefined}
        className="my-0 h-auto max-w-full rounded-card"
      />
      {caption && (
        <figcaption
          className={cn(
            'mt-2.5 text-center text-meta',
            tone === 'light' ? 'text-ink-500' : 'text-onDark-lo',
          )}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

function renderYoutube(node: RichNode, tone: Tone): ReactNode {
  const src = safeYoutubeSrc(node.attrs?.src)
  if (!src) return null

  return (
    <div
      className={cn(
        'my-7 overflow-hidden rounded-card',
        tone === 'light' ? 'bg-ink-950' : 'bg-surface-950 ring-1 ring-surface-700',
      )}
    >
      <div className="relative aspect-video">
        <iframe
          src={src}
          title="Vidéo"
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  )
}

function renderCell(node: RichNode, tone: Tone): ReactNode {
  const isHeader = node.type === 'tableHeader'
  const colSpan = Number(node.attrs?.colspan)
  const rowSpan = Number(node.attrs?.rowspan)
  const props = {
    colSpan: Number.isFinite(colSpan) && colSpan > 1 ? colSpan : undefined,
    rowSpan: Number.isFinite(rowSpan) && rowSpan > 1 ? rowSpan : undefined,
  }

  const border = tone === 'light' ? 'border-ink-200' : 'border-surface-700'

  return isHeader ? (
    <th
      {...props}
      className={cn(
        'border px-3.5 py-2.5 font-semibold',
        border,
        tone === 'light' ? 'bg-ink-50 text-ink-950' : 'bg-surface-800 text-onDark-hi',
      )}
    >
      {renderNodes(node.content, tone)}
    </th>
  ) : (
    <td {...props} className={cn('border px-3.5 py-2.5 align-top', border)}>
      {renderNodes(node.content, tone)}
    </td>
  )
}

const CALLOUT_STYLES: Record<Tone, Record<string, string>> = {
  dark: {
    info: 'border-brand-400 bg-brand-400/10 text-onDark-hi',
    success: 'border-emerald-400 bg-emerald-400/10 text-emerald-100',
    warning: 'border-accent-400 bg-accent-400/10 text-accent-100',
    danger: 'border-red-400 bg-red-400/10 text-red-100',
  },
  light: {
    info: 'border-brand-500 bg-brand-50 text-ink-800',
    success: 'border-emerald-500 bg-emerald-50 text-emerald-950',
    warning: 'border-accent-500 bg-accent-50 text-accent-950',
    danger: 'border-red-500 bg-red-50 text-red-950',
  },
}

function renderCallout(node: RichNode, tone: Tone): ReactNode {
  const calloutTone = safeCalloutTone(node.attrs?.tone)
  return (
    <div className={cn('my-7 rounded-card border-l-2 px-5 py-4', CALLOUT_STYLES[tone][calloutTone])}>
      <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {renderNodes(node.content, tone)}
      </div>
    </div>
  )
}

const CTA_STYLES: Record<Tone, Record<string, string>> = {
  dark: {
    primary: 'bg-brand-500 text-white hover:bg-brand-400',
    accent: 'bg-accent-400 text-surface-950 hover:bg-accent-300',
    outline: 'border border-brand-400 text-brand-300 hover:bg-brand-400/10',
  },
  light: {
    primary: 'bg-brand-700 text-white hover:bg-brand-800',
    accent: 'bg-accent-500 text-white hover:bg-accent-600',
    outline: 'border-2 border-brand-600 text-brand-700 hover:bg-brand-50',
  },
}

function renderCta(node: RichNode, tone: Tone): ReactNode {
  const href = safeUrl(node.attrs?.href)
  if (!href || !node.content?.length) return null

  const variant = safeCtaVariant(node.attrs?.variant)
  const align = safeAlign(node.attrs?.align) ?? 'center'
  const external = /^https?:\/\//i.test(href)

  return (
    <div
      className={cn(
        'my-7 flex',
        align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center',
      )}
    >
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={cn(
          'inline-flex items-center justify-center rounded-control px-7 py-3.5 text-base font-semibold no-underline transition-colors',
          CTA_STYLES[tone][variant],
        )}
      >
        {renderNodes(node.content, tone)}
      </a>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Marques de texte                                                    */
/* ------------------------------------------------------------------ */

function applyMarks(text: string, marks: RichMark[] | undefined): ReactNode {
  let node: ReactNode = text

  for (const mark of marks ?? []) {
    switch (mark.type) {
      case 'bold':
        node = <strong>{node}</strong>
        break

      case 'italic':
        node = <em>{node}</em>
        break

      case 'underline':
        node = <span className="underline underline-offset-4">{node}</span>
        break

      case 'strike':
        node = <s>{node}</s>
        break

      case 'code':
        node = <code>{node}</code>
        break

      case 'highlight': {
        const color = safeColor(mark.attrs?.color)
        // Le texte passe en sombre : un surlignage est clair par nature,
        // quel que soit le fond de la page.
        node = (
          <mark
            className="rounded px-1 py-0.5 text-ink-950"
            style={{ backgroundColor: color ?? '#fef3c7' }}
          >
            {node}
          </mark>
        )
        break
      }

      case 'link': {
        const href = safeUrl(mark.attrs?.href)
        if (!href) break
        const external = /^https?:\/\//i.test(href)
        node = (
          <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {node}
          </a>
        )
        break
      }

      case 'textStyle': {
        const style: CSSProperties = {}
        const color = safeColor(mark.attrs?.color)
        const background = safeColor(mark.attrs?.backgroundColor)
        const fontFamily = safeFontFamily(mark.attrs?.fontFamily)
        const fontSize = safeFontSize(mark.attrs?.fontSize)

        if (color) style.color = color
        if (background) style.backgroundColor = background
        if (fontFamily) style.fontFamily = fontFamily
        if (fontSize) style.fontSize = fontSize

        if (Object.keys(style).length > 0) node = <span style={style}>{node}</span>
        break
      }
    }
  }

  return node
}
