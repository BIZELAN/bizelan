# BIZELAN — plateforme web

Site public + back-office éditorial pour le cabinet BIZELAN : vente de formations
en ligne, présentation des services, blog, et administration complète permettant
de tout modifier sans écrire une ligne de code.

**Stack :** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase
(PostgreSQL, Auth, Storage) · KkiaPay (Mobile Money Bénin) · déploiement Vercel.

---

## 1. Ce que contient le projet

### Partie publique
| Adresse | Contenu |
| --- | --- |
| `/` | Page d'accueil (composée dans l'admin ou générée automatiquement) |
| `/formations` | Catalogue des formations |
| `/formations/[slug]` | Fiche détaillée + programme + achat |
| `/services` | Prestations de conseil |
| `/services/[slug]` | Détail d'une prestation + demande de devis |
| `/blog`, `/blog/[slug]` | Articles |
| `/contact` | Coordonnées + formulaire |
| `/[slug]` | **Vos landing pages** créées dans l'admin (ex. `/bp`) |
| `/commande/[slug]` | Tunnel de paiement |
| `/connexion`, `/inscription` | Comptes clients |

### Espace membre (`/compte`)
Formations achetées, lecteur vidéo avec suivi de progression, supports
téléchargeables protégés, certificat de fin de parcours, historique de commandes,
profil et mot de passe.

### Back-office (`/admin`)
Tableau de bord (revenus, alertes), formations (fiche, programme modules/leçons,
supports), services, **éditeur de landing pages par blocs**, blog, commandes
(avec validation manuelle des dépôts), clients et gestion des accès, demandes de
devis, avis, codes promo, statistiques, paramètres du site.

---

## 2. Installation

### Prérequis
- Node.js 20 ou plus
- Un projet Supabase
- Un compte KkiaPay
- Un compte Vercel (pour la mise en ligne)

### Étape 1 — Récupérer le code

```bash
npm install
cp .env.example .env.local
```

### Étape 2 — Créer la base de données

Dans le tableau de bord Supabase, ouvrez **SQL Editor** et exécutez dans cet
ordre les fichiers du dossier `supabase/` :

1. `migrations/0001_schema.sql` — tables, types, déclencheurs, vues
2. `migrations/0002_rls.sql` — sécurité par ligne (qui voit quoi)
3. `migrations/0003_storage.sql` — espaces de stockage des fichiers
4. `seed.sql` — contenu de départ (formation Plan d'Affaires Agricole, page
   de vente `/bp`, services, paramètres du cabinet)

> Le fichier `seed.sql` est optionnel mais recommandé : il reproduit votre page
> Systeme.io actuelle sous forme de blocs modifiables.

### Étape 3 — Renseigner les variables d'environnement

Dans `.env.local` :

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → `service_role` (**secret**) |
| `NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY` | KkiaPay → Paramètres → API keys |
| `KKIAPAY_PRIVATE_KEY` | idem (**secret**) |
| `KKIAPAY_SECRET` | idem (**secret**) |
| `NEXT_PUBLIC_KKIAPAY_SANDBOX` | `true` pour tester, `false` en production |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en local, votre domaine ensuite |

Variables facultatives : `RESEND_API_KEY` (e-mails automatiques),
`BUNNY_STREAM_*` (hébergement vidéo). Sans elles, le site fonctionne —
les e-mails ne sont simplement pas envoyés.

### Étape 4 — Lancer le site

```bash
npm run dev
```

Le site est accessible sur http://localhost:3000

### Étape 5 — Créer votre compte administrateur

1. Allez sur `/inscription` et créez votre compte avec votre e-mail habituel.
2. Dans Supabase → **SQL Editor**, exécutez :

```sql
update public.profiles
   set role = 'admin'
 where email = 'votre-email@exemple.com';
```

3. Reconnectez-vous : `/admin` vous est désormais accessible.

---

## 3. Mise en ligne sur Vercel

1. Poussez le code sur un dépôt GitHub.
2. Sur Vercel : **New Project** → importez le dépôt.
3. Dans **Settings → Environment Variables**, recopiez toutes les variables de
   `.env.local`, en remplaçant `NEXT_PUBLIC_SITE_URL` par votre domaine réel.
4. Déployez.

### Configurer le webhook KkiaPay

Dans le tableau de bord KkiaPay → **Webhook** :

- **URL** : `https://votre-domaine.com/api/paiement/kkiapay/webhook`
- **Secret de hachage** : exactement la même valeur que `KKIAPAY_SECRET`
- **Événements** : `transaction.success` et `transaction.failed`

Vérification : ouvrez cette URL dans un navigateur, elle doit répondre
`{"status":"ok"}`.

### Configurer Supabase pour la production

Dans Supabase → **Authentication → URL Configuration** :
- **Site URL** : `https://votre-domaine.com`
- **Redirect URLs** : ajoutez `https://votre-domaine.com/auth/callback`

---

## 4. Utilisation au quotidien

### Créer une nouvelle page de vente
`/admin/pages` → **Nouvelle page** → choisissez l'adresse (ex. `bp2`), reliez la
formation concernée, puis ajoutez les blocs : bannière, problèmes du client,
avant/après, phases, offre et paiement, FAQ… Le bloc **Offre et paiement**
récupère automatiquement le prix de la formation liée et le bon bouton d'achat.

Cochez « Masquer le menu de navigation » pour une page de vente concentrée sur
l'offre, comme sur Systeme.io.

### Ajouter une formation
`/admin/formations` → **Nouvelle formation** → remplissez la fiche → puis
**Programme** pour créer les modules et leçons, et **Supports** pour téléverser
les tableurs Excel et modèles Word.

Pour les vidéos : collez l'identifiant YouTube (vidéo *non répertoriée*), ou
l'identifiant Bunny Stream si vous utilisez cet hébergeur.

### Valider un paiement reçu par dépôt manuel
`/admin/commandes` → filtre **À valider** → ouvrez la commande → vérifiez le
montant reçu → **Valider le paiement et ouvrir l'accès**. Le client reçoit
automatiquement son e-mail et son accès s'ouvre immédiatement.

### Offrir un accès
`/admin/clients` → ouvrez la fiche du client → **Offrir l'accès à une formation**.

---

## 5. Sécurité

- **Row Level Security activée sur toutes les tables.** Un client ne peut lire
  que ses propres commandes, accès et progression.
- **Les vidéos et fichiers ne sont jamais publics.** Les supports sont servis par
  liens signés valables 5 minutes, générés uniquement après vérification de
  l'inscription : un lien partagé cesse rapidement de fonctionner.
- **Double vérification des paiements.** Le webhook KkiaPay est authentifié par
  son secret, puis chaque transaction est re-vérifiée auprès de l'API KkiaPay
  avant l'ouverture d'un accès. Le montant payé est comparé au montant dû.
- **Traitement idempotent.** Rejouer un webhook n'ouvre pas deux fois l'accès et
  n'envoie pas deux e-mails.
- **Aucun HTML utilisateur n'est interprété.** Le rendu markdown échappe
  systématiquement le contenu avant transformation.
- **La clé `service_role` reste côté serveur.** Elle n'est jamais exposée au
  navigateur.
- **Un utilisateur ne peut pas s'auto-promouvoir administrateur** (déclencheur
  `guard_profile_role` en base).

---

## 6. Structure du code

```
supabase/
  migrations/     Schéma SQL, sécurité, stockage
  seed.sql        Contenu de départ

src/
  app/
    (public)/     Site public (accueil, formations, services, blog, contact)
    [slug]/       Landing pages créées dans l'admin
    compte/       Espace membre
    admin/        Back-office
    api/          Webhook KkiaPay, téléversements, téléchargements protégés
    actions/      Server Actions (auth, admin, commande, progression)
  components/
    ui/           Composants de base (boutons, champs, cartes…)
    public/       En-tête, pied de page, cartes, moteur de blocs
    account/      Lecteur de leçon, liste de supports
    admin/        Éditeur de blocs, formulaires, tableaux
    auth/         Formulaires de connexion et d'inscription
  lib/
    supabase/     Clients navigateur, serveur et service_role
    blocks.ts     Définition des blocs de page (ajoutez les vôtres ici)
    kkiapay.ts    Vérification des transactions et des webhooks
    orders.ts     Logique des commandes et ouverture des accès
    queries.ts    Lectures de données
    markdown.ts   Rendu markdown sécurisé
```

### Ajouter un nouveau type de bloc

1. Ajoutez son type dans `BlockType` et sa définition dans `BLOCK_DEFS`
   (`src/lib/blocks.ts`) : champs, libellés, valeurs par défaut.
2. Ajoutez son rendu dans `src/components/public/blocks/block-renderer.tsx`.

L'éditeur de l'admin construit automatiquement son formulaire à partir de la
définition — il n'y a rien d'autre à faire.

---

## 7. Commandes

```bash
npm run dev        # développement
npm run build      # compilation de production
npm run start      # servir la version compilée
npm run lint       # vérification du code
npm run typecheck  # vérification des types
```

---

## 8. Points d'attention

- **Montants en FCFA sans décimales.** `14999` signifie 14 999 FCFA.
- **Adresses réservées.** Une landing page ne peut pas utiliser les adresses
  `formations`, `services`, `blog`, `contact`, `compte`, `admin`, etc. L'admin
  refuse ces valeurs avec un message explicite.
- **Confirmation d'e-mail.** Par défaut Supabase demande une confirmation par
  e-mail à l'inscription. Pour un accès immédiat après paiement, désactivez-la
  dans Supabase → Authentication → Providers → Email → *Confirm email*.
- **Vidéos YouTube.** Utilisez le mode « non répertorié » plutôt que « privé » :
  les vidéos privées ne s'affichent pas dans un lecteur intégré.
