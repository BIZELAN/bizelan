import 'server-only'

import { displayHost, getSiteUrl } from '@/lib/site-url'

import { env, emailEnabled } from '@/lib/env'
import { formatPrice } from '@/lib/utils'

/**
 * Envoi d'e-mails transactionnels via Resend (optionnel).
 * Sans clé API, les fonctions ne lèvent jamais d'erreur : elles journalisent
 * simplement l'envoi ignoré, pour que le site fonctionne sans configuration.
 */

interface SendArgs {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

async function send({ to, subject, html, replyTo }: SendArgs): Promise<boolean> {
  if (!emailEnabled) {
    console.info(`[email] désactivé (RESEND_API_KEY absente) — « ${subject} » non envoyé`)
    return false
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })

    if (!response.ok) {
      console.error('[email] échec Resend :', response.status, await response.text())
      return false
    }
    return true
  } catch (error) {
    console.error('[email] erreur réseau :', error)
    return false
  }
}

/**
 * Échappe une valeur avant de l'insérer dans le HTML d'un e-mail.
 *
 * Le nom, le message ou l'entreprise viennent de formulaires publics : sans
 * échappement, un visiteur pouvait glisser un lien ou un faux bouton dans la
 * notification reçue par l'administration — du hameçonnage servi par notre
 * propre adresse d'envoi.
 */
export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Texte multiligne : échappé, puis retours à la ligne conservés. */
function escapeMultiline(value: string | null | undefined): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

function layout(title: string, body: string, site: string): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;background:#f6f7f8;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#323a41;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #ebeef0;">
    <div style="font-weight:700;font-size:18px;letter-spacing:.04em;color:#1c5d46;margin-bottom:24px;">BIZELAN</div>
    ${body}
    <hr style="border:none;border-top:1px solid #ebeef0;margin:32px 0 16px;">
    <p style="font-size:12px;color:#627887;margin:0;">
      BIZELAN — Cabinet d'accompagnement et de transformation<br>
      <a href="${site}" style="color:#227455;">${displayHost(site)}</a>
    </p>
  </div>
</body></html>`
}

/** Libellés lisibles des moyens de paiement, pour les notifications. */
const METHOD_LABELS: Record<string, string> = {
  saspay: 'Mobile Money (SasPay)',
  bank_transfer: 'Dépôt / virement',
  manual: 'Validation manuelle',
  free: 'Gratuit',
  chariow: 'Chariow (historique)',
  kkiapay: 'KkiaPay (historique)',
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#1c5d46;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${label}</a></p>`

/** Confirmation d'achat + accès ouvert. */
export async function sendOrderConfirmation(args: {
  to: string
  customerName: string
  reference: string
  items: { title: string; price: number }[]
  total: number
  hasCourses?: boolean
  hasProducts?: boolean
}): Promise<boolean> {
  const site = await getSiteUrl()
  const rows = args.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #ebeef0;">${escapeHtml(i.title)}</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid #ebeef0;text-align:right;white-space:nowrap;">${formatPrice(i.price)}</td></tr>`,
    )
    .join('')

  return send({
    to: args.to,
    subject: `Votre accès est ouvert — commande ${args.reference}`,
    html: layout(
      'Confirmation de commande',
      `<h1 style="font-size:22px;margin:0 0 16px;">Merci ${escapeHtml(args.customerName)} !</h1>
       <p style="margin:0 0 16px;line-height:1.6;">${
         args.total > 0 ? 'Votre paiement a bien été reçu et votre' : 'Votre'
       } accès est ouvert. ${
         args.hasProducts && !args.hasCourses
           ? 'Vos fichiers sont disponibles dès maintenant dans votre espace personnel.'
           : 'Vous pouvez commencer dès maintenant depuis votre espace personnel.'
       }</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}
         <tr><td style="padding:12px 0;font-weight:700;">Total</td>
             <td style="padding:12px 0;text-align:right;font-weight:700;">${formatPrice(args.total)}</td></tr>
       </table>
       ${
         args.hasProducts && !args.hasCourses
           ? button(`${site}/compte/produits`, 'Accéder à mes produits')
           : button(`${site}/compte`, 'Accéder à mon espace')
       }
       <p style="margin:0;font-size:13px;color:#627887;">Référence : ${args.reference}</p>`,
      site,
    ),
  })
}

/** Commande par virement/dépôt en attente de validation. */
export async function sendPendingTransferNotice(args: {
  to: string
  customerName: string
  reference: string
  total: number
  instructions: string | null
}): Promise<boolean> {
  const site = await getSiteUrl()
  return send({
    to: args.to,
    subject: `Commande ${args.reference} — en attente de votre paiement`,
    html: layout(
      'Commande enregistrée',
      `<h1 style="font-size:22px;margin:0 0 16px;">Commande enregistrée</h1>
       <p style="margin:0 0 16px;line-height:1.6;">Bonjour ${escapeHtml(args.customerName)}, votre commande de <strong>${formatPrice(args.total)}</strong> est enregistrée sous la référence <strong>${args.reference}</strong>.</p>
       ${args.instructions ? `<div style="background:#f0f9f4;border-left:3px solid #227455;padding:16px;border-radius:6px;line-height:1.6;font-size:14px;">${escapeMultiline(args.instructions)}</div>` : ''}
       <p style="margin:16px 0 0;line-height:1.6;">Dès réception de votre paiement, nous ouvrons votre accès et vous recevez un e-mail de confirmation.</p>`,
      site,
    ),
  })
}

/** Notification interne : nouvelle commande. */
export async function notifyAdminNewOrder(args: {
  reference: string
  customerName: string
  customerEmail: string
  total: number
  method: string
  status: string
}): Promise<boolean> {
  const site = await getSiteUrl()
  if (!env.adminNotificationEmail) return false
  return send({
    to: env.adminNotificationEmail,
    subject: `Nouvelle commande ${args.reference} — ${formatPrice(args.total)}`,
    html: layout(
      'Nouvelle commande',
      `<h1 style="font-size:20px;margin:0 0 16px;">Nouvelle commande</h1>
       <p style="line-height:1.8;margin:0;">
         <strong>Référence :</strong> ${args.reference}<br>
         <strong>Client :</strong> ${escapeHtml(args.customerName)} (${escapeHtml(args.customerEmail)})<br>
         <strong>Montant :</strong> ${formatPrice(args.total)}<br>
         <strong>Moyen :</strong> ${escapeHtml(METHOD_LABELS[args.method] ?? args.method)}<br>
         <strong>Statut :</strong> ${escapeHtml(args.status)}
       </p>
       ${button(`${site}/admin/commandes`, 'Voir dans l’admin')}`,
      site,
    ),
  })
}

/** Notification interne : nouvelle demande de devis ou message. */
export async function notifyAdminNewLead(args: {
  kind: 'devis' | 'contact'
  name: string
  email: string
  phone?: string | null
  message?: string | null
  service?: string | null
}): Promise<boolean> {
  const site = await getSiteUrl()
  if (!env.adminNotificationEmail) return false
  return send({
    to: env.adminNotificationEmail,
    replyTo: args.email,
    subject:
      args.kind === 'devis'
        ? `Demande de devis — ${args.name.slice(0, 80)}`
        : `Message de contact — ${args.name.slice(0, 80)}`,
    html: layout(
      'Nouvelle demande',
      `<h1 style="font-size:20px;margin:0 0 16px;">${args.kind === 'devis' ? 'Demande de devis' : 'Message de contact'}</h1>
       <p style="line-height:1.8;margin:0 0 16px;">
         <strong>Nom :</strong> ${escapeHtml(args.name)}<br>
         <strong>E-mail :</strong> ${escapeHtml(args.email)}<br>
         ${args.phone ? `<strong>Téléphone :</strong> ${escapeHtml(args.phone)}<br>` : ''}
         ${args.service ? `<strong>Service :</strong> ${escapeHtml(args.service)}<br>` : ''}
       </p>
       ${args.message ? `<div style="background:#f6f7f8;padding:16px;border-radius:6px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(args.message)}</div>` : ''}
       ${button(`${site}/admin/demandes`, 'Voir dans l’admin')}`,
      site,
    ),
  })
}
