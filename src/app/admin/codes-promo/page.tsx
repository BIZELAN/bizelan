import type { Metadata } from 'next'
import { Tag } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, Table, Td, Th } from '@/components/admin/shell'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/misc'
import { DeleteButton } from '@/components/admin/form-bits'
import { CouponForm } from '@/components/admin/coupon-form'
import { deleteCoupon } from '@/app/actions/admin'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Coupon, Course } from '@/lib/types'

export const metadata: Metadata = { title: 'Codes promo' }
export const dynamic = 'force-dynamic'

export default async function AdminCouponsPage() {
  const supabase = createAdminClient()

  const [{ data: coupons }, { data: courses }] = await Promise.all([
    supabase.from('coupons').select('*').order('created_at', { ascending: false }),
    supabase.from('courses').select('id, title').order('title'),
  ])

  const list = (coupons as Coupon[]) ?? []
  const courseNames = new Map(((courses as Course[]) ?? []).map((c) => [c.id, c.title]))

  return (
    <>
      <PageHeader
        title="Codes promo"
        description="Créez des réductions à saisir au moment du paiement."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {list.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="Aucun code promo"
              description="Créez votre premier code avec le formulaire ci-contre."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Réduction</Th>
                  <Th>Portée</Th>
                  <Th>Utilisations</Th>
                  <Th>Validité</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((coupon) => (
                  <tr key={coupon.id}>
                    <Td>
                      <span className="font-mono font-semibold text-fg">{coupon.code}</span>
                      {!coupon.active && (
                        <Badge tone="neutral" className="ml-2">
                          Inactif
                        </Badge>
                      )}
                      {coupon.description && (
                        <span className="block text-xs text-fg-subtle">{coupon.description}</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap font-semibold text-primary-text">
                      {coupon.discount_type === 'percent'
                        ? `-${coupon.discount_value} %`
                        : `-${formatPrice(coupon.discount_value)}`}
                    </Td>
                    <Td className="text-sm text-fg-muted">
                      {coupon.course_id
                        ? (courseNames.get(coupon.course_id) ?? 'Formation')
                        : 'Toutes les formations'}
                    </Td>
                    <Td className="tabular-nums text-fg-muted">
                      {coupon.redemptions}
                      {coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ''}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-fg-subtle">
                      {coupon.ends_at ? `jusqu’au ${formatDate(coupon.ends_at)}` : 'illimitée'}
                    </Td>
                    <Td className="text-right">
                      <DeleteButton
                        action={deleteCoupon.bind(null, coupon.id)}
                        label=""
                        variant="ghost"
                        confirmText={`Supprimer le code ${coupon.code} ?`}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <aside>
          <CouponForm courses={courses ?? []} />
        </aside>
      </div>
    </>
  )
}
