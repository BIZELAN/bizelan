import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Palette Bizelan — vert profond (agriculture / croissance) + ocre (terre)
        brand: {
          50: '#f0f9f4',
          100: '#daf1e3',
          200: '#b8e2cb',
          300: '#89cbab',
          400: '#55ae87',
          500: '#33916b',
          600: '#227455',
          700: '#1c5d46',
          800: '#194a39',
          900: '#163d31',
          950: '#0a221b',
        },
        accent: {
          50: '#fdf8ed',
          100: '#f9ecce',
          200: '#f2d799',
          300: '#eabb5b',
          400: '#e4a02f',
          500: '#d3831a',
          600: '#b86314',
          700: '#994714',
          800: '#7d3917',
          900: '#682f16',
          950: '#3b1707',
        },
        ink: {
          50: '#f6f7f8',
          100: '#ebeef0',
          200: '#d3dadf',
          300: '#adbac3',
          400: '#8095a2',
          500: '#627887',
          600: '#4d606e',
          700: '#404e59',
          800: '#38434b',
          900: '#323a41',
          950: '#1d2227',
        },

        /**
         * Rampe des fonds sombres — c'est le sol du site.
         * Teintée de vert plutôt que neutre : sans cette teinte, le vert de
         * marque paraît rapporté au lieu d'appartenir à la même famille.
         */
        surface: {
          600: '#27503b', // filets, séparateurs
          700: '#1b3a2b', // bordures, panneaux surélevés
          800: '#13291e', // panneaux, cartes
          850: '#0e1f17', // surface de lecture longue
          900: '#0a1711', // sections
          950: '#060f0b', // fond de page
        },

        /**
         * Texte sur fond sombre. Le blanc pur est volontairement absent :
         * il provoque un halo à la lecture. Ce blanc cassé verdâtre tient
         * un contraste de 14:1 sur surface-950 tout en restant confortable.
         */
        onDark: {
          hi: '#eaf2ed',
          md: '#a7bdb2',
          lo: '#718c7f',
        },
      },

      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },

      /**
       * Échelle resserrée : les titres plafonnent à 48 px. Un display plus
       * grand donnerait un rendu « landing page de démo » ; on vise un ton
       * éditorial, dense et tenu.
       */
      fontSize: {
        display: ['3rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.018em', fontWeight: '700' }],
        h2: ['2rem', { lineHeight: '1.15', letterSpacing: '-0.014em', fontWeight: '650' }],
        h3: ['1.375rem', { lineHeight: '1.3', letterSpacing: '-0.008em', fontWeight: '600' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.7' }],
        body: ['0.9375rem', { lineHeight: '1.65' }],
        meta: ['0.8125rem', { lineHeight: '1.5' }],
      },

      borderRadius: {
        control: '0.75rem', // 12px — champs, petits boutons
        card: '1.25rem', // 20px — cartes
        panel: '1.5rem', // 24px — grands panneaux
        pill: '999px',
      },

      maxWidth: {
        content: '72rem',
        reading: '68ch', // mesure de confort pour les textes longs
      },

      boxShadow: {
        // Sur fond sombre une ombre claire ne se voit pas : on assombrit
        // davantage et on diffuse plus largement.
        'dark-sm': '0 1px 2px rgba(0, 0, 0, 0.4)',
        dark: '0 8px 24px -8px rgba(0, 0, 0, 0.6)',
        'dark-lg': '0 24px 60px -20px rgba(0, 0, 0, 0.75)',
        glow: '0 0 0 1px rgba(85, 174, 135, 0.2), 0 12px 40px -12px rgba(85, 174, 135, 0.35)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        marquee: 'marquee 40s linear infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
