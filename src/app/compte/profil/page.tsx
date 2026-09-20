import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { ProfileForm } from '@/components/account/profile-form'
import { PasswordForm } from '@/components/account/password-form'

export const metadata: Metadata = { title: 'Mon profil' }

export default async function ProfilePage() {
  const user = await requireUser('/compte/profil')

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl">Mon profil</h1>
        <p className="mt-1 text-onDark-md">Vos informations personnelles et votre mot de passe.</p>
      </div>

      <section className="rounded-card border border-surface-700 bg-surface-800 p-6">
        <h2 className="mb-5 text-lg font-semibold">Informations</h2>
        <ProfileForm profile={user.profile} email={user.email} />
      </section>

      <section className="rounded-card border border-surface-700 bg-surface-800 p-6">
        <h2 className="mb-5 text-lg font-semibold">Mot de passe</h2>
        <PasswordForm />
      </section>
    </div>
  )
}
