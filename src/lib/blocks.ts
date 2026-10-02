/**
 * Système de blocs des landing pages.
 *
 * Une page est un tableau de blocs `{ id, type, data }` stocké en JSONB.
 * Ce fichier décrit chaque type de bloc : ses champs, leurs libellés et
 * leurs valeurs par défaut. L'éditeur d'admin construit automatiquement
 * son formulaire à partir de ces définitions — ajouter un bloc au site
 * ne demande donc qu'une entrée ici + un composant de rendu.
 */

export type BlockType =
  | 'hero'
  | 'heroSplit'
  | 'painPoints'
  | 'beforeAfter'
  | 'checklist'
  | 'phases'
  | 'features'
  | 'pricing'
  | 'quote'
  | 'about'
  | 'faq'
  | 'cta'
  | 'richText'
  | 'courseGrid'
  | 'productGrid'
  | 'serviceGrid'
  | 'postGrid'
  | 'testimonials'
  | 'experts'
  | 'freeContent'
  | 'stats'
  | 'logos'
  | 'video'
  | 'image'
  | 'contactForm'
  | 'quoteForm'
  | 'carousel'
  | 'mediaText'
  | 'gallery'
  | 'heading'
  | 'buttons'
  | 'countdown'
  | 'spacer'

export interface Block<T = Record<string, unknown>> {
  id: string
  type: BlockType
  data: T
  /** Permet de masquer un bloc sans le supprimer. */
  hidden?: boolean
  /** Fond et mise en page propres au bloc (couleur, image, vidéo en boucle…). */
  style?: BlockStyle
}

/* ------------------------------------------------------------------ */
/* Fond et mise en page d'un bloc                                      */
/* ------------------------------------------------------------------ */

export type BlockBackgroundType = 'none' | 'color' | 'gradient' | 'image' | 'video'

export interface BlockStyle {
  bgType?: BlockBackgroundType
  /** Couleur unie, ou première couleur du dégradé. */
  bgColor?: string
  /** Seconde couleur du dégradé. */
  bgColor2?: string
  /** Angle du dégradé, en degrés. */
  bgAngle?: number
  bgImage?: string
  bgVideo?: string
  /** Image affichée pendant le chargement de la vidéo, et sur mobile économe. */
  bgPoster?: string
  /** Voile assombrissant (ou éclaircissant) posé sur l'image ou la vidéo, 0 à 90. */
  overlay?: number
  overlayColor?: string
  /**
   * Couleur du texte : `auto` la déduit du fond, `light` force un texte clair
   * (fond sombre), `dark` un texte foncé (fond clair).
   */
  tone?: 'auto' | 'light' | 'dark'
  /** Marges intérieures haut et bas. */
  spacing?: 'default' | 'none' | 'sm' | 'lg'
  /** Le bloc occupe au moins toute la hauteur de l'écran. */
  fullHeight?: boolean
  /** Fond figé pendant le défilement (effet parallaxe, image seulement). */
  fixed?: boolean
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const SAFE_URL = /^(https?:\/\/|\/)[^\s"'<>]*$/i

/** Nettoie un style venu de la base ou de l'éditeur : seules des valeurs sûres passent. */
export function sanitizeBlockStyle(raw: unknown): BlockStyle | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const s = raw as Record<string, unknown>
  const pick = <T,>(value: unknown, allowed: readonly T[]): T | undefined =>
    allowed.includes(value as T) ? (value as T) : undefined
  const color = (v: unknown) => (typeof v === 'string' && HEX_COLOR.test(v) ? v : undefined)
  const url = (v: unknown) => (typeof v === 'string' && SAFE_URL.test(v.trim()) ? v.trim() : undefined)
  const overlay = Number(s.overlay)
  const angle = Number(s.bgAngle)

  const style: BlockStyle = {
    bgType: pick(s.bgType, ['none', 'color', 'gradient', 'image', 'video'] as const),
    bgColor: color(s.bgColor),
    bgColor2: color(s.bgColor2),
    bgAngle: Number.isFinite(angle) ? Math.round(Math.min(360, Math.max(0, angle))) : undefined,
    bgImage: url(s.bgImage),
    bgVideo: url(s.bgVideo),
    bgPoster: url(s.bgPoster),
    overlay: Number.isFinite(overlay) ? Math.round(Math.min(90, Math.max(0, overlay))) : undefined,
    overlayColor: color(s.overlayColor),
    tone: pick(s.tone, ['auto', 'light', 'dark'] as const),
    spacing: pick(s.spacing, ['default', 'none', 'sm', 'lg'] as const),
    fullHeight: s.fullHeight === true ? true : undefined,
    fixed: s.fixed === true ? true : undefined,
  }
  return Object.values(style).some((v) => v !== undefined) ? style : undefined
}

/** Luminance relative d'une couleur hexadécimale (0 noir, 1 blanc). */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

/**
 * Thème de texte à appliquer sur le fond choisi : `dark` (texte clair) sur un
 * fond sombre, `light` (texte foncé) sur un fond clair, `null` sans fond.
 * Ce sont les valeurs de `data-theme`, qui redéclarent tous les jetons.
 */
export function blockTextTheme(style: BlockStyle | undefined): 'dark' | 'light' | null {
  if (!style || !style.bgType || style.bgType === 'none') {
    if (style?.tone === 'light') return 'dark'
    if (style?.tone === 'dark') return 'light'
    return null
  }
  if (style.tone === 'light') return 'dark'
  if (style.tone === 'dark') return 'light'
  if (style.bgType === 'color' || style.bgType === 'gradient') {
    const colors = [style.bgColor, style.bgType === 'gradient' ? style.bgColor2 : undefined].filter(
      (c): c is string => Boolean(c),
    )
    if (!colors.length) return null
    const avg = colors.reduce((sum, c) => sum + luminance(c), 0) / colors.length
    return avg < 0.4 ? 'dark' : 'light'
  }
  // Image ou vidéo : le voile par défaut est sombre, le texte clair.
  return (style.overlayColor && luminance(style.overlayColor) > 0.5) ? 'light' : 'dark'
}

export type FieldType =
  | 'datetime'
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'image'
  | 'icon'
  | 'select'
  | 'stringList'
  | 'objectList'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  help?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  /** Pour `objectList` : description des champs de chaque élément. */
  fields?: FieldDef[]
  /**
   * Pour `image` : `media` (défaut) accepte une image ou une vidéo, affichée
   * en boucle et sans son ; `image` se limite aux images (logos, portraits).
   */
  accept?: 'image' | 'media'
  itemLabel?: string
}

export interface BlockDef {
  type: BlockType
  label: string
  description: string
  icon: string
  /** Regroupement dans le sélecteur de blocs de l'admin. */
  group: 'Structure' | 'Vente' | 'Contenu' | 'Médias' | 'Listes' | 'Formulaires'
  fields: FieldDef[]
  defaults: Record<string, unknown>
}

// Les valeurs restent inchangées (elles sont déjà enregistrées dans les pages
// existantes) ; seuls les libellés suivent le passage au système sombre.
const THEME_OPTIONS = [
  { value: 'light', label: 'Fond nuancé' },
  { value: 'dark', label: 'Fond profond' },
  { value: 'brand', label: 'Couleur de marque' },
]

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: 'hero',
    label: 'Bannière principale',
    description: 'Grand titre d’ouverture avec accroche et bouton d’action.',
    icon: 'layout-template',
    group: 'Structure',
    fields: [
      { key: 'badge', label: 'Petite étiquette', type: 'text', placeholder: '-40 % de réduction' },
      { key: 'title', label: 'Titre', type: 'textarea' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea' },
      { key: 'ctaLabel', label: 'Texte du bouton', type: 'text' },
      { key: 'ctaHref', label: 'Lien du bouton', type: 'text', placeholder: '#offre ou /formations' },
      { key: 'secondaryCtaLabel', label: 'Bouton secondaire (texte)', type: 'text' },
      { key: 'secondaryCtaHref', label: 'Bouton secondaire (lien)', type: 'text' },
      { key: 'imageUrl', label: 'Image de fond', type: 'image' },
      {
        key: 'align',
        label: 'Alignement',
        type: 'select',
        options: [
          { value: 'center', label: 'Centré' },
          { value: 'left', label: 'À gauche' },
        ],
      },
      { key: 'theme', label: 'Thème', type: 'select', options: THEME_OPTIONS },
    ],
    defaults: {
      badge: '',
      title: 'Un titre qui accroche',
      subtitle: 'Expliquez en une phrase la promesse de votre offre.',
      ctaLabel: 'Je découvre',
      ctaHref: '#offre',
      align: 'center',
      theme: 'dark',
    },
  },
  {
    type: 'heroSplit',
    label: 'Bannière avec formation phare',
    description: 'Grande accroche à gauche, carte de la formation mise en avant à droite.',
    icon: 'panels-top-left',
    group: 'Structure',
    fields: [
      { key: 'badge', label: 'Petite étiquette', type: 'text' },
      { key: 'title', label: 'Titre', type: 'textarea' },
      {
        key: 'highlight',
        label: 'Suite du titre, en couleur',
        type: 'text',
        help: 'Affichée à la ligne, en vert clair.',
      },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea' },
      { key: 'ctaLabel', label: 'Bouton principal (texte)', type: 'text' },
      { key: 'ctaHref', label: 'Bouton principal (lien)', type: 'text' },
      { key: 'secondaryCtaLabel', label: 'Bouton secondaire (texte)', type: 'text' },
      { key: 'secondaryCtaHref', label: 'Bouton secondaire (lien)', type: 'text' },
      {
        key: 'guarantees',
        label: 'Points de réassurance',
        type: 'stringList',
        itemLabel: 'Point',
        help: 'Affichés avec une coche sous les boutons.',
      },
      {
        key: 'courseSlug',
        label: 'Formation affichée',
        type: 'text',
        placeholder: 'plan-affaires-agricole',
        help: 'Laisser vide pour afficher automatiquement la formation mise en avant.',
      },
      { key: 'cardLabel', label: 'Étiquette de la carte', type: 'text' },
    ],
    defaults: {
      badge: 'Cabinet d’accompagnement des entreprises',
      title: 'Structurez votre projet.',
      highlight: 'Convainquez vos partenaires.',
      subtitle:
        'Des formations pratiques et un accompagnement sur mesure pour bâtir un business plan solide, financer votre activité et piloter votre croissance.',
      ctaLabel: 'Découvrir les formations',
      ctaHref: '/formations',
      secondaryCtaLabel: 'Parler d’un projet',
      secondaryCtaHref: '/services',
      guarantees: ['Paiement Mobile Money', 'Accès à vie', 'Modèles Excel & Word inclus'],
      courseSlug: '',
      cardLabel: 'Formation phare',
    },
  },
  {
    type: 'painPoints',
    label: 'Problèmes du client',
    description: 'Liste de situations dans lesquelles le visiteur se reconnaît.',
    icon: 'alert-circle',
    group: 'Vente',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'items', label: 'Situations', type: 'stringList', itemLabel: 'Situation' },
      { key: 'imageUrl', label: 'Image', type: 'image' },
    ],
    defaults: {
      title: 'Vous reconnaissez-vous dans l’une de ces situations ?',
      items: ['Premier problème', 'Deuxième problème', 'Troisième problème'],
    },
  },
  {
    type: 'beforeAfter',
    label: 'Avant / Après',
    description: 'Deux colonnes contrastées montrant la transformation.',
    icon: 'arrow-left-right',
    group: 'Vente',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'beforeTitle', label: 'Titre colonne gauche', type: 'text' },
      { key: 'before', label: 'Éléments « avant »', type: 'stringList', itemLabel: 'Élément' },
      { key: 'afterTitle', label: 'Titre colonne droite', type: 'text' },
      { key: 'after', label: 'Éléments « après »', type: 'stringList', itemLabel: 'Élément' },
    ],
    defaults: {
      title: 'Ce qui change',
      beforeTitle: 'Avant',
      before: ['Situation actuelle'],
      afterTitle: 'Après',
      after: ['Situation visée'],
    },
  },
  {
    type: 'checklist',
    label: 'Liste de validation',
    description: '« Cette offre est faite pour vous si… »',
    icon: 'check-circle',
    group: 'Vente',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'items', label: 'Critères', type: 'stringList', itemLabel: 'Critère' },
      { key: 'imageUrl', label: 'Image', type: 'image' },
    ],
    defaults: {
      title: 'Cette formation est faite pour vous si…',
      items: ['Premier critère', 'Deuxième critère'],
    },
  },
  {
    type: 'phases',
    label: 'Phases du parcours',
    description: 'Étapes numérotées avec leurs points clés, dépliables.',
    icon: 'list-ordered',
    group: 'Vente',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      {
        key: 'display',
        label: 'Affichage',
        type: 'select',
        options: [
          { value: 'accordion', label: 'Dépliable — le visiteur ouvre chaque phase' },
          { value: 'open', label: 'Tout afficher' },
        ],
      },
      {
        key: 'items',
        label: 'Phases',
        type: 'objectList',
        itemLabel: 'Phase',
        fields: [
          { key: 'label', label: 'Étiquette', type: 'text', placeholder: 'Phase 1' },
          { key: 'title', label: 'Titre', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'bullets', label: 'Points clés', type: 'stringList', itemLabel: 'Point' },
        ],
      },
    ],
    defaults: {
      title: 'Le déroulé du parcours',
      display: 'accordion',
      items: [
        { label: 'Phase 1', title: 'Première étape', description: '', bullets: [] },
      ],
    },
  },
  {
    type: 'features',
    label: 'Caractéristiques',
    description: 'Trois à quatre encarts courts (Où, Format, Durée…).',
    icon: 'grid-3x3',
    group: 'Contenu',
    fields: [
      { key: 'title', label: 'Titre (facultatif)', type: 'text' },
      {
        key: 'items',
        label: 'Encarts',
        type: 'objectList',
        itemLabel: 'Encart',
        fields: [
          { key: 'title', label: 'Titre', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'icon', label: 'Icône', type: 'icon' },
        ],
      },
    ],
    defaults: {
      items: [{ title: 'Format', description: 'Décrivez ce point.', icon: 'star' }],
    },
  },
  {
    type: 'pricing',
    label: 'Offre et paiement',
    description: 'Le bloc de prix avec le bouton d’achat. Utilise le prix de la formation liée à la page.',
    icon: 'badge-dollar-sign',
    group: 'Vente',
    fields: [
      { key: 'anchor', label: 'Ancre (pour les liens #)', type: 'text', placeholder: 'offre' },
      { key: 'badge', label: 'Étiquette de promo', type: 'text', placeholder: '-40 %' },
      { key: 'note', label: 'Mention sous le prix', type: 'text' },
      { key: 'includesTitle', label: 'Titre « inclus »', type: 'text' },
      { key: 'includes', label: 'Ce qui est inclus', type: 'stringList', itemLabel: 'Élément' },
      { key: 'outcomesTitle', label: 'Titre « résultats »', type: 'text' },
      { key: 'outcomes', label: 'Résultats obtenus', type: 'stringList', itemLabel: 'Résultat' },
      { key: 'ctaLabel', label: 'Texte du bouton', type: 'text' },
      { key: 'securityNote', label: 'Mention de sécurité', type: 'text' },
    ],
    defaults: {
      anchor: 'offre',
      note: 'Paiement unique · Accès à vie',
      includesTitle: 'Vous aurez accès à :',
      includes: [],
      outcomesTitle: 'Vous repartez avec :',
      outcomes: [],
      ctaLabel: 'Passer au paiement',
      securityNote: 'Paiement sécurisé par Mobile Money (MTN, Moov, Celtiis)',
    },
  },
  {
    type: 'quote',
    label: 'Citation en avant',
    description: 'Une phrase forte, avec image et bouton.',
    icon: 'quote',
    group: 'Contenu',
    fields: [
      { key: 'text', label: 'Citation', type: 'textarea' },
      { key: 'author', label: 'Auteur', type: 'text' },
      { key: 'imageUrl', label: 'Image', type: 'image' },
      { key: 'ctaLabel', label: 'Texte du bouton', type: 'text' },
      { key: 'ctaHref', label: 'Lien du bouton', type: 'text' },
    ],
    defaults: { text: 'Une phrase qui marque les esprits.' },
  },
  {
    type: 'about',
    label: 'À propos',
    description: 'Présentation du cabinet avec points clés.',
    icon: 'building-2',
    group: 'Contenu',
    fields: [
      { key: 'eyebrow', label: 'Surtitre', type: 'text' },
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'text', label: 'Texte', type: 'textarea' },
      { key: 'bullets', label: 'Points clés', type: 'stringList', itemLabel: 'Point' },
      { key: 'imageUrl', label: 'Image', type: 'image' },
    ],
    defaults: { eyebrow: 'Qui sommes-nous ?', title: 'Cabinet BIZELAN', text: '', bullets: [] },
  },
  {
    type: 'faq',
    label: 'Questions fréquentes',
    description: 'Accordéon de questions/réponses.',
    icon: 'help-circle',
    group: 'Contenu',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      {
        key: 'useCourseFaq',
        label: 'Reprendre la FAQ de la formation liée',
        type: 'boolean',
        help: 'Si activé, les questions de la formation associée à cette page sont affichées automatiquement.',
      },
      {
        key: 'items',
        label: 'Questions',
        type: 'objectList',
        itemLabel: 'Question',
        fields: [
          { key: 'question', label: 'Question', type: 'text' },
          { key: 'answer', label: 'Réponse', type: 'textarea' },
        ],
      },
    ],
    defaults: { title: 'Les questions fréquentes', useCourseFaq: false, items: [] },
  },
  {
    type: 'cta',
    label: 'Appel à l’action',
    description: 'Bandeau de conversion avec bouton.',
    icon: 'megaphone',
    group: 'Vente',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'text', label: 'Texte', type: 'textarea' },
      { key: 'ctaLabel', label: 'Texte du bouton', type: 'text' },
      { key: 'ctaHref', label: 'Lien du bouton', type: 'text' },
      { key: 'theme', label: 'Thème', type: 'select', options: THEME_OPTIONS },
    ],
    defaults: { title: 'Prêt à commencer ?', ctaLabel: 'Nous contacter', ctaHref: '/contact', theme: 'brand' },
  },
  {
    type: 'richText',
    label: 'Texte libre',
    description: 'Texte mis en forme : titres, images, vidéos, tableaux, boutons.',
    icon: 'text',
    group: 'Contenu',
    fields: [
      { key: 'title', label: 'Titre (facultatif)', type: 'text' },
      { key: 'content', label: 'Contenu', type: 'richtext' },
      {
        key: 'width',
        label: 'Largeur',
        type: 'select',
        options: [
          { value: 'narrow', label: 'Étroite (lecture)' },
          { value: 'wide', label: 'Large' },
        ],
      },
    ],
    defaults: { content: '', width: 'narrow' },
  },
  {
    type: 'courseGrid',
    label: 'Grille de formations',
    description: 'Affiche automatiquement les formations publiées.',
    icon: 'graduation-cap',
    group: 'Listes',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea' },
      { key: 'limit', label: 'Nombre maximum', type: 'number' },
      { key: 'featuredOnly', label: 'Uniquement les formations mises en avant', type: 'boolean' },
    ],
    defaults: { title: 'Nos formations', limit: 3, featuredOnly: false },
  },
  {
    type: 'productGrid',
    label: 'Grille de produits',
    description: 'Affiche automatiquement les produits de la boutique.',
    icon: 'package',
    group: 'Listes',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea' },
      { key: 'limit', label: 'Nombre maximum', type: 'number' },
      { key: 'featuredOnly', label: 'Uniquement les produits mis en avant', type: 'boolean' },
    ],
    defaults: { title: 'La boutique', limit: 3, featuredOnly: false },
  },
  {
    type: 'serviceGrid',
    label: 'Grille de services',
    description: 'Affiche automatiquement les services publiés.',
    icon: 'briefcase',
    group: 'Listes',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea' },
      { key: 'limit', label: 'Nombre maximum', type: 'number' },
    ],
    defaults: { title: 'Nos services', limit: 3 },
  },
  {
    type: 'postGrid',
    label: 'Grille d’articles',
    description: 'Derniers articles du blog.',
    icon: 'newspaper',
    group: 'Listes',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea' },
      { key: 'limit', label: 'Nombre maximum', type: 'number' },
    ],
    defaults: { title: 'Derniers articles', limit: 3 },
  },
  {
    type: 'testimonials',
    label: 'Témoignages',
    description: 'Avis clients affichés en cartes.',
    icon: 'message-square-quote',
    group: 'Vente',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      {
        key: 'useApprovedReviews',
        label: 'Reprendre les avis approuvés',
        type: 'boolean',
        help: 'Affiche les avis validés dans l’admin plutôt que la liste ci-dessous.',
      },
      {
        key: 'items',
        label: 'Témoignages',
        type: 'objectList',
        itemLabel: 'Témoignage',
        fields: [
          { key: 'name', label: 'Nom', type: 'text' },
          { key: 'role', label: 'Fonction / activité', type: 'text' },
          { key: 'text', label: 'Témoignage', type: 'textarea' },
          { key: 'rating', label: 'Note sur 5', type: 'number' },
        ],
      },
    ],
    defaults: { title: 'Ils nous font confiance', useApprovedReviews: true, items: [] },
  },
  {
    type: 'experts',
    label: 'Nos intervenants',
    description: 'Portraits des consultants ou formateurs, avec leur spécialité.',
    icon: 'users-round',
    group: 'Vente',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea' },
      {
        key: 'items',
        label: 'Intervenants',
        type: 'objectList',
        itemLabel: 'Intervenant',
        fields: [
          { key: 'name', label: 'Nom', type: 'text' },
          { key: 'role', label: 'Spécialité', type: 'text' },
          { key: 'photoUrl', label: 'Photo', type: 'image', accept: 'image' },
          { key: 'bio', label: 'En une phrase', type: 'textarea' },
        ],
      },
    ],
    defaults: {
      title: 'Celles et ceux qui vous accompagnent',
      subtitle: '',
      items: [{ name: 'Prénom Nom', role: 'Spécialité', photoUrl: '', bio: '' }],
    },
  },
  {
    type: 'freeContent',
    label: 'Contenus gratuits',
    description: 'Ressources offertes — levier d’acquisition avant l’achat.',
    icon: 'gift',
    group: 'Vente',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea' },
      {
        key: 'items',
        label: 'Ressources',
        type: 'objectList',
        itemLabel: 'Ressource',
        fields: [
          { key: 'label', label: 'Étiquette', type: 'text', placeholder: 'Guide PDF' },
          { key: 'title', label: 'Titre', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'imageUrl', label: 'Visuel', type: 'image' },
          { key: 'href', label: 'Lien', type: 'text', placeholder: '/blog/mon-article' },
        ],
      },
    ],
    defaults: {
      title: 'Commencez gratuitement',
      subtitle: 'Des ressources concrètes, accessibles sans achat.',
      items: [
        { label: 'Guide', title: 'Titre de la ressource', description: '', imageUrl: '', href: '#' },
      ],
    },
  },
  {
    type: 'stats',
    label: 'Chiffres clés',
    description: 'Bandeau de statistiques.',
    icon: 'bar-chart-3',
    group: 'Contenu',
    fields: [
      {
        key: 'items',
        label: 'Chiffres',
        type: 'objectList',
        itemLabel: 'Chiffre',
        fields: [
          { key: 'value', label: 'Valeur', type: 'text', placeholder: '+120' },
          { key: 'label', label: 'Libellé', type: 'text' },
        ],
      },
    ],
    defaults: { items: [{ value: '+100', label: 'Projets accompagnés' }] },
  },
  {
    type: 'logos',
    label: 'Bandeau de logos',
    description: 'Partenaires ou moyens de paiement.',
    icon: 'image',
    group: 'Contenu',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      {
        key: 'items',
        label: 'Logos',
        type: 'objectList',
        itemLabel: 'Logo',
        fields: [
          { key: 'imageUrl', label: 'Image', type: 'image', accept: 'image' },
          { key: 'alt', label: 'Texte alternatif', type: 'text' },
        ],
      },
    ],
    defaults: { items: [] },
  },
  {
    type: 'video',
    label: 'Vidéo',
    description: 'Vidéo YouTube, Vimeo ou lien direct.',
    icon: 'play-circle',
    group: 'Contenu',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'url', label: 'URL de la vidéo', type: 'text', placeholder: 'https://www.youtube.com/watch?v=…' },
      {
        key: 'poster',
        label: 'Miniature (image d’affiche)',
        type: 'image',
        accept: 'image',
        help: 'Affichée avant la lecture. Pour un lien direct (.mp4), la vidéo n’est téléchargée qu’au clic — une affiche évite un grand rectangle vide.',
      },
      { key: 'caption', label: 'Légende', type: 'text' },
    ],
    defaults: { url: '', poster: '' },
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Une image pleine largeur avec légende.',
    icon: 'image',
    group: 'Contenu',
    fields: [
      { key: 'imageUrl', label: 'Image', type: 'image' },
      { key: 'alt', label: 'Texte alternatif', type: 'text' },
      { key: 'caption', label: 'Légende', type: 'text' },
    ],
    defaults: { imageUrl: '' },
  },
  {
    type: 'contactForm',
    label: 'Formulaire de contact',
    description: 'Formulaire enregistré dans l’admin.',
    icon: 'mail',
    group: 'Formulaires',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea' },
      { key: 'showContactInfo', label: 'Afficher les coordonnées du cabinet', type: 'boolean' },
    ],
    defaults: { title: 'Écrivez-nous', showContactInfo: true },
  },
  {
    type: 'quoteForm',
    label: 'Demande de devis',
    description: 'Formulaire de devis lié à un service.',
    icon: 'file-text',
    group: 'Formulaires',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'subtitle', label: 'Sous-titre', type: 'textarea' },
    ],
    defaults: { title: 'Demander un devis' },
  },

  /* --- Médias et mise en page ------------------------------------------- */

  {
    type: 'carousel',
    label: 'Carrousel',
    description: 'Diapositives d’images ou de vidéos qui défilent, avec titre et bouton.',
    icon: 'images',
    group: 'Médias',
    fields: [
      {
        key: 'height',
        label: 'Hauteur',
        type: 'select',
        options: [
          { value: 'md', label: 'Moyenne' },
          { value: 'sm', label: 'Basse (bandeau)' },
          { value: 'lg', label: 'Grande' },
          { value: 'screen', label: 'Plein écran' },
        ],
      },
      {
        key: 'width',
        label: 'Largeur',
        type: 'select',
        options: [
          { value: 'full', label: 'Toute la largeur de l’écran' },
          { value: 'contained', label: 'Dans la colonne du site' },
        ],
      },
      { key: 'autoplay', label: 'Défilement automatique (secondes, 0 pour aucun)', type: 'number' },
      {
        key: 'items',
        label: 'Diapositives',
        type: 'objectList',
        itemLabel: 'Diapositive',
        fields: [
          { key: 'mediaUrl', label: 'Image ou vidéo', type: 'image' },
          { key: 'title', label: 'Titre', type: 'text' },
          { key: 'text', label: 'Texte', type: 'textarea' },
          { key: 'ctaLabel', label: 'Texte du bouton', type: 'text' },
          { key: 'ctaHref', label: 'Lien du bouton', type: 'text' },
        ],
      },
    ],
    defaults: {
      height: 'md',
      width: 'full',
      autoplay: 6,
      items: [
        { mediaUrl: '', title: 'Première diapositive', text: 'Un message court et clair.', ctaLabel: '', ctaHref: '' },
        { mediaUrl: '', title: 'Deuxième diapositive', text: '', ctaLabel: '', ctaHref: '' },
      ],
    },
  },
  {
    type: 'mediaText',
    label: 'Texte et visuel',
    description: 'Un texte mis en forme à côté d’une image ou d’une vidéo.',
    icon: 'panels-top-left',
    group: 'Médias',
    fields: [
      { key: 'eyebrow', label: 'Surtitre', type: 'text' },
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'content', label: 'Texte', type: 'richtext' },
      { key: 'mediaUrl', label: 'Image ou vidéo', type: 'image' },
      {
        key: 'mediaPosition',
        label: 'Position du visuel',
        type: 'select',
        options: [
          { value: 'right', label: 'À droite' },
          { value: 'left', label: 'À gauche' },
        ],
      },
      { key: 'ctaLabel', label: 'Texte du bouton', type: 'text' },
      { key: 'ctaHref', label: 'Lien du bouton', type: 'text' },
    ],
    defaults: { title: 'Un titre clair', content: '', mediaUrl: '', mediaPosition: 'right' },
  },
  {
    type: 'gallery',
    label: 'Galerie',
    description: 'Une grille d’images ou de vidéos, avec légendes.',
    icon: 'image',
    group: 'Médias',
    fields: [
      { key: 'title', label: 'Titre (facultatif)', type: 'text' },
      {
        key: 'columns',
        label: 'Colonnes',
        type: 'select',
        options: [
          { value: '3', label: '3 colonnes' },
          { value: '2', label: '2 colonnes' },
          { value: '4', label: '4 colonnes' },
        ],
      },
      {
        key: 'items',
        label: 'Éléments',
        type: 'objectList',
        itemLabel: 'Élément',
        fields: [
          { key: 'mediaUrl', label: 'Image ou vidéo', type: 'image' },
          { key: 'caption', label: 'Légende', type: 'text' },
        ],
      },
    ],
    defaults: { columns: '3', items: [] },
  },
  {
    type: 'heading',
    label: 'Titre de section',
    description: 'Un titre et une accroche, pour ouvrir une partie de la page.',
    icon: 'text',
    group: 'Structure',
    fields: [
      { key: 'eyebrow', label: 'Surtitre', type: 'text' },
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'subtitle', label: 'Accroche', type: 'textarea' },
      {
        key: 'align',
        label: 'Alignement',
        type: 'select',
        options: [
          { value: 'center', label: 'Centré' },
          { value: 'left', label: 'À gauche' },
        ],
      },
    ],
    defaults: { title: 'Titre de la section', subtitle: '', align: 'center' },
  },
  {
    type: 'buttons',
    label: 'Boutons',
    description: 'Un ou plusieurs boutons d’action, côte à côte.',
    icon: 'megaphone',
    group: 'Structure',
    fields: [
      {
        key: 'align',
        label: 'Alignement',
        type: 'select',
        options: [
          { value: 'center', label: 'Centré' },
          { value: 'left', label: 'À gauche' },
        ],
      },
      {
        key: 'items',
        label: 'Boutons',
        type: 'objectList',
        itemLabel: 'Bouton',
        fields: [
          { key: 'label', label: 'Texte', type: 'text' },
          { key: 'href', label: 'Lien', type: 'text', placeholder: '/contact ou #offre' },
          {
            key: 'variant',
            label: 'Apparence',
            type: 'select',
            options: [
              { value: 'accent', label: 'Principal (couleur d’accent)' },
              { value: 'primary', label: 'Couleur de marque' },
              { value: 'outline', label: 'Contour' },
              { value: 'whatsapp', label: 'WhatsApp' },
            ],
          },
        ],
      },
    ],
    defaults: { align: 'center', items: [{ label: 'Je réserve ma place', href: '#offre', variant: 'accent' }] },
  },
  {
    type: 'countdown',
    label: 'Compte à rebours',
    description: 'Un minuteur jusqu’à une date : fin d’offre, début de session…',
    icon: 'timer',
    group: 'Vente',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      {
        key: 'useOffer',
        label: 'Reprendre la date de l’offre liée',
        type: 'boolean',
        help: 'Utilise le compte à rebours réglé sur la formation, le service ou le produit de la page.',
      },
      { key: 'endsAt', label: 'Date et heure de fin', type: 'datetime' },
      { key: 'expiredText', label: 'Message une fois le délai écoulé', type: 'text' },
      { key: 'ctaLabel', label: 'Texte du bouton', type: 'text' },
      { key: 'ctaHref', label: 'Lien du bouton', type: 'text' },
    ],
    defaults: {
      title: 'L’offre se termine dans',
      useOffer: true,
      endsAt: '',
      expiredText: 'Cette offre est terminée.',
      ctaLabel: 'J’en profite',
      ctaHref: '#offre',
    },
  },
  {
    type: 'spacer',
    label: 'Espacement',
    description: 'Un espace vide, avec ou sans trait de séparation.',
    icon: 'grid-3x3',
    group: 'Structure',
    fields: [
      {
        key: 'size',
        label: 'Hauteur',
        type: 'select',
        options: [
          { value: 'md', label: 'Moyenne' },
          { value: 'sm', label: 'Petite' },
          { value: 'lg', label: 'Grande' },
        ],
      },
      { key: 'divider', label: 'Afficher un trait de séparation', type: 'boolean' },
    ],
    defaults: { size: 'md', divider: false },
  },
]

export const BLOCK_DEF_MAP = new Map<BlockType, BlockDef>(BLOCK_DEFS.map((d) => [d.type, d]))

export function getBlockDef(type: BlockType | string): BlockDef | undefined {
  return BLOCK_DEF_MAP.get(type as BlockType)
}

/** Nouveau bloc pré-rempli, prêt à être inséré dans une page. */
export function createBlock(type: BlockType): Block {
  const def = getBlockDef(type)
  return {
    id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    type,
    data: structuredClone(def?.defaults ?? {}),
  }
}

/** Normalise le JSONB venu de la base en tableau de blocs exploitable. */
export function parseBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (b): b is Block =>
        typeof b === 'object' && b !== null && 'type' in b && typeof (b as Block).type === 'string',
    )
    .map((b) => {
      // Le style est toujours revalidé : il finit dans des attributs `style`.
      const style = sanitizeBlockStyle(b.style)
      const { style: _ignored, ...rest } = b
      void _ignored
      return style ? { ...rest, style } : rest
    })
}

/**
 * Présentation par blocs d'une fiche (formation, service, produit, article).
 *
 * Si la fiche n'a pas encore de blocs mais une présentation riche historique,
 * celle-ci devient un premier bloc « Texte libre » : rien n'est perdu, et la
 * page publique reste identique tant qu'on n'y touche pas.
 */
export function presentationBlocks(blocks: unknown, legacyContent?: string | null): Block[] {
  const parsed = parseBlocks(blocks)
  if (parsed.length > 0 || !legacyContent?.trim()) return parsed
  return [
    {
      id: 'legacy-presentation',
      type: 'richText',
      data: { title: '', content: legacyContent, width: 'narrow' },
    },
  ]
}
