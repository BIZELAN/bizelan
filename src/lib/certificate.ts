/**
 * Modèle du certificat, réglé dans l'administration (Certificats).
 *
 * Stocké en JSON dans `site_settings.certificate` : un objet vide donne un
 * certificat complet et présentable, sans aucun réglage. Chaque champ ne fait
 * qu'ajuster ce modèle par défaut.
 */

export type CertificateStyle = 'classique' | 'moderne' | 'prestige'

export interface CertificateTemplate {
  style: CertificateStyle
  /** Grand titre : « Certificat de réussite ». */
  title: string
  /** Sous-titre : « Formation professionnelle ». */
  subtitle: string
  /** Avant le nom : « Ce certificat est fièrement décerné à ». */
  intro: string
  /** Avant le titre de la formation : « pour avoir suivi avec succès la formation ». */
  body: string
  /** Mention libre sous la formation (accréditation, nombre d'heures…). */
  mention: string
  /** Organisme émetteur ; vide = nom du site. */
  issuerName: string
  /** Logo ; vide = logo du site. */
  logoUrl: string
  signerName: string
  signerTitle: string
  signatureUrl: string
  secondSignerName: string
  secondSignerTitle: string
  secondSignatureUrl: string
  /** Couleur principale (bordure, titres, sceau). */
  accentColor: string
  /** Couleur secondaire (filets, détails). */
  secondaryColor: string
  /** Texte du sceau. */
  sealText: string
  showDuration: boolean
  showVerification: boolean
}

export const DEFAULT_CERTIFICATE: CertificateTemplate = {
  style: 'classique',
  title: 'Certificat de réussite',
  subtitle: 'Formation professionnelle',
  intro: 'Ce certificat est fièrement décerné à',
  body: 'pour avoir suivi avec succès l’intégralité de la formation',
  mention: '',
  issuerName: '',
  logoUrl: '',
  signerName: '',
  signerTitle: 'Directeur',
  signatureUrl: '',
  secondSignerName: '',
  secondSignerTitle: '',
  secondSignatureUrl: '',
  accentColor: '#1c5d46',
  secondaryColor: '#c9a227',
  sealText: 'Certifié',
  showDuration: true,
  showVerification: true,
}

const HEX = /^#[0-9a-f]{6}$/i
const STYLES: CertificateStyle[] = ['classique', 'moderne', 'prestige']

/** Lit le JSON stocké en base, en complétant et en validant chaque champ. */
export function parseCertificateTemplate(raw: unknown): CertificateTemplate {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const text = (key: keyof CertificateTemplate, max = 200) => {
    const value = src[key]
    return typeof value === 'string' ? value.trim().slice(0, max) : (DEFAULT_CERTIFICATE[key] as string)
  }
  const color = (key: 'accentColor' | 'secondaryColor') =>
    typeof src[key] === 'string' && HEX.test(src[key] as string) ? (src[key] as string) : DEFAULT_CERTIFICATE[key]
  const bool = (key: 'showDuration' | 'showVerification') =>
    typeof src[key] === 'boolean' ? (src[key] as boolean) : DEFAULT_CERTIFICATE[key]
  const url = (key: 'logoUrl' | 'signatureUrl' | 'secondSignatureUrl') => {
    const value = typeof src[key] === 'string' ? (src[key] as string).trim() : ''
    return /^https?:\/\//.test(value) ? value.slice(0, 1000) : ''
  }

  return {
    style: STYLES.includes(src.style as CertificateStyle) ? (src.style as CertificateStyle) : DEFAULT_CERTIFICATE.style,
    title: text('title', 80) || DEFAULT_CERTIFICATE.title,
    subtitle: text('subtitle', 80),
    intro: text('intro', 120) || DEFAULT_CERTIFICATE.intro,
    body: text('body', 160) || DEFAULT_CERTIFICATE.body,
    mention: text('mention', 240),
    issuerName: text('issuerName', 80),
    logoUrl: url('logoUrl'),
    signerName: text('signerName', 80),
    signerTitle: text('signerTitle', 80),
    signatureUrl: url('signatureUrl'),
    secondSignerName: text('secondSignerName', 80),
    secondSignerTitle: text('secondSignerTitle', 80),
    secondSignatureUrl: url('secondSignatureUrl'),
    accentColor: color('accentColor'),
    secondaryColor: color('secondaryColor'),
    sealText: text('sealText', 24),
    showDuration: bool('showDuration'),
    showVerification: bool('showVerification'),
  }
}

/** Données propres à UN certificat délivré. */
export interface CertificateData {
  recipientName: string
  courseTitle: string
  issuedAt: string | null
  code: string
  durationLabel?: string | null
  verifyUrl: string
}

/** Motifs de refus de `bz_request_certificate`, en clair. */
export const CERTIFICATE_REFUSALS: Record<string, string> = {
  auth: 'Connectez-vous pour demander votre certificat.',
  name: 'Indiquez votre nom complet tel qu’il doit figurer sur le certificat (3 caractères au moins).',
  not_certifying: 'Cette formation ne délivre pas de certificat.',
  not_enrolled: 'Vous n’êtes pas inscrit à cette formation.',
  progress: 'Terminez toutes les leçons de la formation pour obtenir votre certificat.',
  conditions:
    'Il reste une condition à remplir : le temps de visionnage minimum des vidéos, ou la réussite des questionnaires.',
}
