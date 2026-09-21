# Audit de l'interface d'administration

> Relevé effectué sur le dépôt à l'état `bb10390`. Chaque constat est daté d'une
> ligne de code vérifiable. Une grande partie de ce qui suit provient de la
> refonte sombre livrée précédemment : les défauts sont les miens, ils sont
> décrits sans ménagement.

## 1. Pile technique constatée

| Élément | État |
|---|---|
| Framework | Next.js 15.5.25, App Router, React 19 |
| CSS | Tailwind 3.4, configuration maison — **pas de plugin typographie ni forms** |
| Bibliothèque de composants | **aucune** — ni shadcn/ui, ni Radix, ni Headless UI |
| Utilitaires | `clsx` + `tailwind-merge` (via `cn()`), `lucide-react` |
| Animation | **aucune** — ni `motion`, ni `framer-motion` |
| Variantes | **aucune** — pas de `cva`, les variantes sont des objets `Record<>` écrits à la main |
| Pages admin | 25 | 
| Composants admin | 24 fichiers |

**Conséquence sur le brief :** les étapes 3 et 4 supposent d'ajouter des
dépendances. Il n'existe aucune primitive accessible (menu, dialogue, onglets,
infobulle) sur laquelle s'appuyer : tout est construit à la main, y compris la
gestion du focus et des touches.

## 2. Le défaut de disposition — cause exacte

Vous l'avez décrit comme « la sidebar scrolle avec le body ». C'est exact, et la
cause tient en trois lignes.

**`src/components/admin/admin-chrome.tsx:56`**
```tsx
<div className="flex min-h-screen bg-surface-950">
```
`min-h-screen` fixe une hauteur **minimale**. Le conteneur grandit donc avec son
contenu : sur une page longue il mesure 3 000 px, et c'est le document entier qui
défile. Il aurait fallu une hauteur **fixe** (`h-dvh`) doublée d'un
`overflow-hidden`, pour que le débordement soit confié aux enfants.

**`src/components/admin/admin-chrome.tsx:57`** — l'`<aside>` n'est ni `fixed`,
ni `sticky`, ni borné en hauteur. C'est un simple enfant flex : il suit le flux
du document et défile avec lui.

**`src/components/admin/admin-nav.tsx:27`**
```tsx
<nav className="flex-1 overflow-y-auto px-3 py-4">
```
Ce `overflow-y-auto` **ne se déclenche jamais**. Pour qu'un défilement interne
existe, il faut que la hauteur soit contrainte en amont ; or aucun ancêtre n'a
de hauteur fixe. `flex-1` se résout donc à la hauteur du contenu, et la règle
reste lettre morte. C'est l'illusion classique : le code *semble* prévoir un
défilement indépendant, mais rien ne le borne.

**`src/components/admin/admin-chrome.tsx:133`** — `<main>` n'a pas non plus de
défilement propre.

À corriger ensemble : une hauteur fixe sur la racine, `overflow-hidden`, puis
`overflow-y-auto` sur la barre latérale **et** sur la zone de contenu,
séparément.

## 3. Incohérences relevées

### 3.1 Typographie — le système existe mais n'est pas appliqué

Une échelle nommée a été définie (`tailwind.config.ts:88-96` : `meta`, `body`,
`body-lg`, `h3`, `h2`, `h1`, `display`). Son adoption dans l'admin est marginale :

| Classe | Occurrences | Origine |
|---|---|---|
| `text-xs` | **64** | échelle Tailwind brute |
| `text-sm` | **38** | échelle Tailwind brute |
| `text-lg` | **24** | échelle Tailwind brute |
| `text-body` | 12 | système |
| `text-meta` | 5 | système |
| `text-[0.6875rem]` | 2 | valeur arbitraire |
| `text-[0.9375rem]` | 1 | valeur arbitraire |

Soit **126 tailles hors système contre 19 dans le système**. La migration
précédente a été mécanique : elle a converti les couleurs, pas la typographie.

**Même rôle, tailles différentes** — un libellé de champ mesure 15 px dans un
fichier et 12 px dans l'autre :
- `src/components/ui/field.tsx:48` → `text-body` (15 px)
- `src/components/admin/form-bits.tsx:287` → `text-xs` (12 px)

### 3.2 Rayons — vocabulaire dédoublé

| Classe | Occurrences | Remarque |
|---|---|---|
| `rounded-control` | 39 | système (12 px) |
| `rounded-card` | 37 | système (20 px) |
| `rounded-md` | **10** | hors système (6 px) |
| `rounded-full` | **9** | **doublon exact de `rounded-pill`** |
| `rounded-pill` | 6 | système |
| `rounded-panel` | 2 | système (24 px) |

`rounded-full` et `rounded-pill` produisent le même rendu. Deux noms pour une
seule intention, utilisés au hasard.

### 3.3 Espacements — hors de la grille demandée

Le brief impose 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Sont employés en plus :
- `p-5` / `px-5` (20 px) — 21 occurrences
- `p-7` (28 px) — `admin-chrome.tsx:133`
- `gap-1.5`, `py-2.5`, `mb-1.5` (6 px, 10 px) — demi-pas fréquents

**Même famille visuelle, remplissage différent :**
- `src/components/admin/shell.tsx:112` → `StatCard` en `p-5`
- `src/components/admin/shell.tsx:168` → `FormSection` en `p-6`

### 3.4 Couleurs en dur — 19 occurrences, dont **1 seule** est un vrai défaut

Il faut distinguer, sous peine de gonfler artificiellement le chiffre :

| Emplacement | Verdict |
|---|---|
| `revenue-chart.tsx:21-26` (6) | **Légitime.** Recharts applique les couleurs en attributs SVG et n'accepte pas de classes. Elles sont regroupées dans une constante commentée. |
| `rich-editor-toolbar.tsx:219-222` (12) | **Légitime.** C'est la palette proposée à l'éditeur — du contenu, pas du thème. |
| `rich-content.tsx:353` → `#fef3c7` | **Défaut réel.** Couleur de repli du surlignage, écrite en dur. À passer en token. |

### 3.5 Boutons — 22 balises brutes hors du composant

39 usages de `<Button>` contre **22 `<button>` écrits à la main**, chacun
redéfinissant ses états :
- `rich-editor-toolbar.tsx` — 9
- `block-editor.tsx` — 6
- `admin-chrome.tsx` — 4
- `image-input.tsx` — 2
- `curriculum-editor.tsx` — 1

Ces boutons n'ont ni état de chargement, ni `disabled` homogène, ni anneau de
focus cohérent.

### 3.6 Absence de mode clair

Le système actuel est **mono-thème par construction** : les jetons sont nommés
par teinte (`surface-950`, `onDark-hi`) et non par rôle. Il n'existe aucune
variable CSS commutable, donc aucun mode clair n'est atteignable sans refonte de
la fondation. C'est le point le plus lourd du chantier.

## 4. Composants à fusionner

**`Card` est exporté deux fois :**
- `src/components/ui/card.tsx:8` — carte à sections (en-tête / corps / pied)
- `src/components/ui/surface.tsx:33` — carte de surface avec élévation

Deux composants de même nom, importés selon l'humeur du fichier. À fusionner en
un seul, avec variantes.

**Quasi-doublons fonctionnels :**
- `Badge` (`ui/badge.tsx`) et `Pill` (`ui/pill.tsx`) — même rôle (étiquette de
  statut), deux échelles de tons presque identiques.
- `SectionHeading` (`ui/misc.tsx`) et `SectionHeader` (`ui/section.tsx`) — deux
  en-têtes de section concurrents.
- Le motif « menu ancré » est réécrit trois fois : `admin-chrome.tsx` (menu du
  compte), `rich-editor-toolbar.tsx` (`Popover`), `block-editor.tsx` (sélecteur).
  Chacun réimplémente clic-extérieur et touche Échap.

## 5. Ce qui va bien — à ne pas casser

Par honnêteté, tout n'est pas à refaire :

- **Le gabarit est déjà universel** : **25 pages sur 25** utilisent `PageHeader`.
  Contrairement à votre hypothèse, l'incohérence n'est pas structurelle.
- Les largeurs de contenu sont quasi homogènes (`max-w-3xl` ×8, `max-w-4xl` ×3).
- Les contrastes mesurés passent AA (5,3:1 à 17:1).
- `prefers-reduced-motion` est déjà respecté globalement.
- La logique métier, les routes et les appels de données sont propres et n'ont
  pas à être touchés.

## 6. Plan de refonte proposé

### Phase 1 — Fondation en variables CSS *(rupture assumée)*
Remplacer les échelles par teinte par des **jetons de rôle** en variables CSS,
commutables clair/sombre via `[data-theme]`. Tailwind consomme ces variables.
Échelle typographique fixe (12/13/14/16/20/24/30), grille 4 px stricte, 3 rayons,
3 ombres, jetons de mouvement. Documenté dans `DESIGN_SYSTEM.md`.
**Impact : ~70 fichiers.** C'est la phase la plus risquée ; les suivantes en dépendent.

### Phase 2 — Coquille applicative
`h-dvh` + `overflow-hidden`, barre latérale et contenu à défilement séparé,
repli en rail 64 px mémorisé, en-tête collant, tiroir mobile.

### Phase 3 — Bibliothèque de composants
Ajout de **Radix UI** (primitives accessibles : dialogue, menu, onglets,
infobulle, interrupteur) et de **`cva`** pour les variantes. Fusion des doublons
relevés en §4. Un composant par besoin.

### Phase 4 — Mouvement
Ajout de **`motion`**. Indicateur de navigation glissant (`layoutId`), cascade au
premier rendu, transitions de page, compteurs animés, squelettes.

### Phase 5 — Migration page par page
Les 25 pages, par lots, avec vérification build + lint après chaque lot.

### Phase 6 — États et finitions
Chargement, vide, erreur pour chaque page ; parcours clavier complet ; cibles
tactiles ≥ 40 px.

## 7. Décisions qu'il me faut avant de coder

1. **Ajout de dépendances** — Radix UI, `cva` et `motion` sont nécessaires pour
   tenir le brief. Les trois sont-ils acceptés ?
2. **Portée du mode clair** — uniquement l'admin, ou aussi le site public ? Le
   public est aujourd'hui sombre par décision explicite ; deux thèmes des deux
   côtés doublent la surface à migrer.
3. **Le site public suit-il ?** Il partage `button.tsx`, `field.tsx`, `badge.tsx`
   et consorts. Refondre ces jetons le touchera **forcément** : soit je le migre
   aussi, soit j'isole deux systèmes — ce que je déconseille.
