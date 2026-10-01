import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { toCsv } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = {
  pending: 'En cours',
  awaiting_payment: 'En attente de paiement',
  paid: 'Payée',
  failed: 'Échouée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
}

const METHOD: Record<string, string> = {
  saspay: 'Mobile Money',
  bank_transfer: 'Dépôt / virement',
  manual: 'Manuel',
  free: 'Gratuit',
  chariow: 'Chariow',
  kkiapay: 'KkiaPay',
}

/** Date lisible par un tableur français : `JJ/MM/AAAA HH:MM`. */
function d(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Africa/Porto-Novo',
  }).format(date)
}

/**
 * Exports CSV de l'administration.
 *
 * Séparateur `;` et BOM UTF-8 : c'est ce qu'Excel attend sur un poste réglé en
 * français. Avec une virgule, tout tombait dans la première colonne ; sans
 * BOM, les accents arrivaient en « Ã© ».
 */
export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'editor'].includes(user.profile.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { type } = await params
  const supabase = createAdminClient()
  let rows: (string | number | null)[][] = []
  let name = type

  if (type === 'commandes') {
    const { data } = await supabase
      .from('orders')
      .select('reference, created_at, paid_at, customer_name, customer_email, customer_phone, subtotal_cents, discount_cents, total_cents, coupon_code, status, payment_method, saspay_network, items:order_items(title_snapshot)')
      .order('created_at', { ascending: false })
      .limit(10000)
    rows = [
      ['Référence', 'Créée le', 'Payée le', 'Client', 'E-mail', 'Téléphone', 'Articles', 'Sous-total (FCFA)', 'Remise (FCFA)', 'Total (FCFA)', 'Code promo', 'Statut', 'Moyen', 'Réseau'],
      ...((data ?? []) as {
        reference: string
        created_at: string
        paid_at: string | null
        customer_name: string
        customer_email: string
        customer_phone: string | null
        subtotal_cents: number
        discount_cents: number
        total_cents: number
        coupon_code: string | null
        status: string
        payment_method: string
        saspay_network: string | null
        items: { title_snapshot: string }[]
      }[]).map((o) => [
        o.reference,
        d(o.created_at),
        d(o.paid_at),
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        (o.items ?? []).map((i) => i.title_snapshot).join(' + '),
        o.subtotal_cents,
        o.discount_cents,
        o.total_cents,
        o.coupon_code,
        STATUS[o.status] ?? o.status,
        METHOD[o.payment_method] ?? o.payment_method,
        o.saspay_network,
      ]),
    ]
  } else if (type === 'clients') {
    const [{ data: profiles }, { data: paid }, { data: enrollments }] = await Promise.all([
      supabase
        .from('bz_profiles')
        .select('id, full_name, email, phone, city, activity, role, created_at')
        .order('created_at', { ascending: false })
        .limit(10000),
      supabase.from('orders').select('user_id, total_cents').eq('status', 'paid'),
      supabase.from('enrollments').select('user_id').in('state', ['active', 'completed']),
    ])
    const spent = new Map<string, number>()
    for (const o of paid ?? []) {
      if (o.user_id) spent.set(o.user_id, (spent.get(o.user_id) ?? 0) + (o.total_cents ?? 0))
    }
    const courses = new Map<string, number>()
    for (const e of enrollments ?? []) courses.set(e.user_id, (courses.get(e.user_id) ?? 0) + 1)
    rows = [
      ['Nom', 'E-mail', 'Téléphone', 'Ville', 'Activité', 'Rôle', 'Inscrit le', 'Formations', 'Total dépensé (FCFA)'],
      ...(profiles ?? []).map((p) => [
        p.full_name,
        p.email,
        p.phone,
        p.city,
        p.activity,
        p.role,
        d(p.created_at),
        courses.get(p.id) ?? 0,
        spent.get(p.id) ?? 0,
      ]),
    ]
  } else if (type === 'abonnes') {
    const { data } = await supabase
      .from('newsletter_subscribers')
      .select('email, name, source, unsubscribed, created_at')
      .order('created_at', { ascending: false })
      .limit(20000)
    rows = [
      ['E-mail', 'Nom', 'Source', 'Statut', 'Inscrit le'],
      ...(data ?? []).map((s) => [
        s.email,
        s.name,
        s.source,
        s.unsubscribed ? 'Désinscrit' : 'Abonné',
        d(s.created_at),
      ]),
    ]
  } else if (type === 'ventes') {
    const [{ data: courses }, { data: products }] = await Promise.all([
      supabase.from('v_course_sales').select('*'),
      supabase.from('v_product_sales').select('*'),
    ])
    rows = [
      ['Type', 'Offre', 'Ventes', 'Revenus (FCFA)'],
      ...((courses ?? []) as { course_title: string; units_sold: number; revenue_cents: number }[]).map((c) => [
        'Formation',
        c.course_title,
        Number(c.units_sold),
        Number(c.revenue_cents),
      ]),
      ...((products ?? []) as { product_title: string; units_sold: number; revenue_cents: number }[]).map((p) => [
        'Produit',
        p.product_title,
        Number(p.units_sold),
        Number(p.revenue_cents),
      ]),
    ]
  } else {
    return NextResponse.json({ error: 'Export inconnu.' }, { status: 404 })
  }

  name = `bizelan-${type}-${new Date().toISOString().slice(0, 10)}.csv`
  await logActivity(user.id, 'export.downloaded', 'export', null, { type, rows: rows.length - 1 })

  return new NextResponse(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  })
}
