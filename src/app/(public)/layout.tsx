import { SiteHeader } from '@/components/public/site-header'
import { SiteFooter } from '@/components/public/site-footer'
import { ViewTracker } from '@/components/public/view-tracker'
import { WhatsAppFloat } from '@/components/public/whatsapp-float'
import { getSiteSettings } from '@/lib/queries'
import { getCurrentUser } from '@/lib/auth'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSiteSettings(), getCurrentUser()])

  // `!== false` et non la valeur telle quelle : tant que la migration 0012
  // n'est pas appliquée, `select *` ne renvoie pas la colonne et la valeur
  // vaut `undefined`. Le bouton serait alors masqué sans raison visible. Ici
  // il suit le défaut de la base (`default true`) et ne disparaît que sur un
  // refus explicite de l'administrateur.
  const whatsappFloatEnabled = settings.whatsapp_float_enabled !== false

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        siteName={settings.site_name}
        logoUrl={settings.logo_url}
        isLoggedIn={Boolean(user)}
        announcement={settings.announcement_active ? settings.announcement : null}
        navLinks={settings.nav_links}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      {/* Après le pied, donc dernier dans l'ordre de tabulation : le bouton
          ne s'interpose pas entre le contenu et la navigation du pied. */}
      <WhatsAppFloat
        phone={settings.whatsapp}
        enabled={whatsappFloatEnabled}
        message={settings.whatsapp_float_message}
        position={settings.whatsapp_float_position}
      />
      <ViewTracker />
    </div>
  )
}
