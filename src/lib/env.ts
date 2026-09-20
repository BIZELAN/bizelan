/**
 * Lecture centralisée et vérifiée des variables d'environnement.
 * Les variables optionnelles (e-mail, Bunny) ne bloquent jamais le démarrage :
 * la fonctionnalité correspondante se désactive proprement.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. ` +
        `Copiez .env.example vers .env.local et renseignez-la.`,
    )
  }
  return value
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  get supabaseServiceRoleKey() {
    return required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY)
  },

  kkiapayPublicKey: process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY ?? '',
  get kkiapayPrivateKey() {
    return required('KKIAPAY_PRIVATE_KEY', process.env.KKIAPAY_PRIVATE_KEY)
  },
  get kkiapaySecret() {
    return required('KKIAPAY_SECRET', process.env.KKIAPAY_SECRET)
  },
  kkiapaySandbox: process.env.NEXT_PUBLIC_KKIAPAY_SANDBOX !== 'false',

  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? 'BIZELAN',

  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'BIZELAN <onboarding@resend.dev>',
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL ?? '',

  bunnyLibraryId: process.env.BUNNY_STREAM_LIBRARY_ID ?? '',
  bunnyApiKey: process.env.BUNNY_STREAM_API_KEY ?? '',
  bunnyCdnHostname: process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME ?? '',
}

/** Le site est-il configuré au minimum pour parler à Supabase ? */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey)
}

/**
 * Garantit que Supabase est configuré avant de créer un client.
 * Sans cela, @supabase/ssr lève une erreur difficile à relier à la vraie cause.
 */
export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase n'est pas configuré : renseignez NEXT_PUBLIC_SUPABASE_URL et " +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env, puis redémarrez `npm run dev`. ' +
        'Les variables NEXT_PUBLIC_* sont lues au démarrage du serveur : ' +
        'modifier .env pendant que le serveur tourne ne suffit pas toujours.',
    )
  }
}

export const emailEnabled = Boolean(env.resendApiKey)
