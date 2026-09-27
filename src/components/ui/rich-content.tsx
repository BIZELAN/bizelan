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
import { VIDEO_IFRAME_ALLOW } from '@/lib/video'

/**
 * Rendu public du contenu riche.
 *
 * Chaque nœud et chaque attribut passe par une liste blanche : tout ce qui
 * n'est pas explicitement prévu ici est ignoré. Il n'y a volontairement aucun
 * `dangerouslySetInnerHTML` — le JSON de l'éditeur devient directement des
 * éléments React, ce qui rend l'injection de script structurellement impossible.
 *
 * Le rendu portait auparavant un `tone` transmis à chaque nœud, pour servir à
 * la fois le site sombre et le panneau blanc des articles. Les jetons de rôle
 * rendent ce dédoublement inutile : une seule série de classes suit le thème.
 */
export function RichContentView({
  content,
  className,
}: {
  content: RichContent
  className?: string
}) {
  if (!content) return null

  // Contenus historiques : markdown échappé par le rendu existant.
  if (typeof content === 'string') {
    return <Markdown content={content} className={className} />
  }

  return (
    <div className={cn('prose-bz', className)}>{renderNodes(content.content)}</div>
  )
}

/* ------------------------------------------------------------------ */
/* Nœuds                                                               */
/* ------------------------------------------------------------------ */

function renderNodes(nodes: RichNode[] | undefined): ReactNode {
  if (!nodes?.length) return null
  return nodes.map((node, index) => <Fragment key={index}>{renderNode(node)}</Fragment>)
}

function alignClass(node: RichNode): string | undefined {
  const align = safeAlign(node.attrs?.textAlign)
  if (!align || align === 'left') return undefined
  return align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-justify'
}

function renderNode(node: RichNode): ReactNode {
  switch (node.type) {
    case 'text':
      return applyMarks(node.text ?? '', node.marks)

    case 'paragraph': {
      if (!node.content?.length) return <p className="h-0" aria-hidden />
      return <p className={alignClass(node)}>{renderNodes(node.content)}</p>
    }

    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 2, 2), 4)
      const Tag = (['h2', 'h3', 'h4'] as const)[level - 2]
      return <Tag className={alignClass(node)}>{renderNodes(node.content)}</Tag>
    }

    case 'bulletList':
      return <ul>{renderNodes(node.content)}</ul>

    case 'orderedList': {
      const start = Number(node.attrs?.start)
      return (
        <ol start={Number.isFinite(start) && start > 1 ? start : undefined}>
          {renderNodes(node.content)}
        </ol>
      )
    }

    case 'listItem':
      return <li>{renderNodes(node.content)}</li>

    case 'blockquote':
      return <blockquote>{renderNodes(node.content)}</blockquote>

    case 'codeBlock':
      return (
        <pre>
          <code>{renderNodes(node.content)}</code>
        </pre>
      )

    case 'horizontalRule':
      return <hr />

    case 'hardBreak':
      return <br />

    case 'image':
      return renderImage(node)

    case 'youtube':
      return renderYoutube(node)

    case 'table':
      return (
        <div className="my-7 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <tbody>{renderNodes(node.content)}</tbody>
          </table>
        </div>
      )

    case 'tableRow':
      return <tr>{renderNodes(node.content)}</tr>

    case 'tableHeader':
    case 'tableCell':
      return renderCell(node)

    case 'callout':
      return renderCallout(node)

    case 'ctaButton':
      return renderCta(node)

    // Nœud inconnu : on tente d'afficher son contenu plutôt que de le perdre.
    default:
      return renderNodes(node.content)
  }
}

function renderImage(node: RichNode): ReactNode {
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
        className="my-0 h-auto max-w-full rounded-lg"
      />
      {caption && (
        <figcaption className="mt-2.5 text-center text-xs text-fg-subtle">{caption}</figcaption>
      )}
    </figure>
  )
}

function renderYoutube(node: RichNode): ReactNode {
  const src = safeYoutubeSrc(node.attrs?.src)
  if (!src) return null

  return (
    <div className="my-7 overflow-hidden rounded-lg bg-canvas ring-1 ring-line">
      <div className="relative aspect-video">
        <iframe
          src={src}
          title="Vidéo"
          loading="lazy"
          allow={VIDEO_IFRAME_ALLOW}
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  )
}

function renderCell(node: RichNode): ReactNode {
  const isHeader = node.type === 'tableHeader'
  const colSpan = Number(node.attrs?.colspan)
  const rowSpan = Number(node.attrs?.rowspan)
  const props = {
    colSpan: Number.isFinite(colSpan) && colSpan > 1 ? colSpan : undefined,
    rowSpan: Number.isFinite(rowSpan) && rowSpan > 1 ? rowSpan : undefined,
  }

  return isHeader ? (
    <th
      {...props}
      className="border border-line bg-canvas-subtle px-3.5 py-2.5 font-semibold text-fg"
    >
      {renderNodes(node.content)}
    </th>
  ) : (
    <td {...props} className="border border-line px-3.5 py-2.5 align-top">
      {renderNodes(node.content)}
    </td>
  )
}

const CALLOUT_STYLES: Record<string, string> = {
  info: 'border-primary-text bg-primary-subtle text-fg',
  success: 'border-success bg-success-subtle text-success',
  warning: 'border-warning bg-warning-subtle text-warning',
  danger: 'border-danger bg-danger-subtle text-danger',
}

function renderCallout(node: RichNode): ReactNode {
  const calloutTone = safeCalloutTone(node.attrs?.tone)
  return (
    <div className={cn('my-7 rounded-lg border-l-2 px-5 py-4', CALLOUT_STYLES[calloutTone])}>
      <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {renderNodes(node.content)}
      </div>
    </div>
  )
}

const CTA_STYLES: Record<string, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  accent: 'bg-secondary text-secondary-fg hover:bg-secondary-hover',
  outline: 'border border-primary-text text-primary-text hover:bg-primary-subtle',
}

function renderCta(node: RichNode): ReactNode {
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
          'inline-flex items-center justify-center rounded-md px-7 py-3.5 text-base font-semibold no-underline transition-colors',
          CTA_STYLES[variant],
        )}
      >
        {renderNodes(node.content)}
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
