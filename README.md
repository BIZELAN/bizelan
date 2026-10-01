# BIZELAN — plateforme web

Site public, espace apprenant et console d'administration pour le cabinet
BIZELAN : vente de formations en ligne et de produits digitaux, présentation des
services, blog, et administration complète permettant de tout modifier sans
écrire une ligne de code.

**Stack :** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS ·
Supabase (PostgreSQL, Auth, Storage) · SasPay (Mobile Money MTN, Moov, Celtiis)
· Resend (e-mails, optionnel) · déploiement Vercel.

---

## 1. Ce que contient le projet

### Partie publique

| Adresse | Contenu |
| --- | --- |
| `/` | Page d'accueil (composée dans l'admin ou générée automatiquement) |
| `/formations`, `/formations/[slug]` | Catalogue et fiche formation (programme, aperçus gratuits, achat) |
| `/boutique`, `/boutique/[slug]` | **Boutique** : e-books, packs vidéo, modèles, audio — filtres par type, extraits offerts |
| `/services`, `/services/[slug]` | Prestations de conseil et demande de devis |
| `/blog`, `/blog/[slug]` | Articles |
| `/contact` | Coordonnées et formulaire |
| `/[slug]` | **Vos pages de vente** composées par blocs dans l'admin (ex. `/bp`) |
| `/commande/[slug]`, `/commande/produit/[slug]` | Tunnel d'achat : Mobile Money, dépôt/virement ou gratuit |
| `/verifier`, `/verifier/[code]` | **Vérification publique** d'un certificat |
| `/connexion`, `/inscription` | Comptes clients |

### Espace apprenant (`/compte`)

- **Tableau de bord** : carte « Reprendre » vers la dernière leçon ouverte,
  indicateurs (leçons terminées, temps de vidéo réellement regardé,
  certificats), formations avec leur prochaine leçon, suggestions.
- **Mes formations** : progression, temps restant, programme par module avec
  repères de questionnaires et de notes.
- **Leçon** : vidéo (reprise de lecture, mesure du temps regardé), notes de
  cours, supports lisibles dans la page, **notes personnelles enregistrées
  automatiquement**, questionnaire, sommaire (latéral ou replié sur mobile).
- **Mes produits** : fichiers achetés, lecture PDF / vidéo / audio en ligne,
  téléchargement par lien signé.
- **Mes certificats** : impression en PDF, lien de vérification à partager.
- Commandes, profil, mot de passe.

### Console d'administration (`/admin`)

- **Tableau de bord** : chiffre d'affaires, ventes, panier moyen et nouveaux
  comptes comparés aux 30 jours précédents, taux d'achèvement, meilleures
  ventes, alertes (dépôts à valider, écarts de montant, produits sans fichier,
  messages non traités, relances).
- **Contenu** : formations (fiche, programme, supports, visionnage,
  questionnaires), **boutique**, services, pages de vente par blocs (avec
  historique et retour arrière), blog, médiathèque.
- **Commerce** : commandes (recherche, validation des dépôts, relance
  WhatsApp), clients (accès formations et produits, note interne, rôle),
  demandes, avis, codes promo (formation, produit ou tout le catalogue),
  **relances** (paiements non aboutis, apprenants inactifs, avis à demander),
  **abonnés newsletter**.
- **Pilotage** : statistiques, **exports CSV** (commandes, clients, abonnés,
  ventes), **journal d'activité**, paramètres du site.

---

## 2. Installation

### Prérequis
- Node.js 20 ou plus
- Un projet Supabase
- Un compte SasPay (clé d'API et secret de webhook)
- Un compte Vercel pour la mise en ligne

### Étape 1 — Récupérer le code

```bash
npm install
cp .env.example .env.local
```

### Étape 2 — Créer la base de données

**Projet Supabase neuf** : ouvrez **SQL Editor**, collez tout le fichier
`supabase/complet.sql` et exécutez-le. Il enchaîne les treize migrations, le
contenu de départ, puis affiche un tableau de vérification (§16) : toutes les
lignes doivent porter « OK », sauf « Administrateur désigné » tant que votre
compte n'existe pas.

**Projet existant** : exécutez seulement les migrations que la base n'a pas
encore reçues, dans l'ordre (`supabase/migrations/00xx_*.sql`). Pour cette
version, c'est `0013_boutique_espace.sql` : boutique, notes personnelles,
reprise de lecture, et fermeture des vues de chiffre d'affaires au public.
Toutes les migrations sont rejouables sans dommage.

> Après toute modification d'une migration, régénérez le fichier d'installation :
> `python scripts/build-complet-sql.py` (il vérifie aussi sa fidélité).

### Étape 3 — Renseigner les variables d'environnement

Dans `.env.local` (et dans Vercel → Settings → Environment Variables) :

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → `service_role` (**secret**) |
| `SASPAY_API_KEY` | SasPay → Developers → API keys (**secret**) |
| `SASPAY_WEBHOOK_SECRET` | SasPay → Webhooks, affiché une seule fois (**secret**) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en local, votre domaine ensuite |

Facultatives : `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL`
(e-mails automatiques) et `BUNNY_STREAM_*` (hébergement vidéo). Sans elles, le
site fonctionne ; les e-mails ne partent simplement pas.

### Étape 4 — Lancer le site

```bash
npm run dev
```

Le site est accessible sur <http://localhost:3000>.

### Étape 5 — Devenir administrateur

1. Créez votre compte sur `/inscription`.
2. Dans Supabase → **SQL Editor**, exécutez la §15 de `complet.sql` avec votre
   adresse, ou directement :

```sql
update public.bz_profiles
   set role = 'admin'
 where lower(email) = lower('votre-email@exemple.com');
```

3. Reconnectez-vous : `/admin` vous est ouvert. Les rôles suivants se
   changent ensuite depuis la fiche d'un client.

---

## 3. Mise en ligne sur Vercel

1. Poussez le code sur un dépôt GitHub, puis importez-le dans Vercel.
2. Recopiez toutes les variables de `.env.local` dans **Settings → Environment
   Variables**, en remplaçant `NEXT_PUBLIC_SITE_URL` par votre domaine réel.
3. Déployez.

### Configurer le webhook SasPay

Dans le tableau de bord SasPay → **Webhooks** :

- **URL** : `https://votre-domaine.com/api/paiement/saspay/webhook`
- **Événements** : `transaction.success` et `transaction.failed`
- Le **secret de signature** affiché à la création va dans `SASPAY_WEBHOOK_SECRET`.

Le webhook est le canal qui fait foi : il ouvre l'accès même si l'acheteur a
fermé son onglet. Le tunnel interroge aussi SasPay pendant que le client valide
sur son téléphone, pour afficher le résultat sans attendre.

### Configurer Supabase pour la production

Supabase → **Authentication → URL Configuration** :
- **Site URL** : `https://votre-domaine.com`
- **Redirect URLs** : ajoutez `https://votre-domaine.com/auth/callback`

---

## 4. Utilisation au quotidien

### Vendre un produit digital
`/admin/produits` → **Nouveau produit** → choisissez le type (e-book, pack vidéo,
modèle…), le prix ou « gratuit », puis enregistrez. Ajoutez ensuite les
fichiers (jusqu'à 2 Go chacun) ; cochez « Extrait offert » pour un échantillon
téléchargeable sans achat. Passez le produit en **Publié** : il apparaît dans
`/boutique`, et l'acheteur reçoit ses fichiers dès le paiement confirmé.

Un produit gratuit sert d'aimant à prospects : il demande seulement la création
d'un compte.

### Créer une page de vente
`/admin/pages` → **Nouvelle page** → adresse (ex. `bp2`), formation liée, puis
les blocs : bannière, problèmes, avant/après, phases, offre et paiement, FAQ,
grille de formations ou **de produits**… Chaque enregistrement conserve la
version précédente : un clic suffit pour y revenir.

### Valider un paiement par dépôt
`/admin/commandes` → filtre **À valider** → ouvrez la commande → vérifiez le
montant reçu → **Valider le paiement et ouvrir l'accès**. Le client reçoit son
e-mail et son accès s'ouvre immédiatement.

### Relancer
`/admin/relances` liste les paiements commencés et non aboutis, les apprenants
sans activité depuis 14 jours et ceux à qui demander un avis. Chaque ligne
ouvre WhatsApp ou votre messagerie avec un message déjà rédigé ; la relance est
notée au journal.

### Offrir un accès
`/admin/clients` → fiche du client → **Offrir l'accès à une formation** ou
**Offrir un produit**.

---

## 5. Sécurité

- **Row Level Security sur toutes les tables.** Un client ne lit que ses
  commandes, accès, progression, achats et notes.
- **Contenu payé jamais public.** Vidéos, supports et fichiers de la boutique
  vivent dans des espaces privés, servis par liens signés de courte durée
  après vérification de l'inscription ou de l'achat. Un plafond de
  téléchargements par fichier peut être fixé pour chaque produit.
- **Paiements vérifiés deux fois.** Le webhook SasPay est authentifié par
  signature HMAC ; l'état est relu auprès de SasPay, et le montant encaissé
  doit couvrir le montant dû — un écart n'ouvre aucun accès et remonte en alerte.
- **Traitement idempotent.** Rejouer un webhook n'ouvre pas deux fois l'accès,
  n'envoie pas deux e-mails et ne compte pas deux fois un code promo.
- **Bonnes réponses et temps de visionnage hors de portée du client** (droits
  par colonne, voir `0011_column_privileges.sql`).
- **Chiffre d'affaires non public** : les vues de ventes ne sont lisibles
  qu'avec la clé de service (`0013`).
- **Aucun HTML utilisateur interprété**, y compris dans les e-mails envoyés à
  l'administration.
- **La clé `service_role` reste côté serveur**, et un utilisateur ne peut pas
  s'auto-promouvoir administrateur (`bz_guard_profile_role`).

---

## 6. Structure du code

```
supabase/
  migrations/     13 migrations, rejouables
  seed.sql        Contenu de départ
  complet.sql     Installation complète (générée)

scripts/          Vérifications : contraste, icônes, vidéo, SasPay, droits…

src/
  app/
    (public)/     Site public : accueil, formations, boutique, services,
                  blog, contact, commande, vérification de certificat
    [slug]/       Pages de vente composées dans l'admin
    compte/       Espace apprenant
    admin/        Console d'administration
    api/          Webhook SasPay, dépôts signés, fichiers protégés, exports CSV
    actions/      Server Actions (auth, admin, boutique, commande, apprentissage, QCM)
  components/
    ui/           Composants de base
    public/       En-tête, pied, cartes, moteur de blocs
    account/      Lecteur de leçon, notes, fichiers sécurisés, cartes
    admin/        Coquille, éditeurs, formulaires, relances
    checkout/     Tunnel d'achat commun formations/produits
  lib/
    orders.ts     Offres vendables, codes promo, livraison des commandes
    learner.ts    Données du tableau de bord apprenant
    products.ts   Types de produits
    saspay.ts     Paiement, vérification, signature des webhooks
    blocks.ts     Définition des blocs de page
```

---

## 7. Commandes

```bash
npm run dev        # développement
npm run build      # compilation de production
npm run start      # servir la version compilée
npm run lint       # vérification du code
npm run typecheck  # vérification des types
```

Voir `scripts/README.md` pour les suites de vérification.

---

## 8. Points d'attention

- **Montants en FCFA sans décimales.** `14999` signifie 14 999 FCFA.
- **Adresses réservées.** Une page de vente ne peut pas utiliser `formations`,
  `boutique`, `verifier`, `compte`, `admin`, etc. L'admin le signale.
- **Confirmation d'e-mail.** Par défaut Supabase demande une confirmation à
  l'inscription. Pour un accès immédiat après paiement, désactivez-la dans
  Authentication → Providers → Email → *Confirm email*.
- **Vidéos YouTube.** Utilisez « non répertorié » plutôt que « privé ». Le
  temps de visionnage ne se mesure que sur les vidéos téléversées ou en lien
  MP4 direct.
