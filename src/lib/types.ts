/**
 * Types du domaine Bizelan.
 * Ils reflètent le schéma défini dans `supabase/migrations/0001_schema.sql`.
 */

export type UserRole = 'client' | 'editor' | 'admin'
export type ContentStatus = 'draft' | 'published' | 'archived'
export type PricingMode = 'fixed' | 'quote' | 'free'
export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
/** `kkiapay` subsiste pour l'historique : les ventes passent par Chariow. */
export type PaymentMethod = 'chariow' | 'kkiapay' | 'bank_transfer' | 'manual' | 'free'
export type ItemType = 'course' | 'service'
export type EnrollmentState = 'active' | 'revoked' | 'completed'
export type QuoteStatus = 'new' | 'in_progress' | 'won' | 'lost'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'
export type VideoProvider = 'bunny' | 'youtube' | 'vimeo' | 'url'
export type DiscountType = 'percent' | 'amount'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole
  city: string | null
  activity: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  kind: 'course' | 'post' | 'service'
  description: string | null
  position: number
  created_at: string
}

export interface FaqItem {
  question: string
  answer: string
}

export interface Course {
  id: string
  slug: string
  title: string
  subtitle: string | null
  summary: string | null
  description: string | null
  cover_url: string | null
  promo_video_url: string | null
  category_id: string | null
  price_cents: number
  compare_at_price_cents: number | null
  currency: string
  pricing: PricingMode
  level: string | null
  duration_label: string | null
  format_label: string | null
  access_label: string | null
  what_you_get: string[]
  outcomes: string[]
  target_audience: string[]
  prerequisites: string[]
  faq: FaqItem[]
  status: ContentStatus
  featured: boolean
  position: number

  /**
   * Part de chaque leçon à visionner pour que le certificat soit délivré.
   * 0 désactive l'exigence, ce qui est le comportement historique.
   */
  min_watch_ratio: number
  /** Exiger en plus la réussite des QCM actifs du parcours. */
  require_quiz_pass: boolean

  /**
   * Produit Chariow correspondant (`prd_…`).
   *
   * Obligatoire pour vendre : l'API de paiement encaisse le prix du produit
   * CHARIOW, pas celui stocké ici. Les deux doivent donc rester cohérents —
   * `price_cents` sert à l'affichage, Chariow fait foi à l'encaissement.
   */
  chariow_product_id: string | null
  seo_title: string | null
  seo_description: string | null
  og_image_url: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface CourseModule {
  id: string
  course_id: string
  title: string
  subtitle: string | null
  description: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  slug: string
  description: string | null
  content: string | null
  video_provider: VideoProvider | null
  video_id: string | null
  video_url: string | null
  duration_seconds: number
  is_preview: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface Resource {
  id: string
  course_id: string | null
  lesson_id: string | null
  title: string
  description: string | null
  storage_path: string
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  position: number
  created_at: string
}

export interface ProcessStep {
  title: string
  description: string
}

export interface Service {
  id: string
  slug: string
  title: string
  subtitle: string | null
  summary: string | null
  description: string | null
  cover_url: string | null
  icon: string | null
  pricing: PricingMode
  price_cents: number | null
  price_label: string | null
  currency: string
  features: string[]
  process_steps: ProcessStep[]
  deliverables: string[]
  faq: FaqItem[]
  status: ContentStatus
  featured: boolean
  position: number
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface Page {
  id: string
  slug: string
  title: string
  description: string | null
  blocks: unknown[]
  status: ContentStatus
  is_home: boolean
  hide_header: boolean
  hide_footer: boolean
  course_id: string | null
  service_id: string | null
  seo_title: string | null
  seo_description: string | null
  og_image_url: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string | null
  cover_url: string | null
  category_id: string | null
  author_id: string | null
  status: ContentStatus
  featured: boolean
  reading_minutes: number
  views: number
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  max_redemptions: number | null
  redemptions: number
  course_id: string | null
  starts_at: string | null
  ends_at: string | null
  active: boolean
  created_at: string
}

export interface Order {
  id: string
  reference: string
  user_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  currency: string
  coupon_id: string | null
  coupon_code: string | null
  status: OrderStatus
  payment_method: PaymentMethod
  /** Vente Chariow (`SALE…`) — sert de clé de corrélation avec le webhook. */
  chariow_sale_id: string | null
  /** Historique : transactions encaissées avant le passage à Chariow. */
  kkiapay_transaction_id: string | null
  payment_reference: string | null
  payment_proof_path: string | null
  admin_note: string | null
  validated_by: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  item_type: ItemType
  course_id: string | null
  service_id: string | null
  title_snapshot: string
  unit_price_cents: number
  quantity: number
  created_at: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  order_id: string | null
  state: EnrollmentState
  source: string
  progress_percent: number
  certificate_code: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  course_id: string
  completed: boolean
  /** Position de la tête de lecture — sert à reprendre là où on s'est arrêté. */
  last_position_seconds: number
  /**
   * Temps de lecture cumulé. À ne pas confondre avec la position : elle bondit
   * quand on fait glisser la barre, celui-ci non. Écrit uniquement par
   * `bz_record_watch_time`, jamais par le client.
   */
  watched_seconds: number
  completed_at: string | null
  updated_at: string
}

export interface Review {
  id: string
  course_id: string | null
  user_id: string | null
  author_name: string
  author_role: string | null
  rating: number
  comment: string | null
  status: ReviewStatus
  featured: boolean
  created_at: string
}

export interface QuoteRequest {
  id: string
  service_id: string | null
  name: string
  email: string
  phone: string | null
  company: string | null
  budget: string | null
  message: string | null
  status: QuoteStatus
  admin_note: string | null
  created_at: string
  updated_at: string
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  handled: boolean
  created_at: string
}

export interface MediaItem {
  id: string
  bucket: string
  storage_path: string
  public_url: string | null
  file_name: string
  mime_type: string | null
  file_size: number | null
  width: number | null
  height: number | null
  alt: string | null
  uploaded_by: string | null
  created_at: string
}

export interface OpeningHour {
  label: string
  value: string
}

export interface SiteSettings {
  id: number
  site_name: string

  /**
   * Apparence choisie dans l'administration : couleurs de marque, dégradé,
   * rayon. Les jetons dérivés (texte lisible, survol, voile) ne sont PAS
   * stockés — ils sont recalculés à l'affichage, avec une mesure de contraste.
   */
  theme: Record<string, unknown>
  /** Menu principal. Remplace un tableau autrefois codé en dur. */
  nav_links: NavLink[]
  footer_columns: FooterColumn[]
  legal_links: NavLink[]
  tagline: string | null
  logo_url: string | null
  favicon_url: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  map_embed_url: string | null
  opening_hours: OpeningHour[]
  social_links: Record<string, string>
  bank_transfer_instructions: string | null
  legal_notice: string | null
  terms: string | null
  privacy_policy: string | null
  /** Paiement en ligne (Chariow). Anciennement `payments_kkiapay_enabled`. */
  payments_online_enabled: boolean
  payments_transfer_enabled: boolean
  announcement: string | null
  announcement_active: boolean
  default_seo_title: string | null
  default_seo_description: string | null
  updated_at: string
}

/* --- Formes composées utilisées par les pages ---------------------------- */

export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress | null
  resources?: Resource[]
}

export interface ModuleWithLessons extends CourseModule {
  lessons: LessonWithProgress[]
}

export interface CourseWithCurriculum extends Course {
  modules: ModuleWithLessons[]
  resources?: Resource[]
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
  profile?: Pick<Profile, 'id' | 'full_name' | 'email'> | null
}

/* ------------------------------------------------------------------ */
/* Questionnaires à choix multiples                                    */
/* ------------------------------------------------------------------ */

export interface Quiz {
  id: string
  lesson_id: string
  title: string
  intro: string | null
  is_active: boolean
  pass_percent: number
  /** 0 = illimité. */
  max_attempts: number
  created_at: string
  updated_at: string
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  prompt: string
  /** Affichée après correction seulement. */
  explanation: string | null
  position: number
  created_at: string
}

/**
 * `is_correct` est volontairement ABSENT de ce type.
 *
 * Le droit de lecture sur cette colonne a été retiré au rôle `authenticated`.
 * La laisser ici inviterait à l'y chercher, puis à écrire un jour une
 * correction côté client — qui rendrait le questionnaire décoratif. La
 * notation passe par `bz_grade_quiz`, seule voie qui lise les bonnes réponses.
 */
export interface QuizChoice {
  id: string
  question_id: string
  label: string
  position: number
}

/** Vue d'administration : `is_correct` n'est lisible que par ce rôle. */
export interface QuizChoiceAdmin extends QuizChoice {
  is_correct: boolean
}

export interface QuizAttempt {
  id: string
  user_id: string
  quiz_id: string
  course_id: string
  score_percent: number
  passed: boolean
  answers: Record<string, string[]>
  created_at: string
}

/** Retour de `bz_grade_quiz`. */
export interface QuizResult {
  score_percent: number
  pass_percent: number
  passed: boolean
  total: number
  correct: number
  detail: {
    question_id: string
    correct: boolean
    expected: string[]
    explanation: string | null
  }[]
}

/** Ligne de `bz_learner_watch_stats` — lue côté serveur uniquement. */
export interface LearnerWatchStats {
  user_id: string
  course_id: string
  full_name: string | null
  email: string
  course_title: string
  min_watch_ratio: number
  progress_percent: number
  certificate_code: string | null
  lessons_total: number
  lessons_completed: number
  watched_seconds: number
  duration_seconds: number
  /** Leçons cochées sans avoir été visionnées à hauteur du seuil. */
  lessons_skipped: number
}

export interface NavLink {
  label: string
  href: string
}

export interface FooterColumn {
  title: string
  links: NavLink[]
}
