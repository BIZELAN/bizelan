import {
  AlertCircle,
  ArrowLeftRight,
  Award,
  BadgeDollarSign,
  BadgeCheck,
  BarChart3,
  Banknote,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Coins,
  Compass,
  CreditCard,
  Download,
  Droplets,
  FileBarChart,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flag,
  Gauge,
  Gift,
  Grid3x3,
  Globe,
  GraduationCap,
  HandCoins,
  Handshake,
  Headphones,
  Heart,
  HelpCircle,
  Image,
  Inbox,
  Key,
  Landmark,
  Laptop,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  Leaf,
  Lightbulb,
  LineChart,
  Link2,
  ListOrdered,
  ListChecks,
  Lock,
  Mail,
  Map,
  MapPin,
  Medal,
  Megaphone,
  MessageCircle,
  MessageSquareQuote,
  MessagesSquare,
  Monitor,
  Newspaper,
  Package,
  PanelsTopLeft,
  PenLine,
  Phone,
  PieChart,
  PiggyBank,
  PlayCircle,
  Presentation,
  Quote,
  Receipt,
  Repeat,
  Rocket,
  Route,
  Scale,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Signal,
  Smartphone,
  Sparkles,
  Square,
  Sprout,
  Star,
  Store,
  Sun,
  Tag,
  Target,
  Thermometer,
  Timer,
  TrendingUp,
  Trophy,
  Type,
  Truck,
  Umbrella,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Video,
  Wallet,
  Warehouse,
  Wheat,
  Workflow,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { WhatsAppIcon } from '@/components/ui/brand-icons'

/**
 * Bibliothèque d'icônes du site.
 *
 * CHOISIE, et non exhaustive. Deux raisons, dans cet ordre :
 *
 * 1. Lucide expose plus de cinq mille icônes. Les charger toutes par
 *    `import * as Icons` avec une résolution dynamique annule l'élagage du
 *    paquet : la bibliothèque entière partait dans le navigateur. Depuis que
 *    le moteur de blocs peut se rendre côté client, l'éditeur de pages pesait
 *    471 ko contre 123 pour les autres écrans. Les imports nommés ci-dessous
 *    rétablissent l'élagage.
 * 2. Choisir parmi cinq mille icônes est plus pénible que choisir parmi cent.
 *    Celles retenues couvrent ce que vend et enseigne le cabinet ; le reste
 *    n'aurait fait qu'allonger la liste.
 *
 * Chaque entrée porte un libellé français et des mots-clés : on cherche
 * « argent » et on trouve la pièce, le portefeuille et la tirelire, sans avoir
 * à deviner le nom anglais.
 */

export interface IconEntry {
  name: string
  label: string
  keywords: string
  Icon: LucideIcon
}

export interface IconGroup {
  title: string
  icons: IconEntry[]
}

const g = (title: string, icons: [string, string, string, LucideIcon][]): IconGroup => ({
  title,
  icons: icons.map(([name, label, keywords, Icon]) => ({ name, label, keywords, Icon })),
})

export const ICON_GROUPS: IconGroup[] = [
  g('Formation', [
    ['GraduationCap', 'Diplôme', 'formation cours apprendre école étudiant', GraduationCap],
    ['BookOpen', 'Livre ouvert', 'lecture manuel cours contenu', BookOpen],
    ['Presentation', 'Présentation', 'atelier séminaire tableau cours', Presentation],
    ['Video', 'Vidéo', 'film leçon enregistrement', Video],
    ['PlayCircle', 'Lecture', 'vidéo démarrer regarder', PlayCircle],
    ['Award', 'Récompense', 'certificat attestation diplôme', Award],
    ['Medal', 'Médaille', 'certificat réussite distinction', Medal],
    ['Trophy', 'Trophée', 'réussite victoire excellence', Trophy],
    ['ListChecks', 'Programme', 'sommaire étapes modules liste', ListChecks],
    ['Layers', 'Modules', 'niveaux couches organisation', Layers],
    ['Laptop', 'Ordinateur', 'en ligne distance numérique', Laptop],
    ['Monitor', 'Écran', 'en ligne visioconférence', Monitor],
  ]),

  g('Conseil et accompagnement', [
    ['Briefcase', 'Mallette', 'entreprise professionnel affaires métier', Briefcase],
    ['Handshake', 'Poignée de main', 'partenariat accord confiance client', Handshake],
    ['Users', 'Équipe', 'groupe clients personnes collectif', Users],
    ['UserCheck', 'Personne validée', 'client accompagné suivi', UserCheck],
    ['UserPlus', 'Nouveau client', 'inscription adhésion ajout', UserPlus],
    ['Compass', 'Boussole', 'orientation stratégie direction cap', Compass],
    ['Target', 'Cible', 'objectif but résultat', Target],
    ['Route', 'Parcours', 'chemin étapes feuille de route', Route],
    ['Workflow', 'Processus', 'méthode démarche enchaînement', Workflow],
    ['Lightbulb', 'Idée', 'conseil innovation solution', Lightbulb],
    ['Rocket', 'Lancement', 'démarrage croissance accélération', Rocket],
    ['Sparkles', 'Nouveauté', 'mise en avant spécial premium', Sparkles],
  ]),

  g('Agriculture', [
    ['Sprout', 'Pousse', 'agriculture semis croissance plante', Sprout],
    ['Leaf', 'Feuille', 'nature écologie végétal durable', Leaf],
    ['Wheat', 'Épi', 'céréale récolte culture champ', Wheat],
    ['Droplets', 'Gouttes', 'irrigation eau arrosage', Droplets],
    ['Sun', 'Soleil', 'climat saison ensoleillement', Sun],
    ['Thermometer', 'Température', 'climat mesure conservation', Thermometer],
    ['Warehouse', 'Entrepôt', 'stockage hangar récolte', Warehouse],
    ['Truck', 'Camion', 'transport livraison logistique', Truck],
    ['Package', 'Colis', 'produit emballage expédition', Package],
    ['Umbrella', 'Parapluie', 'protection assurance risque pluie', Umbrella],
  ]),

  g('Finance', [
    ['Banknote', 'Billet', 'argent paiement prix monnaie', Banknote],
    ['Coins', 'Pièces', 'argent monnaie coût budget', Coins],
    ['HandCoins', 'Financement', 'subvention prêt apport argent', HandCoins],
    ['Wallet', 'Portefeuille', 'argent budget dépenses', Wallet],
    ['PiggyBank', 'Tirelire', 'épargne économie réserve', PiggyBank],
    ['CreditCard', 'Carte', 'paiement bancaire achat', CreditCard],
    ['Receipt', 'Reçu', 'facture commande justificatif', Receipt],
    ['Calculator', 'Calculatrice', 'budget prévisionnel chiffrage', Calculator],
    ['Landmark', 'Banque', 'institution crédit établissement', Landmark],
    ['Scale', 'Balance', 'équilibre juridique comparaison', Scale],
    ['ShoppingCart', 'Panier', 'achat commande boutique', ShoppingCart],
    ['Store', 'Boutique', 'commerce vente magasin', Store],
  ]),

  g('Données et suivi', [
    ['BarChart3', 'Histogramme', 'statistiques données chiffres', BarChart3],
    ['LineChart', 'Courbe', 'évolution tendance suivi', LineChart],
    ['PieChart', 'Camembert', 'répartition part proportion', PieChart],
    ['TrendingUp', 'Croissance', 'progression hausse résultat', TrendingUp],
    ['Gauge', 'Jauge', 'performance mesure indicateur', Gauge],
    ['FileBarChart', 'Rapport', 'analyse bilan étude document', FileBarChart],
    ['Signal', 'Signal', 'indicateur niveau couverture', Signal],
    ['Filter', 'Filtre', 'tri sélection critère', Filter],
    ['Search', 'Recherche', 'trouver explorer analyser', Search],
  ]),

  g('Documents', [
    ['FileText', 'Document', 'texte dossier fichier', FileText],
    ['FileCheck', 'Document validé', 'conforme vérifié approuvé', FileCheck],
    ['FileSpreadsheet', 'Tableur', 'excel budget tableau calcul', FileSpreadsheet],
    ['ClipboardList', 'Liste', 'checklist inventaire relevé', ClipboardList],
    ['ClipboardCheck', 'Liste validée', 'contrôle conformité vérification', ClipboardCheck],
    ['PenLine', 'Rédaction', 'écrire modifier signature', PenLine],
    ['Download', 'Téléchargement', 'support fichier obtenir', Download],
    ['Image', 'Image', 'photo visuel illustration', Image],
    ['Newspaper', 'Journal', 'article blog actualité presse', Newspaper],
    ['Quote', 'Citation', 'témoignage avis parole', Quote],
  ]),

  g('Confiance et sécurité', [
    ['ShieldCheck', 'Bouclier validé', 'garantie sécurité confiance', ShieldCheck],
    ['Shield', 'Bouclier', 'protection sécurité', Shield],
    ['BadgeCheck', 'Certifié', 'officiel vérifié label', BadgeCheck],
    ['CheckCircle2', 'Validé', 'confirmé réussi coche', CheckCircle2],
    ['Lock', 'Cadenas', 'sécurité privé confidentiel', Lock],
    ['Key', 'Clé', 'accès autorisation licence', Key],
    ['Heart', 'Cœur', 'satisfaction engagement humain', Heart],
    ['Star', 'Étoile', 'note avis qualité favori', Star],
  ]),

  g('Contact et communication', [
    ['Phone', 'Téléphone', 'appel contact numéro', Phone],
    ['Smartphone', 'Mobile', 'téléphone portable sms', Smartphone],
    ['Mail', 'E-mail', 'courriel message contact', Mail],
    // Le mot « whatsapp » est retiré des synonymes de la bulle générique :
    // l'icone de marque existe désormais, et c'est elle que la recherche doit
    // remonter.
    ['MessageCircle', 'Message', 'discussion bulle échange', MessageCircle],
    ['WhatsApp', 'WhatsApp', 'whatsapp discussion contact messagerie', WhatsAppIcon],
    ['MessagesSquare', 'Échanges', 'conversation forum discussion', MessagesSquare],
    ['Send', 'Envoyer', 'transmettre expédier message', Send],
    ['Megaphone', 'Annonce', 'communication promotion diffusion', Megaphone],
    ['Bell', 'Notification', 'alerte rappel information', Bell],
    ['Headphones', 'Assistance', 'support écoute accompagnement', Headphones],
    ['Share2', 'Partage', 'diffuser transmettre réseau', Share2],
    ['Link2', 'Lien', 'url adresse renvoi', Link2],
    ['Globe', 'Monde', 'international web en ligne', Globe],
  ]),

  g('Repères', [
    ['MapPin', 'Localisation', 'adresse lieu carte', MapPin],
    ['Map', 'Carte', 'plan territoire zone', Map],
    ['Building2', 'Bâtiment', 'entreprise bureau siège', Building2],
    ['Calendar', 'Calendrier', 'date planning séance', Calendar],
    ['CalendarCheck', 'Date confirmée', 'inscription rendez-vous', CalendarCheck],
    ['Clock', 'Horloge', 'durée horaire temps', Clock],
    ['Timer', 'Minuteur', 'durée délai rythme', Timer],
    ['Flag', 'Drapeau', 'étape jalon objectif', Flag],
    ['Repeat', 'Répétition', 'récurrence cycle abonnement', Repeat],
    ['Zap', 'Éclair', 'rapidité énergie immédiat', Zap],
    ['Gift', 'Cadeau', 'offert bonus promotion', Gift],
    ['Tag', 'Étiquette', 'prix promotion catégorie', Tag],
    ['Inbox', 'Boîte de réception', 'demandes messages reçus', Inbox],
    ['Settings', 'Réglages', 'paramètres configuration', Settings],
    ['LayoutDashboard', 'Tableau de bord', 'accueil vue ensemble', LayoutDashboard],
    ['HelpCircle', 'Aide', 'question faq information', HelpCircle],
    ['Wrench', 'Outil', 'maintenance réglage technique', Wrench],
  ]),
]

/** Index plat, pour résoudre un nom en composant. */
export const ICONS: Record<string, LucideIcon> = Object.fromEntries(
  ICON_GROUPS.flatMap((group) => group.icons.map((entry) => [entry.name, entry.Icon])),
)

export const ICON_LIST: IconEntry[] = ICON_GROUPS.flatMap((group) => group.icons)

/**
 * Résout un nom d'icône, en tolérant les formes anciennes.
 *
 * Le champ était un texte libre : la base contient des `clock`, `play-circle`
 * et autres saisies manuelles. On les normalise plutôt que de les perdre —
 * une icône qui disparaît d'une page en production est un dégât gratuit.
 */
export function resolveIcon(name: string | undefined | null): LucideIcon | null {
  if (!name) return null

  const direct = ICONS[name]
  if (direct) return direct

  const pascal = name
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')

  return ICONS[pascal] ?? null
}

/** Recherche sur le libellé, les mots-clés et le nom technique. */
export function searchIcons(query: string): IconEntry[] {
  const q = query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  if (!q) return ICON_LIST

  const fold = (value: string) =>
    value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  return ICON_LIST.filter(
    (entry) =>
      fold(entry.label).includes(q) ||
      fold(entry.keywords).includes(q) ||
      fold(entry.name).includes(q),
  )
}

/* ------------------------------------------------------------------ */
/* Icônes des TYPES de blocs                                           */
/* ------------------------------------------------------------------ */

/**
 * Repères de l’éditeur, et non du contenu : ils étiquettent les
 * types de blocs dans le sélecteur. Ils vivent à part de `ICON_GROUPS` pour
 * cette raison — on ne les propose jamais à l'administration, qui choisit une
 * icône pour SA page, pas pour l'outil.
 *
 * Carte explicite là encore : `import * as Icons` suffirait, mais ce fichier
 * est importé par l'éditeur, donc par le navigateur.
 */
export const BLOCK_TYPE_ICONS: Record<string, LucideIcon> = {
  // `features`, `about` et `stats` déclaraient ces trois icônes, absentes de
  // la carte : l'éditeur les montrait sous un carré générique.
  'bar-chart-3': BarChart3,
  'building-2': Building2,
  'grid-3x3': Grid3x3,
  'alert-circle': AlertCircle,
  'arrow-left-right': ArrowLeftRight,
  'badge-dollar-sign': BadgeDollarSign,
  briefcase: Briefcase,
  'check-circle': CheckCircle2,
  'file-text': FileText,
  gift: Gift,
  'graduation-cap': GraduationCap,
  'help-circle': HelpCircle,
  image: Image,
  'layout-template': LayoutTemplate,
  'list-ordered': ListOrdered,
  mail: Mail,
  megaphone: Megaphone,
  'message-square-quote': MessageSquareQuote,
  newspaper: Newspaper,
  package: Package,
  'panels-top-left': PanelsTopLeft,
  'play-circle': PlayCircle,
  quote: Quote,
  star: Star,
  text: Type,
  'users-round': UsersRound,
}

/** Icône d'un type de bloc, avec un repli neutre plutôt qu'un trou. */
export function blockTypeIcon(name: string | undefined): LucideIcon {
  return (name && BLOCK_TYPE_ICONS[name]) || Square
}
