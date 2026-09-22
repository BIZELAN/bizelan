import type { Metadata } from 'next'
import { Inbox, Mail, Phone } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/admin/shell'
import { QUOTE_STATUS_LABELS, StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { QuoteStatusControl } from '@/components/admin/quote-status-control'
import { ActionButton } from '@/components/admin/form-bits'
import { markContactHandled } from '@/app/actions/admin'
import { formatDateTime } from '@/lib/utils'
import type { ContactMessage, QuoteRequest, Service } from '@/lib/types'

export const metadata: Metadata = { title: 'Demandes' }
export const dynamic = 'force-dynamic'

export default async function AdminRequestsPage() {
  const supabase = createAdminClient()

  const [{ data: quotes }, { data: messages }, { data: services }] = await Promise.all([
    supabase.from('quote_requests').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('services').select('id, title'),
  ])

  const quoteList = (quotes as QuoteRequest[]) ?? []
  const messageList = (messages as ContactMessage[]) ?? []
  const serviceNames = new Map(((services as Service[]) ?? []).map((s) => [s.id, s.title]))

  return (
    <>
      <PageHeader
        title="Demandes"
        description="Demandes de devis et messages reçus depuis le site."
      />

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">
          Demandes de devis ({quoteList.length})
        </h2>

        {quoteList.length === 0 ? (
          <EmptyState icon={Inbox} title="Aucune demande de devis" />
        ) : (
          <div className="space-y-4">
            {quoteList.map((quote) => (
              <article key={quote.id} className="rounded-lg border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-fg">{quote.name}</h3>
                    <p className="mt-0.5 text-xs text-fg-subtle">
                      {formatDateTime(quote.created_at)}
                      {quote.service_id && ` · ${serviceNames.get(quote.service_id) ?? 'Service'}`}
                      {quote.company && ` · ${quote.company}`}
                    </p>
                  </div>
                  <StatusBadge status={quote.status} map={QUOTE_STATUS_LABELS} />
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <a
                    href={`mailto:${quote.email}`}
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" aria-hidden />
                    {quote.email}
                  </a>
                  {quote.phone && (
                    <a
                      href={`tel:${quote.phone.replace(/\s/g, '')}`}
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" aria-hidden />
                      {quote.phone}
                    </a>
                  )}
                </div>

                {quote.budget && (
                  <p className="mt-3 text-sm text-fg-muted">
                    <span className="font-medium">Budget :</span> {quote.budget}
                  </p>
                )}

                {quote.message && (
                  <p className="mt-3 whitespace-pre-wrap rounded-md bg-canvas-subtle p-4 text-sm leading-relaxed text-fg-muted">
                    {quote.message}
                  </p>
                )}

                <div className="mt-4 border-t border-line pt-4">
                  <QuoteStatusControl
                    id={quote.id}
                    status={quote.status}
                    note={quote.admin_note}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Messages de contact ({messageList.length})</h2>

        {messageList.length === 0 ? (
          <EmptyState icon={Mail} title="Aucun message" />
        ) : (
          <div className="space-y-3">
            {messageList.map((message) => (
              <article
                key={message.id}
                className={`rounded-lg border bg-surface p-5 ${
                  message.handled ? 'border-line opacity-70' : 'border-primary/25'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-fg">
                      {message.name}
                      {message.subject && (
                        <span className="ml-2 font-normal text-fg-muted">— {message.subject}</span>
                      )}
                    </h3>
                    <p className="mt-0.5 text-xs text-fg-subtle">
                      {formatDateTime(message.created_at)}
                    </p>
                  </div>
                  <ActionButton
                    action={markContactHandled.bind(null, message.id, !message.handled)}
                    variant={message.handled ? 'ghost' : 'outline'}
                  >
                    {message.handled ? 'Rouvrir' : 'Marquer traité'}
                  </ActionButton>
                </div>

                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <a href={`mailto:${message.email}`} className="text-primary hover:underline">
                    {message.email}
                  </a>
                  {message.phone && <span className="text-fg-muted">{message.phone}</span>}
                </div>

                <p className="mt-3 whitespace-pre-wrap rounded-md bg-canvas-subtle p-4 text-sm leading-relaxed text-fg-muted">
                  {message.message}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
