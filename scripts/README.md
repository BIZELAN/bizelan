# Contrôles

Huit suites, sans cadre de test : ce sont des scripts qu'on lance et qui
sortent 0 ou 1. Elles tiennent en une commande chacune, ce qui est la
condition pour qu'on les relance vraiment.

```bash
# Design — ne touchent pas à la base
python scripts/check-contrast.py          # 120 paires sur quatre palettes
npx tailwindcss -i src/app/globals.css -o .tmp/full.css
python scripts/check-dead-classes.py .tmp/full.css

# Logique pure
node scripts/test-theme-tokens.mjs        # palette dérivée, 85 cas
node scripts/test-icons.mjs               # bibliothèque d'icônes, 33 cas
node scripts/test-map-embed.mjs           # URL de carte, 16 cas
node scripts/test-saspay.mjs              # signature de webhook, 31 cas

# Sécurité — écrivent dans la VRAIE base, puis nettoient
node scripts/test-privileges.mjs          # ce qu'un apprenant ne doit pas voir
node scripts/test-isolation.mjs           # ce qu'un client ne doit pas atteindre
```

## Les deux dernières méritent une explication

Elles créent de vrais comptes, de vraies inscriptions, un vrai fichier dans le
bucket privé — puis effacent tout dans un `finally`, y compris si un contrôle
échoue en route. Les comptes portent un préfixe `zz-sonde-` et une adresse en
`@bizelan.invalid`, domaine réservé qui ne peut appartenir à personne.

Elles existent parce que les contrôles précédents se faisaient en **anonyme**,
c'est-à-dire du côté facile : un visiteur non connecté est bloqué partout.
Deux protections annoncées comme acquises se sont révélées inexistantes le
jour où un test s'est enfin mis à la place d'un apprenant *authentifié* —
lecture des bonnes réponses de QCM, et écriture de son propre temps de
visionnage. Voir `supabase/migrations/0011_column_privileges.sql`.

## Le piège qu'elles évitent

Un test de sécurité passe facilement pour la mauvaise raison. « B ne voit
aucun support » est vrai quand il n'existe aucun support ; « le fichier est
refusé » est vrai quand le fichier n'existe pas. Les deux suites créent donc
d'abord la donnée, et vérifient qu'elle est bien là — c'est ce que contrôlent
les lignes « A, inscrit, voit le support » et « le fichier existe bel et
bien ». Sans elles, tout le reste serait décoratif.

## Quand les relancer

`test-privileges` et `test-isolation` après **toute migration touchant aux
droits ou aux politiques RLS**. Supabase ré-accorde parfois des privilèges de
table lors d'opérations d'administration, et un privilège rendu referme
silencieusement la correction de 0011.

### `test-uploads.mjs`

    node scripts/test-uploads.mjs

Assainissement du chemin de dépôt et classement des documents. 29 cas.

Le nom de fichier est choisi par l'utilisateur dans son navigateur : les cas
hostiles (`../../etc/passwd.pdf`, barres inversées, encodage pourcent, nom de
300 caractères) doivent tous atterrir dans `AAAA/horodatage-nom.ext`, sans
jamais sortir du dossier. Vérifie aussi qu'aucun format autre que le PDF n'est
annoncé lisible dans la page — un cadre vide vaut moins qu'un bouton
« Télécharger ».

### `test-video.mjs`

    node scripts/test-video.mjs

Résolution des vidéos et concordance avec la base. 95 cas.

Couvre l'aiguillage qui a remplacé quatre implémentations divergentes (page de
leçon, bloc « Vidéo », contenu riche, lecteur public), les URI `storage://`
hostiles, et les URL complètes collées dans le champ « identifiant » — le cas
qui cassait la seule vidéo en ligne du catalogue.

Le groupe « formes réelles de lien YouTube » compte vingt-deux écritures d'une
même vidéo, qui doivent toutes donner la même adresse d'intégration. Trois ne
le faisaient pas — `?app=desktop&v=`, `?feature=shared&v=`, `?list=…&v=` —
parce que l'ancienne expression régulière exigeait que `v` soit le premier
paramètre. Ce sont les liens que donnent l'application, le bouton « Partager »
et une playlist, donc les plus courants.

Le dernier groupe compare les listes d'extensions de `src/lib/video.ts` et de
`public.bz_lesson_is_measurable` (migration 0010). C'est la même question posée
des deux côtés — « ce visionnage est-il mesurable ? » — et deux réponses
divergentes retiendraient un certificat sans message.

### `build-complet-sql.py`

    python scripts/build-complet-sql.py

Assemble `supabase/complet.sql` — l'installation complète sur un projet
Supabase neuf — puis le vérifie. 42 contrôles.

Réunit les onze migrations, le contenu de départ et deux sections écrites à la
main (promotion de l'administrateur, vérification post-installation). À relancer
après toute modification dans `supabase/migrations/`, sans quoi le projet neuf
et le projet existant divergent — et l'écart ne se découvre qu'en production.

Le script prouve que chaque section est **identique** à sa migration d'origine.
Seule exception : six instructions de 0004 qui ne font rien (un `revoke` de
colonne ne peut pas retirer un privilège accordé au niveau de la table) et que
la section 11 corrige. Elles sont commentées plutôt que recopiées, car une
instruction inopérante qui ressemble à une protection est un piège — c'est
exactement ce qui a laissé deux failles ouvertes pendant des semaines ici.

Ce script ne peut PAS exécuter le SQL : ni Postgres ni Docker ne sont
disponibles dans cet environnement. La section 14 du fichier généré prend le
relais à l'exécution et dit, sur le projet réel, si les protections tiennent.
