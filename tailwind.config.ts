import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        /* ------------------------------------------------------------------
           JETONS DE RÔLE — la seule famille à utiliser désormais.
           Ils pointent sur les variables CSS de `globals.css`, ce qui rend le
           basculement clair/sombre gratuit : aucune classe conditionnelle,
           aucun `dark:` à écrire. Les échelles par teinte plus bas sont
           conservées le temps de la migration, puis supprimées.
           ------------------------------------------------------------------ */
        canvas: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',
          subtle: 'rgb(var(--bg-subtle) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
          control: 'rgb(var(--control-border) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          subtle: 'rgb(var(--text-subtle) / <alpha-value>)',
        },
        /**
         * `primary` est un REMPLISSAGE, `primary-text` un TEXTE.
         *
         * GreenYellow a une luminance de 0,806 : superbe en aplat sous du
         * texte sombre (15,2:1), illisible en texte sur fond clair (1,15:1).
         * Les deux rôles ne peuvent donc pas partager une valeur.
         * Règle : `bg-primary` pour les aplats, `text-primary-text` pour les
         * liens, icônes et bordures.
         */
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover) / <alpha-value>)',
          fg: 'rgb(var(--primary-fg) / <alpha-value>)',
          subtle: 'rgb(var(--primary-subtle) / <alpha-value>)',
          text: 'rgb(var(--primary-text) / <alpha-value>)',
        },
        /** Bleu : actions de second rang, liens de navigation. */
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          hover: 'rgb(var(--secondary-hover) / <alpha-value>)',
          fg: 'rgb(var(--secondary-fg) / <alpha-value>)',
          subtle: 'rgb(var(--secondary-subtle) / <alpha-value>)',
          text: 'rgb(var(--secondary-text) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          fg: 'rgb(var(--success-fg) / <alpha-value>)',
          subtle: 'rgb(var(--success-subtle) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          fg: 'rgb(var(--warning-fg) / <alpha-value>)',
          subtle: 'rgb(var(--warning-subtle) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          fg: 'rgb(var(--danger-fg) / <alpha-value>)',
          subtle: 'rgb(var(--danger-subtle) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          fg: 'rgb(var(--info-fg) / <alpha-value>)',
          subtle: 'rgb(var(--info-subtle) / <alpha-value>)',
        },

        /* --- Échelles littérales, usage désormais NOMMÉ et restreint -----
           Elles ne sont plus un héritage à purger : chacune sert un cas
           que les jetons de rôle ne couvrent pas, et rien d'autre.

           `brand`  — le dégradé du bandeau de marque, fixe dans les deux
                      thèmes, et le texte clair qui se pose dessus.
           `accent` — `accent-400` seul : l'or des étoiles de notation.
           `ink`    — `ink-950` seul : le texte d'un surlignage, qui est
                      clair par nature quel que soit le thème.
           ------------------------------------------------------------- */
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
         * `surface` a longtemps porté à la fois le jeton de rôle et une échelle
         * numérique héritée. Les deux ne pouvaient pas cohabiter sous des clés
         * séparées — une clé répétée écrase la précédente en JavaScript, et
         * `bg-surface` cessait silencieusement d'exister. L'échelle est
         * désormais supprimée, faute d'usage.
         */
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
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
        /* --- Échelle d'interface : 12 / 13 / 14 / 16 / 20 / 24 / 30 -------
           Fermée volontairement. `base` vaut 14 px et non 16 : une interface
           dense se lit mieux ainsi, et 16 px reste disponible sous `md` pour
           les textes de lecture. */
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.375rem' }],
        md: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.006em' }],
        xl: ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.012em' }],
        '2xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.016em' }],

        /* --- Lecture longue ---------------------------------------------
           Hors de l'échelle d'interface : un corps d'article se lit plus
           grand et plus aéré qu'un libellé de formulaire. C'est la seule
           taille destinée à être lue par paragraphes. */
        reading: ['1.0625rem', { lineHeight: '1.7' }],

        /* --- Display : site public uniquement ---------------------------- */
        '3xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.75rem', { lineHeight: '3rem', letterSpacing: '-0.022em' }],
        '5xl': ['3.5rem', { lineHeight: '3.625rem', letterSpacing: '-0.024em' }],
      },

      /**
       * Trois rayons, pas davantage : au-delà, l'œil cesse de percevoir la
       * hiérarchie et les écarts passent pour des erreurs.
       *
       * Les valeurs vivent dans `globals.css` et non ici, parce que la console
       * d'administration les redéfinit pour sa portée : `rounded-lg` vaut 14 px
       * sur le site public et 24 px dans la console. Une seule série de classes
       * sert les deux, et aucun composant n'a à savoir où il se trouve.
       */
      borderRadius: {
        sm: 'var(--radius-sm)', // 6px public  / 12px console
        md: 'var(--radius-md)', // 10px public / 16px console
        lg: 'var(--radius-lg)', // 14px public / 24px console
        pill: '999px',
      },

      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        spring: 'var(--ease-spring)',
      },

      maxWidth: {
        content: '72rem',
        reading: '68ch', // mesure de confort pour les textes longs

        /* Console d'administration : la coquille entière, puis la colonne de
           lecture à l'intérieur du panneau de contenu. Deux bornes, parce
           qu'un tableau a besoin de largeur mais un formulaire n'en veut pas. */
        console: '107.5rem', // 1720px
        panel: '85rem', // 1360px
      },

      boxShadow: {
        /* Trois niveaux, pilotés par les variables : le thème sombre les
           assombrit et les diffuse davantage, sans quoi elles disparaissent. */
        e1: 'var(--shadow-1)',
        e2: 'var(--shadow-2)',
        e3: 'var(--shadow-3)',
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
