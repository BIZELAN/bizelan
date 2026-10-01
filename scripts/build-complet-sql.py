# -*- coding: utf-8 -*-
"""
Assemble et vérifie `supabase/complet.sql`.

    python scripts/build-complet-sql.py

Réunit les quatorze migrations, le contenu de départ et deux sections écrites à la
main (`supabase/_entete_complet.sql`, `supabase/_pied_complet.sql`) en un seul
fichier destiné à un projet Supabase neuf.

Pourquoi générer plutôt que maintenir un second fichier à la main : sans cela,
le projet neuf et le projet existant divergent, et l'écart ne se découvre qu'en
production. Le script vérifie donc aussi que chaque section est IDENTIQUE à sa
migration d'origine — la seule exception étant six instructions de 0004 qui ne
font rien et que la section 11 corrige (voir `SANS_EFFET` plus bas).

À relancer après toute modification dans `supabase/migrations/`.
"""
import io
import os
import re
import sys

NL = "\n"
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MIGRATIONS = [
    ("0001_schema.sql", "Schéma : types, tables, index, déclencheurs"),
    ("0002_rls.sql", "Sécurité au niveau des lignes"),
    ("0003_storage.sql", "Espaces de stockage et leurs règles"),
    ("0004_learning.sql", "Temps de visionnage et questionnaires"),
    ("0005_lesson_videos.sql", "Espace privé pour les vidéos de leçon"),
    ("0006_chariow.sql", "Paiements : traces de livraison"),
    ("0007_site_theme.sql", "Thème et mise en page pilotés depuis la console"),
    ("0008_revisions.sql", "Historique des refontes, et retour arrière"),
    ("0009_saspay.sql", "Paiements SasPay"),
    ("0010_watch_guard.sql", "Garde-fou de visionnage pour le certificat"),
    ("0011_column_privileges.sql", "Droits par colonne — la correction qui compte"),
    ("0012_whatsapp_float.sql", "Bouton WhatsApp flottant, réglable"),
    ("0013_boutique_espace.sql", "Boutique, notes d'apprenant, durcissement"),
    ("0014_avis_carte.sql", "Lien Google Maps, avis clients sur tous les sujets"),
]

# Ces six instructions de 0004 NE FONT RIEN : en PostgreSQL, un privilège
# accordé au niveau de la TABLE couvre déjà toutes ses colonnes, et un `revoke`
# de colonne ne peut pas en soustraire une. La section 11 fait le travail
# correctement. On les neutralise ici au lieu de les recopier telles quelles :
# dans un fichier unique, une instruction qui ne fait rien mais ressemble à une
# protection est un piège — c'est précisément ce qui a laissé deux failles
# ouvertes pendant des semaines sur ce projet.
SANS_EFFET = [
    "revoke update (watched_seconds) on public.lesson_progress from authenticated;",
    "revoke update (watched_seconds) on public.lesson_progress from anon;",
    "revoke insert (watched_seconds) on public.lesson_progress from authenticated;",
    "revoke insert (watched_seconds) on public.lesson_progress from anon;",
    "revoke select (is_correct) on public.quiz_choices from authenticated;",
    "revoke select (is_correct) on public.quiz_choices from anon;",
]
PREFIXE_NEUTRALISE = "-- SANS EFFET, neutralisee : voir la SECTION 11. "

BARRE = "-- " + ("=" * 73)

echecs = []


def controle(libelle, ok, detail=""):
    if not ok:
        echecs.append(libelle)
    print(("  OK    " if ok else "  ECHEC ") + libelle.ljust(52) + " " + str(detail))


def lire(*parties):
    chemin = os.path.join(RACINE, *parties)
    with io.open(chemin, "rb") as f:
        return f.read().decode("utf-8").replace("\r\n", NL)


def banniere(numero, titre, source):
    return NL.join([
        "", "", BARRE, BARRE, "--",
        "--   SECTION " + str(numero) + " — " + titre,
        "--",
        "--   Source : " + source,
        "--", BARRE, BARRE, "", "",
    ])


def neutraliser(texte):
    n = 0
    for ligne in SANS_EFFET:
        if ligne in texte:
            texte = texte.replace(ligne, PREFIXE_NEUTRALISE + ligne)
            n += 1
    return texte, n


# --- Assemblage ------------------------------------------------------------

morceaux = [lire("supabase", "_entete_complet.sql")]
neutralisees = 0

for numero, (fichier, titre) in enumerate(MIGRATIONS, start=1):
    contenu = lire("supabase", "migrations", fichier)
    if fichier == "0004_learning.sql":
        contenu, neutralisees = neutraliser(contenu)
    morceaux.append(banniere(numero, titre, "supabase/migrations/" + fichier))
    morceaux.append(contenu.rstrip(NL) + NL)

morceaux.append(banniere(len(MIGRATIONS) + 1, "Contenu de depart (supprimable)", "supabase/seed.sql"))
morceaux.append(lire("supabase", "seed.sql").rstrip(NL) + NL)
morceaux.append(lire("supabase", "_pied_complet.sql"))

complet = NL.join(morceaux)
cible = os.path.join(RACINE, "supabase", "complet.sql")
with io.open(cible, "w", encoding="utf-8", newline="") as f:
    f.write(complet)

print("supabase/complet.sql : " + str(len(complet.split(NL))) + " lignes")

# --- Fidelite --------------------------------------------------------------

print(NL + "  FIDELITE A LA SOURCE")
controle("six instructions sans effet neutralisees", neutralisees == 6, neutralisees)

for fichier, _ in MIGRATIONS:
    source = lire("supabase", "migrations", fichier).rstrip(NL)
    if fichier == "0004_learning.sql":
        source, _ = neutraliser(source)
    controle(fichier + " inclus a l identique", source in complet,
             str(len(source.split(NL))) + " lignes")

seed = lire("supabase", "seed.sql").rstrip(NL)
controle("seed.sql inclus a l identique", seed in complet, str(len(seed.split(NL))) + " lignes")

# --- Structure -------------------------------------------------------------

print(NL + "  STRUCTURE")
controle("delimiteurs $$ en nombre pair", complet.count("$$") % 2 == 0, complet.count("$$"))
controle("parentheses equilibrees", complet.count("(") == complet.count(")"),
         str(complet.count("(")) + " / " + str(complet.count(")")))
controle("aucun caractere de controle",
         not [c for c in set(complet) if ord(c) < 9 or ord(c) == 11])
controle("aucune meta-commande psql",
         not [l for l in complet.split(NL) if l.lstrip()[:1] == chr(92)])
controle("aucun begin/commit explicite",
         not re.search(r"^\s*(begin|commit|rollback)\s*;", complet, re.M | re.I))
controle("aucun UUID code en dur",
         not re.search(r"'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'", complet))
controle("aucun secret", not re.search(r"sk_live|sk_test|eyJhbGciOi", complet))

# --- Section 15 : promotion de l administrateur ----------------------------

print(NL + "  SECTION 16")
depart = complet.index("SECTION 16 —")
i = complet.index("do $$", depart)
bloc = complet[i:complet.index("end $$;", i) + 7]
controle("bloc do ... end ferme", bloc.endswith("end $$;"))
controle("adresse encore a remplacer", "remplacez-moi@exemple.com" in bloc)
controle("ne fait rien si l adresse n est pas changee",
         "raise notice" in bloc and "return;" in bloc)
controle("leve une erreur si le compte n existe pas", "raise exception" in bloc)
controle("designe par adresse, pas par UUID",
         "lower(email)" in bloc and "uuid" not in bloc.lower())

# --- Section 16 : verification ---------------------------------------------

print(NL + "  SECTION 17")
depart = complet.index("SECTION 17 —")
i = complet.index("with controles as (", depart)
requete = complet[i:complet.index("order by ordre;", i)]

# Commentaires et litteraux retires : la requete INTERROGE les droits
# INSERT/UPDATE, donc ces mots y figurent legitimement en chaines.
nue = re.sub(r"'[^']*'", "''", re.sub(r"--[^\n]*", "", requete))
ecritures = re.findall(r"\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\s",
                       nue, re.I)
controle("aucune ecriture", not ecritures, ecritures or "aucune")
controle("ne lit que des vues systeme et trois tables du projet",
         set(re.findall(r"from ([a-z_.]+)", nue)) == {
             "controles",
             "information_schema.tables", "information_schema.column_privileges",
             "information_schema.columns", "information_schema.table_privileges",
             "storage.buckets", "pg_tables",
             "public.site_settings", "public.bz_profiles", "public.courses",
         },
         sorted(set(re.findall(r"from ([a-z_.]+)", nue))))

branches = re.split(r"\n  union all\n", requete)
controle("quinze branches", len(branches) == 15, len(branches))
for n, branche in enumerate(branches, start=1):
    corps = re.sub(r"--[^\n]*", "", branche)
    controle("branche " + str(n) + " numerotee",
             bool(re.search(r"select\s+" + str(n) + r"\s*(,|as ordre)", corps)))

# Les deux controles qui comptent : ce sont ceux dont l'absence a laisse deux
# failles ouvertes. Leur disparition de la section 14 doit faire echouer ici.
controle("controle des droits sur quiz_choices.is_correct",
         "quiz_choices" in requete and "is_correct" in requete
         and "column_privileges" in requete)
controle("controle des droits sur lesson_progress.watched_seconds",
         "lesson_progress" in requete and "watched_seconds" in requete)

print(NL + (str(len(echecs)) + " PROBLEME(S) : " + ", ".join(echecs)
            if echecs else "Tout concorde."))
sys.exit(1 if echecs else 0)
