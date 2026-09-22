import { renderMarkdown } from '@/lib/markdown'
import { cn } from '@/lib/utils'

/**
 * Affiche du markdown déjà échappé par `renderMarkdown`.
 * Aucun HTML fourni par un utilisateur n'est interprété.
 */
export function Markdown({
  content,
  className,
}: {
  content: string | null | undefined
  className?: string
}) {
  const html = renderMarkdown(content)
  if (!html) return null

  return (
    <div
      className={cn('prose-bz', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
