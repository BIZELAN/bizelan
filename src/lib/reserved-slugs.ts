/**
 * Adresses de premier niveau prises par les routes fixes du site.
 *
 * Une page composée dans l'administration vit à `/<slug>` : lui donner l'une
 * de ces adresses la rendrait inaccessible, masquée par la route fixe. La
 * liste vivait en dur dans l'action d'enregistrement et n'avait pas suivi les
 * nouvelles routes ; elle est désormais partagée.
 */
export const RESERVED_PAGE_SLUGS = [
  'formations',
  'services',
  'blog',
  'contact',
  'compte',
  'admin',
  'commande',
  'connexion',
  'inscription',
  'api',
  'auth',
  'mentions-legales',
  'confidentialite',
  'conditions',
  'mot-de-passe-oublie',
  'boutique',
  'verifier',
  'robots.txt',
  'sitemap.xml',
]
