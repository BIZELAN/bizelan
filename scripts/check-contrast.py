"""Verifie les contrastes des jetons de role sur les deux themes.

    python scripts/check-contrast.py

Les valeurs sont lues dans `src/app/globals.css` plutot que recopiees : si un
jeton bouge, la mesure bouge avec lui. Sortie 1 si une paire echoue.

Seuils : 4,5:1 pour le texte (WCAG 1.4.3), 3:1 pour les frontieres de
controle (1.4.11) — un separateur decoratif n'y est pas soumis.
"""
import io
import re
import sys

src = io.open('src/app/globals.css', encoding='utf-8').read()

TOKEN = r'--([a-z-]+):\s*(\d+ \d+ \d+);'

# Les blocs sont reperes par CE QU'ILS DECLARENT, et non par un selecteur
# exact : ceux-ci ont deja change deux fois (ajout de `[data-theme=light]`,
# puis de `[data-site]`), et chaque fois le script s'est mis a lire la mauvaise
# region en silence. Un bloc de palette est ici une regle CSS qui declare
# `--bg`, ce qui est vrai des six et d'aucune autre.
# Les commentaires sont retires d'abord : ils CITENT des selecteurs, et le
# motif les prenait pour du code.
CLEAN = re.sub(r'/\*.*?\*/', '', src, flags=re.S)

BLOCKS = []
for match in re.finditer(r'([^{}]*)\{([^{}]*--bg:[^{}]*)\}', CLEAN):
    selector = ' '.join(match.group(1).split())
    tokens = dict(re.findall(TOKEN, match.group(2)))
    if tokens:
        BLOCKS.append((selector, tokens))


def pick(*, console, dark, forced):
    """Retrouve un bloc par ses caracteristiques de selecteur."""
    for selector, tokens in BLOCKS:
        has_console = 'data-console' in selector
        # `prefers-color-scheme` n'apparait pas dans le selecteur : la
        # media-query enveloppe la regle. On distingue donc la variante imposee
        # par la presence de `[data-theme='dark']`.
        is_forced = "data-theme='dark']" in selector and ':not(' not in selector
        is_dark = is_forced or ':not(' in selector
        if has_console == console and is_dark == dark and is_forced == forced:
            return tokens
    raise SystemExit(
        'Bloc de palette introuvable (console=%s, sombre=%s, impose=%s). '
        'Les selecteurs de globals.css ont-ils change ?' % (console, dark, forced)
    )


LIGHT = pick(console=False, dark=False, forced=False)
DARK = pick(console=False, dark=True, forced=False)
DARK_ATTR = pick(console=False, dark=True, forced=True)

CONSOLE_LIGHT = pick(console=True, dark=False, forced=False)
CONSOLE_DARK = pick(console=True, dark=True, forced=False)
CONSOLE_DARK_ATTR = pick(console=True, dark=True, forced=True)

# Les deux blocs sombres doivent rester identiques : l'un sert la preference
# systeme, l'autre le choix explicite. Une divergence serait invisible a l'oeil
# et ne se manifesterait que chez une partie des visiteurs.
ecarts = sorted(k for k in DARK if DARK_ATTR.get(k) != DARK[k])
if ecarts:
    print('  !! les deux blocs sombres divergent : %s' % ecarts)

ecarts_console = sorted(k for k in CONSOLE_DARK if CONSOLE_DARK_ATTR.get(k) != CONSOLE_DARK[k])
if ecarts_console:
    print('  !! les deux blocs sombres de la console divergent : %s' % ecarts_console)


def rgb(theme, name):
    v = theme.get(name)
    if v is None:
        raise KeyError(name)
    return tuple(int(x) for x in v.split())


def lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(c):
    return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])


def ratio(fg, bg, alpha=1.0):
    if alpha < 1.0:
        # Aplatir avant de mesurer : sans cela un `/80` est surevalue.
        fg = tuple(fg[i] * alpha + bg[i] * (1 - alpha) for i in range(3))
    a, b = lum(fg), lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


# (libelle, jeton texte, jeton fond, seuil, alpha)
PAIRS = [
    ('corps sur page',             'text',           'bg',               4.5, 1),
    ('corps sur carte',            'text',           'surface',          4.5, 1),
    ('secondaire sur page',        'text-muted',     'bg',               4.5, 1),
    ('discret sur page',           'text-subtle',    'bg',               4.5, 1),
    ('lien/icone sur page',        'primary-text',   'bg',               4.5, 1),
    ('lien/icone sur carte',       'primary-text',   'surface',          4.5, 1),
    ('lien/icone sur bandeau',     'primary-text',   'bg-subtle',        4.5, 1),
    ('texte sur aplat primaire',   'primary-fg',     'primary',          4.5, 1),
    ('texte 80% sur primaire',     'primary-fg',     'primary',          4.5, 0.8),
    ('texte sur voile primaire',   'primary-text',   'primary-subtle',   4.5, 1),
    ('bleu sur page',              'secondary-text', 'bg',               4.5, 1),
    ('bleu sur carte',             'secondary-text', 'surface',          4.5, 1),
    ('texte sur aplat bleu',       'secondary-fg',   'secondary',        4.5, 1),
    ('bleu sur voile bleu',        'secondary-text', 'secondary-subtle', 4.5, 1),
    ('succes sur voile',           'success',        'success-subtle',   4.5, 1),
    ('alerte sur voile',           'warning',        'warning-subtle',   4.5, 1),
    ('erreur sur voile',           'danger',         'danger-subtle',    4.5, 1),
    ('info sur voile',             'info',           'info-subtle',      4.5, 1),
    # Lecture longue : `.prose-bz` sert a la fois le site et l'editeur.
    ('prose : corps sur carte',    'text-muted',     'surface',          4.5, 1),
    ('prose : lien',               'secondary-text', 'surface',          4.5, 1),
    # Le survol d'un lien doit porter un jeton de TEXTE. Il pointait sur
    # `secondary-hover`, un jeton de REMPLISSAGE : dans la palette publique il
    # se trouvait sombre et passait ; dans celle de la console il est vif, et
    # tombait a 2,90:1. Un jeton de remplissage n'est jamais lisible par hasard.
    ('prose : lien survole',       'primary-text',   'surface',          4.5, 1),
    ('prose : citation',           'text',           'bg-subtle',        4.5, 1),
    ('prose : code',               'text',           'bg-subtle',        4.5, 1),
    ('bordure de champ',           'control-border', 'bg',               3.0, 1),
    ('anneau de focus',            'ring',           'bg',               3.0, 1),
    ('anneau de focus / carte',    'ring',           'surface',          3.0, 1),
    ('bordure primaire active',    'primary-text',   'bg',               3.0, 1),
    # 1.4.11 : ce qui identifie un aplat, c'est sa BORDURE, pas son
    # remplissage. Le cyan de la console vaut 1,72:1 sur page claire et le
    # GreenYellow 1,15:1 — aucun des deux ne peut porter sa propre frontiere.
    ('bordure aplat primaire',     'primary-text',   'bg',               3.0, 1),
    ('bordure aplat secondaire',   'secondary-text', 'bg',               3.0, 1),
    ('interrupteur actif vs page', 'primary-text',   'bg',               3.0, 1),
]

fails = len(ecarts) + len(ecarts_console)
for theme_name, theme in (
    ('CLAIR', LIGHT),
    ('SOMBRE', DARK),
    ('CONSOLE CLAIR', CONSOLE_LIGHT),
    ('CONSOLE SOMBRE', CONSOLE_DARK),
):
    print('\n  %s' % theme_name)
    for label, fg, bg, need, alpha in PAIRS:
        try:
            r = ratio(rgb(theme, fg), rgb(theme, bg), alpha)
        except KeyError as exc:
            print('    ?? jeton absent : %s' % exc)
            fails += 1
            continue
        ok = r >= need
        fails += 0 if ok else 1
        print('    %-5s %-28s %5.2f:1  (min %.1f)' % ('OK' if ok else 'ECHEC', label, r, need))

print('\n%s' % ('Toutes les paires passent.' if not fails else '%d PAIRE(S) EN ECHEC' % fails))
sys.exit(1 if fails else 0)
