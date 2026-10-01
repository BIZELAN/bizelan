import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { CheckoutShell } from '@/components/checkout/checkout-shell'
import { getCourseBySlug, getSiteSettings } from '@/lib/queries'
import { getCurrentUser, hasCourseAccess } from '@/lib/auth'
import { asArray, payablePrice } from '@/lib/utils'

export const metadata: Metadata = { title: 'Commande', robots: { index: false } }

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const course = await getCourseBySlug(slug)

  if (!course || course.status !== 'published') notFound()

  const user = await getCurrentUser()
  if (!user) {
    redirect(`/connexion?suivant=${encodeURIComponent(`/commande/${slug}`)}`)
  }

  // Déjà inscrit : on renvoie vers la formation plutôt que de refacturer.
  if (await hasCourseAccess(user.id, course.id)) {
    redirect(`/compte/formations/${slug}`)
  }

  const settings = await getSiteSettings()

  return (
    <CheckoutShell
      backHref={`/formations/${slug}`}
      backLabel="Retour à la formation"
      coverUrl={course.cover_url}
      subtitle={course.subtitle}
      accessLabel={course.access_label}
      highlights={asArray<string>(course.what_you_get)}
      onlineEnabled={settings.payments_online_enabled}
      form={{
        itemType: 'course',
        slug: course.slug,
        title: course.title,
        priceCents: payablePrice(course),
        currency: course.currency,
        customerName: user.profile.full_name ?? '',
        customerEmail: user.email,
        customerPhone: user.profile.phone ?? '',
        onlineEnabled: settings.payments_online_enabled,
        transferEnabled: settings.payments_transfer_enabled,
        transferInstructions: settings.bank_transfer_instructions,
      }}
    />
  )
}
