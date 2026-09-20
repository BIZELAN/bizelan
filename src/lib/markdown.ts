/**
 * Rendu markdown minimal et sûr.
 *
 * Le HTML brut est systématiquement échappé AVANT toute transformation :
 * même si un compte éditeur était compromis, aucun script ne peut être injecté
 * dans les pages publiques. Cela évite aussi toute dépendance externe.
 *
 * Syntaxe prise en charge : titres, gras, italique, code, liens, images,
 * listes à puces et numérotées, citations, séparateurs, paragraphes.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** N'autorise que http(s), mailto, tel et les liens internes. */
function safeUrl(url: string): string {
  const trimmed = url.trim()
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed
  return '#'
}

function renderInline(text: string): string {
  let out = escapeHtml(text)

  // Code entre backticks (protégé des autres transformations)
  const codes: string[] = []
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(code)
    return `\u0000CODE${codes.length - 1}\u0000`
  })

  // Images : ![alt](url)
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_m, alt: string, url: string, title?: string) =>
      `<img src="${safeUrl(url)}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy" />`,
  )

  // Liens : [texte](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const href = safeUrl(url)
    const external = /^https?:\/\//i.test(href)
    return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`
  })

  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')

  // Restauration du code
  out = out.replace(/\u0000CODE(\d+)\u0000/g, (_m, i: string) => `<code>${escapeHtml(codes[Number(i)])}</code>`)

  return out
}

export function renderMarkdown(markdown: string | null | undefined): string {
  if (!markdown) return ''

  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []

  let listType: 'ul' | 'ol' | null = null
  let paragraph: string[] = []
  let quote: string[] = []

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
    }
  }

  const closeParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${renderInline(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }

  const closeQuote = () => {
    if (quote.length) {
      html.push(`<blockquote>${renderInline(quote.join(' '))}</blockquote>`)
      quote = []
    }
  }

  const closeAll = () => {
    closeParagraph()
    closeList()
    closeQuote()
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (!line.trim()) {
      closeAll()
      continue
    }

    // Séparateur
    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      closeAll()
      html.push('<hr />')
      continue
    }

    // Titres
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      closeAll()
      const level = Math.min(heading[1].length + 1, 5) // # devient h2 (h1 = titre de page)
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      continue
    }

    // Citation
    const blockquote = /^>\s?(.*)$/.exec(line)
    if (blockquote) {
      closeParagraph()
      closeList()
      quote.push(blockquote[1])
      continue
    }
    closeQuote()

    // Liste à puces
    const bullet = /^[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      closeParagraph()
      if (listType !== 'ul') {
        closeList()
        html.push('<ul>')
        listType = 'ul'
      }
      html.push(`<li>${renderInline(bullet[1])}</li>`)
      continue
    }

    // Liste numérotée
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      closeParagraph()
      if (listType !== 'ol') {
        closeList()
        html.push('<ol>')
        listType = 'ol'
      }
      html.push(`<li>${renderInline(ordered[1])}</li>`)
      continue
    }

    closeList()
    paragraph.push(line.trim())
  }

  closeAll()
  return html.join('\n')
}
