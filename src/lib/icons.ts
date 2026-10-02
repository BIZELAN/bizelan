import {
  Accessibility, Activity, AlarmClock, AlertCircle, Anchor, Apple, Archive, ArrowLeftRight, ArrowRight,
  ArrowUpRight, AtSign, Award, BadgeAlert, BadgeCheck, BadgeDollarSign, BadgeInfo, BadgePercent, Baby,
  Ban, Banknote, BarChart3, Battery, Beef, Bell, BellRing, Bike, Bird, Bitcoin, Book, BookA, BookCheck,
  BookHeart, BookMarked, BookOpen, Bookmark, Bot, Box, Boxes, Brain, Briefcase, Brush, Building,
  Building2, Bus, Cake, Calculator, Calendar, Calendar1, CalendarCheck, CalendarClock, CalendarDays,
  Camera, Car, Carrot, Cat, ChartBar, ChartColumnIncreasing, ChartLine, ChartNoAxesCombined, ChartPie,
  CheckCircle2, ChefHat, Cherry, ChevronRight, CircleDollarSign, CircleX, Citrus, Clapperboard,
  Clipboard, ClipboardCheck, ClipboardList, Clock, Cloud, CloudRain, CloudSun, Code, CodeXml, Coffee,
  Coins, Compass, Construction, Contact, Container, Cookie, Cpu, CreditCard, Croissant, Crown, Database,
  Diamond, Dog, DollarSign, Download, Droplets, Dumbbell, Earth, Egg, Eraser, Euro, Eye, Facebook,
  Factory, FileBarChart, FileCheck, FileQuestion, FileSignature, FileSpreadsheet, FileText, Film, Filter,
  Fingerprint, Fish, Flag, Flame, FlaskConical, Flower, Flower2, Folder, FolderOpen, Footprints, Forklift,
  Fuel, Gamepad2, Gauge, Gavel, Gem, Gift, Globe, Goal, GraduationCap, Grape, Grid3x3, Hammer, Hand,
  HandCoins, HandHeart, Handshake, HardDrive, HardHat, Headphones, Heart, HeartHandshake, HeartPulse,
  HelpCircle, Highlighter, Hospital, Hotel, Hourglass, House, IdCard, Image, Images, Inbox, Info,
  Infinity as InfinityIcon, Instagram, Kanban, Key, Keyboard, Lamp, Landmark, Languages, Laptop, Layers,
  LayoutDashboard, LayoutGrid, LayoutTemplate, Leaf, Library, Lightbulb, LightbulbOff, LineChart, Link2,
  Linkedin, ListChecks, ListOrdered, ListTodo, Locate, Lock, LockOpen, Magnet, Mail, MailOpen, Map,
  MapPin, Medal, Megaphone, MessageCircle, MessageCircleQuestion, MessageSquare, MessageSquareQuote,
  MessageSquareText, MessagesSquare, Mic, Microscope, Milestone, Milk, Minus, Monitor, MonitorPlay, Moon,
  Mountain, Mouse, Music, Navigation, Network, Newspaper, Notebook, NotebookPen, Package, Palette,
  Paintbrush, PanelsTopLeft, Paperclip, PartyPopper, Pen, PenLine, PenTool, Pencil, Percent,
  PersonStanding, Phone, PhoneCall, PieChart, PiggyBank, Pizza, Plane, PlayCircle, Plug, Plus, Podcast,
  Presentation, Printer, Projector, Puzzle, QrCode, Quote, Rabbit, Radio, Receipt, ReceiptText, Recycle,
  RefreshCw, Repeat, Ribbon, Rocket, RotateCcw, Route, Rss, Ruler, Salad, Sandwich, Scale, ScanLine,
  School, Scissors, ScrollText, Search, Send, Server, Settings, Shapes, Share2, Sheet, Shield,
  ShieldAlert, ShieldCheck, Ship, Shirt, ShoppingBag, ShoppingBasket, ShoppingCart, Shovel, Signal,
  Signpost, Siren, SlidersHorizontal, Smartphone, Smile, Snowflake, Sofa, Soup, Sparkle, Sparkles,
  Speech, Sprout, Square, Squirrel, Stamp, Star, StarHalf, Stethoscope, Store, Sun, Sunrise, Table,
  Tablet, Tag, Target, Tent, Terminal, Thermometer, ThumbsDown, ThumbsUp, Ticket, Timer, TimerReset,
  Tractor, TrainFront, TreeDeciduous, TreePine, Trees, TrendingDown, TrendingUp, TriangleAlert, Trophy,
  Truck, Tv, Twitter, Type, Umbrella, University, User, UserCheck, UserCog, UserPlus, UserRound, Users,
  UsersRound, UtensilsCrossed, Vault, Video, Voicemail, Volleyball, Wallet, Wand2, Warehouse, Watch,
  Wheat, Wifi, Wind, Workflow, Wrench, Youtube, Zap,
  type LucideIcon,
} from 'lucide-react'

import { WhatsAppIcon } from '@/components/ui/brand-icons'

/**
 * Bibliothèque d'icônes du site.
 *
 * CHOISIE, et non exhaustive — environ trois cent cinquante icônes, rangées
 * par thème. Deux raisons de ne pas tout proposer :
 *
 * 1. Lucide expose plus de cinq mille icônes. Les charger toutes par
 *    `import * as Icons` avec une résolution dynamique annule l'élagage du
 *    paquet : la bibliothèque entière partait dans le navigateur. Les imports
 *    nommés ci-dessus le préservent.
 * 2. Une grille de cinq mille vignettes ne se parcourt pas. Celles retenues
 *    couvrent ce que vend et enseigne le cabinet, et les secteurs de ses
 *    clients (agriculture, commerce, santé, transport, numérique…).
 *
 * Les NOMS déjà enregistrés ne changent jamais : ils sont stockés dans les
 * pages publiées. On ajoute, on ne renomme pas.
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
  g('Formation et savoir', [
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
    ['School', 'École', 'établissement classe enseignement', School],
    ['University', 'Université', 'académie institut supérieur', University],
    ['Library', 'Bibliothèque', 'ressources livres documentation', Library],
    ['Book', 'Livre', 'manuel guide ouvrage', Book],
    ['BookA', 'Dictionnaire', 'vocabulaire lexique langue', BookA],
    ['BookMarked', 'Livre marqué', 'référence chapitre favori', BookMarked],
    ['BookCheck', 'Livre validé', 'lu terminé acquis', BookCheck],
    ['BookHeart', 'Livre favori', 'coup de cœur recommandé', BookHeart],
    ['Notebook', 'Carnet', 'cahier notes prise de notes', Notebook],
    ['NotebookPen', 'Carnet et stylo', 'exercice devoir rédaction', NotebookPen],
    ['Pencil', 'Crayon', 'écrire modifier dessin', Pencil],
    ['Pen', 'Stylo', 'écrire signer', Pen],
    ['PenTool', 'Plume', 'design création graphisme', PenTool],
    ['Highlighter', 'Surligneur', 'important retenir réviser', Highlighter],
    ['Eraser', 'Gomme', 'corriger effacer', Eraser],
    ['Brain', 'Cerveau', 'réflexion intelligence mémoire compétence', Brain],
    ['Puzzle', 'Puzzle', 'solution pièce assemblage', Puzzle],
    ['Microscope', 'Microscope', 'recherche analyse science', Microscope],
    ['FlaskConical', 'Laboratoire', 'expérience test science', FlaskConical],
    ['Languages', 'Langues', 'traduction international bilingue', Languages],
    ['ScrollText', 'Parchemin', 'certificat règlement charte attestation', ScrollText],
    ['Shapes', 'Formes', 'créativité atelier ludique', Shapes],
    ['FileQuestion', 'Quiz', 'question test évaluation examen', FileQuestion],
  ]),

  g('Conseil et accompagnement', [
    ['Briefcase', 'Mallette', 'entreprise professionnel affaires métier', Briefcase],
    ['Handshake', 'Poignée de main', 'partenariat accord confiance client', Handshake],
    ['Users', 'Équipe', 'groupe clients personnes collectif', Users],
    ['UsersRound', 'Communauté', 'groupe membres réseau', UsersRound],
    ['UserCheck', 'Personne validée', 'client accompagné suivi', UserCheck],
    ['UserPlus', 'Nouveau client', 'inscription adhésion ajout', UserPlus],
    ['User', 'Personne', 'profil compte individu', User],
    ['UserRound', 'Profil', 'membre utilisateur portrait', UserRound],
    ['UserCog', 'Gestionnaire', 'administration responsable', UserCog],
    ['Contact', 'Fiche contact', 'carnet coordonnées annuaire', Contact],
    ['IdCard', 'Carte d’identité', 'badge identité membre', IdCard],
    ['PersonStanding', 'Individu', 'personne humain accompagnement', PersonStanding],
    ['Compass', 'Boussole', 'orientation stratégie direction cap', Compass],
    ['Target', 'Cible', 'objectif but résultat', Target],
    ['Goal', 'But atteint', 'objectif réussite cible drapeau', Goal],
    ['Route', 'Parcours', 'chemin étapes feuille de route', Route],
    ['Milestone', 'Jalon', 'étape panneau progression', Milestone],
    ['Signpost', 'Panneau', 'orientation choix direction', Signpost],
    ['Mountain', 'Montagne', 'défi ambition sommet', Mountain],
    ['Workflow', 'Processus', 'méthode démarche enchaînement', Workflow],
    ['Network', 'Réseau', 'organisation structure relations', Network],
    ['Lightbulb', 'Idée', 'conseil innovation solution', Lightbulb],
    ['Rocket', 'Lancement', 'démarrage croissance accélération', Rocket],
    ['Sparkles', 'Nouveauté', 'mise en avant spécial premium', Sparkles],
    ['Crown', 'Couronne', 'premium meilleur leader vip', Crown],
    ['Gem', 'Joyau', 'valeur premium précieux', Gem],
    ['Diamond', 'Losange', 'qualité excellence', Diamond],
    ['HeartHandshake', 'Engagement', 'solidarité soutien confiance', HeartHandshake],
    ['HandHeart', 'Bienveillance', 'aide soutien solidarité don', HandHeart],
    ['Smile', 'Sourire', 'satisfaction bonheur client content', Smile],
    ['ThumbsUp', 'Pouce levé', 'approuvé recommandé satisfaction', ThumbsUp],
    ['PartyPopper', 'Fête', 'célébration félicitations succès', PartyPopper],
    ['Hand', 'Main', 'stop aide bonjour', Hand],
    ['Ribbon', 'Ruban', 'cause soutien distinction', Ribbon],
  ]),

  g('Agriculture et alimentation', [
    ['Sprout', 'Pousse', 'agriculture semis croissance plante', Sprout],
    ['Leaf', 'Feuille', 'nature écologie végétal durable', Leaf],
    ['Wheat', 'Épi', 'céréale récolte culture champ', Wheat],
    ['Tractor', 'Tracteur', 'agriculture machine champ exploitation', Tractor],
    ['Shovel', 'Pelle', 'jardinage terre travaux', Shovel],
    ['Droplets', 'Gouttes', 'irrigation eau arrosage', Droplets],
    ['Trees', 'Arbres', 'forêt plantation agroforesterie', Trees],
    ['TreePine', 'Conifère', 'forêt bois sapin', TreePine],
    ['TreeDeciduous', 'Arbre', 'verger plantation nature', TreeDeciduous],
    ['Flower', 'Fleur', 'horticulture floraison', Flower],
    ['Flower2', 'Tournesol', 'fleur floraison jardin', Flower2],
    ['Apple', 'Pomme', 'fruit verger alimentation', Apple],
    ['Citrus', 'Agrume', 'orange citron fruit', Citrus],
    ['Cherry', 'Cerise', 'fruit récolte', Cherry],
    ['Grape', 'Raisin', 'vigne fruit', Grape],
    ['Carrot', 'Carotte', 'légume maraîchage potager', Carrot],
    ['Salad', 'Salade', 'légumes maraîchage frais', Salad],
    ['Egg', 'Œuf', 'aviculture poule ponte', Egg],
    ['Bird', 'Oiseau', 'aviculture volaille élevage', Bird],
    ['Beef', 'Viande', 'élevage bovin boucherie', Beef],
    ['Milk', 'Lait', 'laiterie élevage produits laitiers', Milk],
    ['Fish', 'Poisson', 'pisciculture pêche aquaculture', Fish],
    ['Rabbit', 'Lapin', 'cuniculture élevage', Rabbit],
    ['Squirrel', 'Écureuil', 'faune nature', Squirrel],
    ['Dog', 'Chien', 'animal compagnie', Dog],
    ['Cat', 'Chat', 'animal compagnie', Cat],
    ['Warehouse', 'Entrepôt', 'stockage hangar récolte', Warehouse],
    ['Recycle', 'Recyclage', 'écologie durable environnement', Recycle],
    ['Coffee', 'Café', 'boisson pause cacao', Coffee],
    ['Soup', 'Soupe', 'cuisine repas transformation', Soup],
    ['Croissant', 'Viennoiserie', 'boulangerie pâtisserie', Croissant],
    ['Cookie', 'Biscuit', 'pâtisserie gourmandise', Cookie],
    ['Sandwich', 'Sandwich', 'restauration rapide repas', Sandwich],
    ['Pizza', 'Pizza', 'restauration repas', Pizza],
    ['Cake', 'Gâteau', 'pâtisserie anniversaire fête', Cake],
    ['UtensilsCrossed', 'Restaurant', 'repas cuisine restauration', UtensilsCrossed],
    ['ChefHat', 'Toque', 'cuisine chef restauration', ChefHat],
  ]),

  g('Nature et climat', [
    ['Sun', 'Soleil', 'climat saison ensoleillement', Sun],
    ['Sunrise', 'Lever du soleil', 'matin début nouveau départ', Sunrise],
    ['Moon', 'Lune', 'nuit soir', Moon],
    ['Cloud', 'Nuage', 'météo cloud stockage en ligne', Cloud],
    ['CloudRain', 'Pluie', 'météo saison des pluies', CloudRain],
    ['CloudSun', 'Éclaircie', 'météo climat temps', CloudSun],
    ['Wind', 'Vent', 'météo énergie éolienne', Wind],
    ['Snowflake', 'Flocon', 'froid conservation frais', Snowflake],
    ['Thermometer', 'Température', 'climat mesure conservation', Thermometer],
    ['Umbrella', 'Parapluie', 'protection assurance risque pluie', Umbrella],
    ['Earth', 'Planète', 'monde environnement international', Earth],
    ['Flame', 'Flamme', 'énergie passion tendance populaire', Flame],
    ['Tent', 'Tente', 'camp séminaire plein air', Tent],
  ]),

  g('Finance et commerce', [
    ['Banknote', 'Billet', 'argent paiement prix monnaie', Banknote],
    ['Coins', 'Pièces', 'argent monnaie coût budget', Coins],
    ['HandCoins', 'Financement', 'subvention prêt apport argent', HandCoins],
    ['Wallet', 'Portefeuille', 'argent budget dépenses', Wallet],
    ['PiggyBank', 'Tirelire', 'épargne économie réserve', PiggyBank],
    ['CreditCard', 'Carte', 'paiement bancaire achat', CreditCard],
    ['Receipt', 'Reçu', 'facture commande justificatif', Receipt],
    ['ReceiptText', 'Facture', 'devis reçu détail', ReceiptText],
    ['Calculator', 'Calculatrice', 'budget prévisionnel chiffrage', Calculator],
    ['Landmark', 'Banque', 'institution crédit établissement', Landmark],
    ['Vault', 'Coffre-fort', 'épargne sécurité trésorerie', Vault],
    ['Scale', 'Balance', 'équilibre juridique comparaison', Scale],
    ['DollarSign', 'Dollar', 'argent prix devise', DollarSign],
    ['Euro', 'Euro', 'argent prix devise', Euro],
    ['CircleDollarSign', 'Prix', 'tarif coût argent', CircleDollarSign],
    ['BadgeDollarSign', 'Offre', 'prix promotion tarif', BadgeDollarSign],
    ['Percent', 'Pourcentage', 'taux remise intérêt', Percent],
    ['BadgePercent', 'Remise', 'promotion réduction solde', BadgePercent],
    ['Bitcoin', 'Crypto', 'monnaie numérique', Bitcoin],
    ['ShoppingCart', 'Panier', 'achat commande boutique', ShoppingCart],
    ['ShoppingBag', 'Sac', 'achat boutique shopping', ShoppingBag],
    ['ShoppingBasket', 'Corbeille', 'courses marché achat', ShoppingBasket],
    ['Store', 'Boutique', 'commerce vente magasin', Store],
    ['Ticket', 'Ticket', 'billet événement entrée coupon', Ticket],
  ]),

  g('Données et suivi', [
    ['BarChart3', 'Histogramme', 'statistiques données chiffres', BarChart3],
    ['ChartBar', 'Barres', 'statistiques comparaison', ChartBar],
    ['ChartColumnIncreasing', 'Progression', 'croissance hausse colonnes', ChartColumnIncreasing],
    ['LineChart', 'Courbe', 'évolution tendance suivi', LineChart],
    ['ChartLine', 'Tendance', 'évolution courbe', ChartLine],
    ['ChartNoAxesCombined', 'Analyse', 'tableau de bord indicateurs', ChartNoAxesCombined],
    ['PieChart', 'Camembert', 'répartition part proportion', PieChart],
    ['ChartPie', 'Répartition', 'part secteur proportion', ChartPie],
    ['TrendingUp', 'Croissance', 'progression hausse résultat', TrendingUp],
    ['TrendingDown', 'Baisse', 'diminution réduction coûts', TrendingDown],
    ['ArrowUpRight', 'Hausse', 'progression lien externe', ArrowUpRight],
    ['Activity', 'Activité', 'suivi pouls performance', Activity],
    ['Gauge', 'Jauge', 'performance mesure indicateur', Gauge],
    ['FileBarChart', 'Rapport', 'analyse bilan étude document', FileBarChart],
    ['Kanban', 'Kanban', 'tâches projet organisation', Kanban],
    ['Table', 'Tableau', 'grille données lignes', Table],
    ['Sheet', 'Feuille de calcul', 'tableur données', Sheet],
    ['ListTodo', 'À faire', 'tâches liste checklist', ListTodo],
    ['SlidersHorizontal', 'Réglages fins', 'paramètres ajustement filtre', SlidersHorizontal],
    ['LayoutGrid', 'Grille', 'catalogue organisation vue', LayoutGrid],
    ['Signal', 'Signal', 'indicateur niveau couverture', Signal],
    ['Filter', 'Filtre', 'tri sélection critère', Filter],
    ['Search', 'Recherche', 'trouver explorer analyser', Search],
  ]),

  g('Numérique et technique', [
    ['Cpu', 'Processeur', 'technologie informatique puce', Cpu],
    ['Database', 'Base de données', 'stockage informations', Database],
    ['Server', 'Serveur', 'hébergement informatique', Server],
    ['Wifi', 'Wi-Fi', 'internet connexion réseau', Wifi],
    ['Code', 'Code', 'développement programmation', Code],
    ['CodeXml', 'Balises', 'web html développement', CodeXml],
    ['Terminal', 'Terminal', 'console commande technique', Terminal],
    ['Bot', 'Robot', 'automatisation intelligence artificielle assistant', Bot],
    ['Tablet', 'Tablette', 'appareil mobile écran', Tablet],
    ['Printer', 'Imprimante', 'impression document', Printer],
    ['QrCode', 'QR code', 'scanner lien paiement', QrCode],
    ['ScanLine', 'Scanner', 'numérisation lecture', ScanLine],
    ['Fingerprint', 'Empreinte', 'identité biométrie sécurité', Fingerprint],
    ['Mouse', 'Souris', 'ordinateur clic', Mouse],
    ['Keyboard', 'Clavier', 'saisie bureautique', Keyboard],
    ['HardDrive', 'Disque', 'stockage sauvegarde', HardDrive],
    ['Plug', 'Prise', 'électricité branchement intégration', Plug],
    ['Battery', 'Batterie', 'énergie autonomie charge', Battery],
  ]),

  g('Médias et création', [
    ['Camera', 'Appareil photo', 'photo image prise de vue', Camera],
    ['Images', 'Galerie', 'photos images album', Images],
    ['Film', 'Film', 'vidéo cinéma tournage', Film],
    ['Clapperboard', 'Clap', 'tournage production vidéo', Clapperboard],
    ['MonitorPlay', 'Vidéo en ligne', 'streaming replay cours vidéo', MonitorPlay],
    ['Tv', 'Télévision', 'diffusion émission', Tv],
    ['Projector', 'Projecteur', 'présentation salle diffusion', Projector],
    ['Podcast', 'Podcast', 'audio émission écoute', Podcast],
    ['Mic', 'Micro', 'audio parole interview', Mic],
    ['Radio', 'Radio', 'diffusion émission audio', Radio],
    ['Music', 'Musique', 'audio son', Music],
    ['Speech', 'Prise de parole', 'discours oral communication', Speech],
    ['Palette', 'Palette', 'couleurs design création', Palette],
    ['Brush', 'Pinceau', 'peinture création art', Brush],
    ['Paintbrush', 'Peinture', 'décoration rénovation', Paintbrush],
    ['Wand2', 'Baguette', 'magie automatique astuce', Wand2],
    ['Scissors', 'Ciseaux', 'couture découpe atelier', Scissors],
    ['Ruler', 'Règle', 'mesure précision plan', Ruler],
  ]),

  g('Documents', [
    ['FileText', 'Document', 'texte dossier fichier', FileText],
    ['FileCheck', 'Document validé', 'conforme vérifié approuvé', FileCheck],
    ['FileSpreadsheet', 'Tableur', 'excel budget tableau calcul', FileSpreadsheet],
    ['FileSignature', 'Contrat', 'signature accord engagement', FileSignature],
    ['ClipboardList', 'Liste', 'checklist inventaire relevé', ClipboardList],
    ['ClipboardCheck', 'Liste validée', 'contrôle conformité vérification', ClipboardCheck],
    ['Clipboard', 'Presse-papiers', 'notes formulaire', Clipboard],
    ['PenLine', 'Rédaction', 'écrire modifier signature', PenLine],
    ['Stamp', 'Tampon', 'officiel validation administratif', Stamp],
    ['Gavel', 'Marteau de juge', 'juridique droit légal', Gavel],
    ['Download', 'Téléchargement', 'support fichier obtenir', Download],
    ['Paperclip', 'Pièce jointe', 'attacher fichier', Paperclip],
    ['Folder', 'Dossier', 'classement documents', Folder],
    ['FolderOpen', 'Dossier ouvert', 'documents consultation', FolderOpen],
    ['Archive', 'Archives', 'classement conservation', Archive],
    ['Bookmark', 'Signet', 'favori enregistrer', Bookmark],
    ['Image', 'Image', 'photo visuel illustration', Image],
    ['Newspaper', 'Journal', 'article blog actualité presse', Newspaper],
    ['Quote', 'Citation', 'témoignage avis parole', Quote],
  ]),

  g('Confiance et sécurité', [
    ['ShieldCheck', 'Bouclier validé', 'garantie sécurité confiance', ShieldCheck],
    ['Shield', 'Bouclier', 'protection sécurité', Shield],
    ['ShieldAlert', 'Alerte sécurité', 'risque attention protection', ShieldAlert],
    ['BadgeCheck', 'Certifié', 'officiel vérifié label', BadgeCheck],
    ['BadgeInfo', 'Information', 'renseignement à savoir', BadgeInfo],
    ['BadgeAlert', 'Avertissement', 'attention important', BadgeAlert],
    ['CheckCircle2', 'Validé', 'confirmé réussi coche', CheckCircle2],
    ['CircleX', 'Refusé', 'erreur non annulé croix', CircleX],
    ['Info', 'Info', 'information aide renseignement', Info],
    ['TriangleAlert', 'Attention', 'danger avertissement risque', TriangleAlert],
    ['Ban', 'Interdit', 'stop refus interdiction', Ban],
    ['Siren', 'Urgence', 'alerte priorité', Siren],
    ['Lock', 'Cadenas', 'sécurité privé confidentiel', Lock],
    ['LockOpen', 'Déverrouillé', 'accès ouvert libre', LockOpen],
    ['Key', 'Clé', 'accès autorisation licence', Key],
    ['Eye', 'Œil', 'voir visibilité transparence', Eye],
    ['Heart', 'Cœur', 'satisfaction engagement humain', Heart],
    ['Star', 'Étoile', 'note avis qualité favori', Star],
    ['StarHalf', 'Demi-étoile', 'note évaluation avis', StarHalf],
  ]),

  g('Contact et réseaux', [
    ['Phone', 'Téléphone', 'appel contact numéro', Phone],
    ['PhoneCall', 'Appel', 'téléphone joindre contact', PhoneCall],
    ['Smartphone', 'Mobile', 'téléphone portable sms', Smartphone],
    ['Voicemail', 'Messagerie vocale', 'répondeur message', Voicemail],
    ['Mail', 'E-mail', 'courriel message contact', Mail],
    ['MailOpen', 'E-mail lu', 'courriel ouvert', MailOpen],
    ['AtSign', 'Arobase', 'e-mail adresse identifiant', AtSign],
    // Le mot « whatsapp » est retiré des synonymes de la bulle générique :
    // l'icone de marque existe désormais, et c'est elle que la recherche doit
    // remonter.
    ['MessageCircle', 'Message', 'discussion bulle échange', MessageCircle],
    ['WhatsApp', 'WhatsApp', 'whatsapp discussion contact messagerie', WhatsAppIcon],
    ['MessageSquare', 'Commentaire', 'avis message discussion', MessageSquare],
    ['MessageSquareText', 'Message écrit', 'texte avis retour', MessageSquareText],
    ['MessageCircleQuestion', 'Question', 'aide faq demande', MessageCircleQuestion],
    ['MessagesSquare', 'Échanges', 'conversation forum discussion', MessagesSquare],
    ['Send', 'Envoyer', 'transmettre expédier message', Send],
    ['Megaphone', 'Annonce', 'communication promotion diffusion', Megaphone],
    ['Bell', 'Notification', 'alerte rappel information', Bell],
    ['BellRing', 'Rappel', 'alerte sonnerie notification', BellRing],
    ['Headphones', 'Assistance', 'support écoute accompagnement', Headphones],
    ['Share2', 'Partage', 'diffuser transmettre réseau', Share2],
    ['Link2', 'Lien', 'url adresse renvoi', Link2],
    ['Rss', 'Flux', 'actualités abonnement blog', Rss],
    ['Globe', 'Monde', 'international web en ligne', Globe],
    ['Facebook', 'Facebook', 'réseau social page', Facebook],
    ['Instagram', 'Instagram', 'réseau social photos', Instagram],
    ['Linkedin', 'LinkedIn', 'réseau professionnel', Linkedin],
    ['Twitter', 'X (Twitter)', 'réseau social', Twitter],
    ['Youtube', 'YouTube', 'vidéo chaîne réseau', Youtube],
  ]),

  g('Lieux et transport', [
    ['MapPin', 'Localisation', 'adresse lieu carte', MapPin],
    ['Map', 'Carte', 'plan territoire zone', Map],
    ['Locate', 'Repérage', 'position géolocalisation', Locate],
    ['Navigation', 'Itinéraire', 'direction gps', Navigation],
    ['Building2', 'Bâtiment', 'entreprise bureau siège', Building2],
    ['Building', 'Immeuble', 'bureau ville siège', Building],
    ['House', 'Maison', 'accueil domicile habitat', House],
    ['Factory', 'Usine', 'industrie production transformation', Factory],
    ['Hotel', 'Hôtel', 'hébergement tourisme', Hotel],
    ['Hospital', 'Hôpital', 'santé clinique', Hospital],
    ['Truck', 'Camion', 'transport livraison logistique', Truck],
    ['Car', 'Voiture', 'véhicule déplacement', Car],
    ['Bus', 'Bus', 'transport collectif', Bus],
    ['TrainFront', 'Train', 'transport voyage', TrainFront],
    ['Plane', 'Avion', 'voyage international export', Plane],
    ['Ship', 'Bateau', 'export maritime import', Ship],
    ['Bike', 'Vélo', 'déplacement livraison', Bike],
    ['Footprints', 'Pas', 'étapes démarche progression', Footprints],
    ['Package', 'Colis', 'produit emballage expédition', Package],
    ['Box', 'Carton', 'stock emballage produit', Box],
    ['Boxes', 'Stock', 'inventaire marchandises', Boxes],
    ['Container', 'Conteneur', 'import export fret', Container],
    ['Forklift', 'Chariot élévateur', 'logistique entrepôt manutention', Forklift],
    ['Fuel', 'Carburant', 'énergie station', Fuel],
  ]),

  g('Santé et vie quotidienne', [
    ['Stethoscope', 'Stéthoscope', 'santé médecin diagnostic', Stethoscope],
    ['HeartPulse', 'Pouls', 'santé cardio bien-être', HeartPulse],
    ['Baby', 'Bébé', 'enfance famille', Baby],
    ['Accessibility', 'Accessibilité', 'handicap inclusion', Accessibility],
    ['Dumbbell', 'Haltère', 'sport effort entraînement', Dumbbell],
    ['Volleyball', 'Ballon', 'sport loisir équipe', Volleyball],
    ['Gamepad2', 'Manette', 'jeu ludique loisir', Gamepad2],
    ['Shirt', 'Vêtement', 'textile mode habillement', Shirt],
    ['Sofa', 'Canapé', 'mobilier confort maison', Sofa],
    ['Lamp', 'Lampe', 'éclairage décoration', Lamp],
  ]),

  g('Repères', [
    ['Calendar', 'Calendrier', 'date planning séance', Calendar],
    ['Calendar1', 'Jour J', 'date échéance jour', Calendar1],
    ['CalendarDays', 'Planning', 'agenda mois programme', CalendarDays],
    ['CalendarCheck', 'Date confirmée', 'inscription rendez-vous', CalendarCheck],
    ['CalendarClock', 'Rendez-vous', 'horaire réservation', CalendarClock],
    ['Clock', 'Horloge', 'durée horaire temps', Clock],
    ['AlarmClock', 'Réveil', 'rappel échéance urgence', AlarmClock],
    ['Timer', 'Minuteur', 'durée délai rythme', Timer],
    ['TimerReset', 'Chrono', 'compte à rebours relance', TimerReset],
    ['Hourglass', 'Sablier', 'temps limité attente compte à rebours', Hourglass],
    ['Watch', 'Montre', 'heure ponctualité', Watch],
    ['Flag', 'Drapeau', 'étape jalon objectif', Flag],
    ['Repeat', 'Répétition', 'récurrence cycle abonnement', Repeat],
    ['RefreshCw', 'Actualiser', 'mise à jour renouvellement', RefreshCw],
    ['RotateCcw', 'Retour', 'annuler recommencer remboursement', RotateCcw],
    ['Infinity', 'Infini', 'illimité accès à vie', InfinityIcon],
    ['Zap', 'Éclair', 'rapidité énergie immédiat', Zap],
    ['Sparkle', 'Étincelle', 'nouveau brillant', Sparkle],
    ['Magnet', 'Aimant', 'attirer prospects attraction', Magnet],
    ['Anchor', 'Ancre', 'stabilité ancrage solidité', Anchor],
    ['Gift', 'Cadeau', 'offert bonus promotion', Gift],
    ['Tag', 'Étiquette', 'prix promotion catégorie', Tag],
    ['Inbox', 'Boîte de réception', 'demandes messages reçus', Inbox],
    ['Settings', 'Réglages', 'paramètres configuration', Settings],
    ['LayoutDashboard', 'Tableau de bord', 'accueil vue ensemble', LayoutDashboard],
    ['HelpCircle', 'Aide', 'question faq information', HelpCircle],
    ['Wrench', 'Outil', 'maintenance réglage technique', Wrench],
    ['Hammer', 'Marteau', 'construction bricolage travaux', Hammer],
    ['Construction', 'Travaux', 'chantier en cours construction', Construction],
    ['HardHat', 'Casque', 'chantier btp sécurité', HardHat],
    ['LightbulbOff', 'Ampoule éteinte', 'problème obstacle', LightbulbOff],
    ['ThumbsDown', 'Pouce baissé', 'désaccord négatif', ThumbsDown],
    ['Plus', 'Plus', 'ajout avantage bonus', Plus],
    ['Minus', 'Moins', 'retrait réduction', Minus],
    ['ArrowRight', 'Flèche', 'suite suivant direction', ArrowRight],
    ['ChevronRight', 'Chevron', 'suivant détail', ChevronRight],
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
  images: Images,
  timer: Timer,
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
