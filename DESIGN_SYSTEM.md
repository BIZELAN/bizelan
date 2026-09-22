# Système de design Bizelan

> Source unique de vérité. Toute valeur de couleur, de taille, d'espacement,
> de rayon, d'ombre ou de durée écrite ailleurs qu'ici est un défaut à corriger.

## Principe : nommer par rôle, jamais par teinte

Les jetons portent le nom de **ce à quoi ils servent**, pas de leur couleur :
`--surface` et non `--gris-900`. Deux bénéfices concrets :

1. **Le basculement clair/sombre est gratuit.** Aucune classe conditionnelle,
   aucun préfixe `dark:` à écrire : `bg-surface` vaut blanc en clair et
   `#131b17` en sombre, parce que la variable change, pas la classe.
2. **Renommer une teinte ne casse rien.** Passer le vert de marque au bleu se
   fait en une ligne dans `globals.css`.

Les variables vivent dans `src/app/globals.css`. Tailwind les consomme dans
`tailwind.config.ts`. **Ne jamais écrire de littéral hexadécimal dans un
composant.**

## Thèmes

| Sélecteur | Effet |
|---|---|
| `:root` | Thème clair — valeur par défaut |
| `@media (prefers-color-scheme: dark)` sur `:root:not([data-theme='light'])` | Sombre selon la préférence système |
| `[data-theme='dark']` sur `<html>` | Sombre imposé, priorité maximale |
| `[data-theme='light']` sur `<html>` | Clair imposé, neutralise la préférence système |

## Couleurs

### Correspondance variable → classe Tailwind

| Variable CSS | Classe | Rôle |
|---|---|---|
| `--bg` | `bg-canvas` | Fond de page |
| `--bg-subtle` | `bg-canvas-subtle` | Fond en retrait (zone désactivée, bandeau) |
| `--surface` | `bg-surface` | Carte, panneau, modale |
| `--surface-raised` | `bg-surface-raised` | Élément superposé (menu, infobulle) |
| `--border` | `border-line` | Séparateur courant |
| `--border-strong` | `border-line-strong` | Séparateur accentué |
| `--control-border` | `border-line-control` | **Contour de contrôle** — voir ci-dessous |
| `--text` | `text-fg` | Texte principal |
| `--text-muted` | `text-fg-muted` | Texte secondaire |
| `--text-subtle` | `text-fg-subtle` | Méta, légende, horodatage |
| `--primary` | `bg-primary` | **Aplat** GreenYellow — jamais du texte |
| `--primary-text` | `text-primary-text`, `border-primary-text` | **Texte, icône, bordure, anneau** |
| `--primary-hover` | `hover:bg-primary-hover` | Survol de l'aplat |
| `--primary-fg` | `text-primary-fg` | Texte posé sur `--primary` |
| `--primary-subtle` | `bg-primary-subtle` | Fond doux de marque |
| `--secondary` | `bg-secondary` | Aplat bleu — action de conversion |
| `--secondary-text` | `text-secondary-text` | Texte et icône bleus |
| `--secondary-fg` | `text-secondary-fg` | Texte posé sur `--secondary` |
| `--secondary-subtle` | `bg-secondary-subtle` | Fond doux bleu |
| `--success` … `--info` | `text-success`, `bg-success-subtle`, … | Statuts |

### GreenYellow se remplit, il ne s'écrit pas

C'est la contrainte structurante de la palette. `#ADFF2F` a une luminance de
**0,806** : posé en aplat sous du texte sombre il donne 15,22:1, mais employé
comme couleur de texte sur une page claire il tombe à **1,15:1** — illisible.

Un même jeton ne peut donc pas servir les deux usages, et le rôle est scindé :

- `bg-primary` — boutons, pastilles, jauges, tout ce qui est **rempli** ;
- `text-primary-text` — liens, icônes, bordures, anneaux de focus, tout ce qui
  est **tracé**. Il vaut `#517800` en thème clair (4,88:1) et redevient
  GreenYellow en thème sombre (15,67:1), où la luminosité joue enfin pour nous.

Écrire `text-primary` est donc une erreur : la classe existe encore pour les
rares aplats textuels, mais aucun texte de l'interface ne doit s'y référer.

### Le bleu porte l'action qui engage

La variante `accent` du bouton — acheter, s'inscrire — est **bleue**, pas
GreenYellow. Le vert-jaune est la signature : il ponctue une page, il ne peut
pas porter tous ses boutons sans la saturer. Le bleu isole l'action qui engage
et lui rend sa visibilité.

Le nom `accent` désigne ici un **rôle** — la couleur d'accentuation — et non un
jeton `--accent`, qui n'existe pas. Seule exception conservée de l'échelle
héritée : `accent-400`, l'or des étoiles de notation, qu'aucun jeton de rôle ne
remplace.

### La couleur vive est réservée aux actions et aux statuts

Jamais décorative. Un fond coloré signifie « cliquez ici » ou « voici l'état ».
Aucun dégradé, hors halos de section du site public.

### Contrôles : un jeton à part, et pourquoi

`--control-border` existe séparément de `--border` parce que la règle WCAG
1.4.11 impose **3:1** aux bordures qui permettent d'identifier un contrôle —
le cadre d'un champ de saisie, d'une case à cocher. Un séparateur décoratif
entre deux cartes n'y est pas soumis.

Soumettre tous les traits à ce seuil produirait une interface en cage. Les
séparateurs restent donc discrets, et seuls les contrôles portent le trait
contrasté.

### Contrastes mesurés

**24 paires vérifiées sur chacun des deux thèmes, toutes conformes.** Extraits :

| Paire | Clair | Sombre | Seuil |
|---|---|---|---|
| Texte principal / surface | 18,66 | 15,39 | 4,5 |
| Lien ou icône / surface | 5,20 | 14,31 | 4,5 |
| Texte de bouton / aplat primaire | 15,22 | 15,22 | 4,5 |
| Bleu / surface | 6,03 | 8,12 | 4,5 |
| Texte / aplat bleu | 6,03 | 8,99 | 4,5 |
| Bordure de contrôle / fond | 3,07 | 3,84 | 3,0 |
| Anneau de focus / surface | 5,20 | 14,31 | 3,0 |

La mesure est reproductible : elle lit les jetons dans `globals.css` plutôt que
de les recopier, et aplatit les couleurs semi-opaques sur leur fond avant de
calculer — sans quoi un `text-primary-fg/80` serait surévalué.

Le blanc pur est écarté du texte sombre au profit d'un blanc cassé verdâtre
(`#eaf2ed`) : il provoque un halo sur fond sombre, pour 2 points de contraste
sans utilité à ce niveau.

## Typographie

Une seule police d'interface, définie par `--font-sans`. **Trois graisses
maximum** : 400 (courant), 500 (accentué), 600 (titres). Jamais de 700 dans
l'interface.

| Classe | Taille | Interligne | Usage |
|---|---|---|---|
| `text-xs` | 12 px | 16 px | Étiquette, badge, méta dense |
| `text-sm` | 13 px | 20 px | Texte secondaire, cellule de tableau |
| `text-base` | **14 px** | 22 px | **Défaut de l'interface** |
| `text-md` | 16 px | 24 px | Texte de lecture, paragraphe long |
| `text-lg` | 20 px | 28 px | Titre de carte, sous-titre |
| `text-xl` | 24 px | 30 px | Titre de page |
| `text-2xl` | 30 px | 36 px | Titre de section |

`text-base` vaut **14 px et non 16** : une interface dense se lit mieux ainsi.
Le 16 px reste disponible sous `text-md` pour les textes de lecture.

`text-3xl` (36), `text-4xl` (44) et `text-5xl` (56) sont **réservés au site
public**. Les employer dans l'admin est un défaut.

**Chiffres tabulaires obligatoires** dans les tableaux et les indicateurs :
`tabular-nums`. Sans cela les colonnes de montants tremblent d'une ligne à
l'autre.

## Espacements — grille de 4 px

Valeurs autorisées : **4, 8, 12, 16, 24, 32, 48, 64**
→ classes `1`, `2`, `3`, `4`, `6`, `8`, `12`, `16`.

Interdits : les demi-pas (`1.5`, `2.5`, `3.5`) et les valeurs hors grille
(`p-5` = 20 px, `p-7` = 28 px). L'échelle Tailwind les propose encore le temps
de la migration ; ils seront retirés de la configuration à la fin.

## Rayons — trois valeurs

| Classe | Valeur | Usage |
|---|---|---|
| `rounded-sm` | 6 px | Case à cocher, puce, petit contrôle |
| `rounded-md` | 10 px | Bouton, champ, menu |
| `rounded-lg` | 14 px | Carte, panneau, modale |
| `rounded-pill` | plein | Badge, pastille, bouton rond |

Au-delà de trois valeurs, l'œil cesse de percevoir la hiérarchie et les écarts
passent pour des erreurs. `rounded-full` est proscrit : doublon de
`rounded-pill`.

## Élévation — trois niveaux

| Classe | Variable | Usage |
|---|---|---|
| `shadow-e1` | `--shadow-1` | Carte posée |
| `shadow-e2` | `--shadow-2` | Menu, popover |
| `shadow-e3` | `--shadow-3` | Modale, tiroir |

Le thème sombre les assombrit et les diffuse davantage : une ombre calibrée
pour le blanc devient invisible sur fond sombre. Sur sombre, c'est le liseré
qui porte la séparation, l'ombre n'apporte que la profondeur.

## Mouvement

| Classe | Valeur | Usage |
|---|---|---|
| `duration-fast` | 120 ms | Survol, pression, bascule |
| `duration-base` | 200 ms | Ouverture de menu, changement d'onglet |
| `duration-slow` | 320 ms | Modale, tiroir, transition de page |

| Classe | Courbe | Usage |
|---|---|---|
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Défaut — entrées et sorties |
| `ease-spring` | `cubic-bezier(0.34, 1.4, 0.64, 1)` | Ressort doux, éléments ludiques |

**Règles.** N'animer que `transform` et `opacity` — tout le reste déclenche une
mise en page ou une repeinture et fait tomber sous 60 images par seconde. Rien
au-delà de 400 ms. `prefers-reduced-motion` est respecté globalement dans
`globals.css` : toute animation y est ramenée à 0,01 ms.

## État de la migration

La fondation coexiste avec l'ancien système le temps des phases suivantes.
Sont marquées « héritage » dans `tailwind.config.ts` et destinées à disparaître :

- les échelles par teinte `brand`, `accent`, `ink`, `onDark`, et les entrées
  numériques de `surface` ;
- les tailles `display`, `h1`, `h2`, `h3`, `body-lg`, `body`, `meta` ;
- les rayons `control`, `card`, `panel` ;
- les ombres `dark-sm`, `dark`, `dark-lg`, `glow`.

Les supprimer avant la migration des composants casserait le build entre deux
phases. La purge est la dernière étape.
