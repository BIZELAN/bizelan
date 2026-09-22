"""Detecte les classes de jeton employees dans le code mais jamais generees.

    npx tailwindcss -i src/app/globals.css -o .tmp/full.css
    python scripts/check-dead-classes.py .tmp/full.css

Pourquoi ce controle existe : une cle de couleur sans `DEFAULT` ne produit pas
la classe nue. `colors.accent` n'etant qu'une echelle 50..950, `bg-accent` ne
correspondait a aucune regle — et la variante d'achat du bouton a rendu des
CTA sans fond pendant toute une phase, sans qu'aucun test ne bronche : une
classe absente ne casse rien, elle ne fait rien.

Sortie 1 si une classe utilisee n'existe pas.
"""
import io
import os
import re
import sys

ROLES = (r'(primary|secondary|success|warning|danger|info|canvas|surface|line|fg'
         r'|accent|brand|ink|onDark)')
PREFIX = (r'(?:bg|text|border|border-[tblrxy]|ring|ring-offset|from|via|to|fill'
          r'|stroke|divide|outline|decoration|shadow|placeholder|caret)')
pat = re.compile(r'\b(' + PREFIX + r'-' + ROLES + r'(?:-[a-z0-9]+)*)(?![\w-])')

css_path = sys.argv[1] if len(sys.argv) > 1 else '.tmp/full.css'
css = io.open(css_path, encoding='utf-8').read()

found = {}
for root, _, files in os.walk('src'):
    for fn in files:
        if not fn.endswith('.tsx'):
            continue
        path = os.path.join(root, fn).replace(os.sep, '/')
        for i, line in enumerate(io.open(path, encoding='utf-8'), 1):
            st = line.lstrip()
            # Les commentaires citent des classes sans les employer.
            if st.startswith('*') or st.startswith('//') or st.startswith('/*'):
                continue
            for m in pat.finditer(line):
                found.setdefault(m.group(1), []).append('%s:%d' % (path, i))


def exists(cls):
    """Une classe peut n'apparaitre que prefixee d'une variante, auquel cas le
    selecteur porte un `:` echappe — `.hover\\:bg-primary-hover:hover`, ou
    `.data-\\[state\\=checked\\]\\:bg-primary-fg` quand la variante contient
    elle-meme des caracteres a echapper."""
    esc = re.escape(cls).replace('\\-', '-')
    variante = r'(?:[\w\\\[\]=.,%()&>~*+-]+\\:)*'
    return re.search(r'[.\\]' + variante + esc + r'(?![\w-])', css) is not None


dead = {c: v for c, v in found.items() if not exists(c)}
print('%d classes de jeton distinctes utilisees -> %d morte(s)' % (len(found), len(dead)))
for c in sorted(dead):
    v = dead[c]
    print('  %-32s x%-3d %s%s' % (c, len(v), v[0], '  ...' if len(v) > 1 else ''))
sys.exit(1 if dead else 0)
