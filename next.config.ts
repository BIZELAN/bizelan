import type { NextConfig } from 'next'

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null
  } catch {
    return null
  }
})()

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Stockage Supabase du projet (déduit de NEXT_PUBLIC_SUPABASE_URL)
      ...(supabaseHost
        ? [{ protocol: 'https' as const, hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
        : []),
      // Images encore hébergées sur l'ancien Systeme.io (migration progressive)
      { protocol: 'https', hostname: 'd1yei2z3i6k35z.cloudfront.net' },
      // Vignettes Bunny Stream
      { protocol: 'https', hostname: '*.b-cdn.net' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
    // Cache de navigation côté navigateur : une page déjà visitée se rouvre
    // instantanément pendant 30 s (retour arrière, aller-retour entre deux
    // écrans de l'administration). Toute action qui modifie des données
    // appelle `revalidatePath`, qui vide ce cache : rien de périmé ne
    // s'affiche après un enregistrement.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
}

export default nextConfig
