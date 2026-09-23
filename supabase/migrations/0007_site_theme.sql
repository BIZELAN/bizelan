-- ===========================================================================
-- BIZELAN — Apparence et navigation pilotées depuis l'administration
--
-- Jusqu'ici la palette vivait dans `globals.css` et les menus dans des
-- tableaux TypeScript : changer une couleur ou ajouter un lien demandait un
-- développeur et un déploiement.
--
-- Rien n'est stocké en CSS. L'administration choisit des COULEURS ; les
-- jetons dérivés (texte lisible, survol, voile) sont calculés à l'affichage
-- par `lib/theme-tokens.ts`, qui s'arrête sur une mesure de contraste. Une
-- couleur mal choisie ne peut donc pas rendre le site illisible.
-- ===========================================================================

alter table public.site_settings
  add column if not exists theme jsonb not null default '{}'::jsonb;

comment on column public.site_settings.theme is
  'Apparence : couleurs de marque, dégradé, rayon. Les jetons dérivés sont '
  'calculés à l''affichage, jamais stockés — voir lib/theme-tokens.ts.';

-- Forme attendue, toutes les clés facultatives :
--   {
--     "primary":        "#ADFF2F",
--     "secondary":      "#1B5FC4",
--     "gradientFrom":   "#194A39",
--     "gradientTo":     "#0A221B",
--     "gradientAngle":  135,
--     "radius":         "md"          -- sm | md | lg
--   }
--
-- Une contrainte de forme plutôt qu'un schéma rigide : les clés s'ajouteront
-- avec le temps, et une migration par nouvelle option serait un frein.
alter table public.site_settings
  drop constraint if exists site_settings_theme_is_object;
alter table public.site_settings
  add constraint site_settings_theme_is_object
  check (jsonb_typeof(theme) = 'object');


-- --- Navigation éditable ---------------------------------------------------
-- L'en-tête et le pied portaient leurs liens dans des tableaux codés en dur.
alter table public.site_settings
  add column if not exists nav_links jsonb not null default '[]'::jsonb;

alter table public.site_settings
  add column if not exists footer_columns jsonb not null default '[]'::jsonb;

alter table public.site_settings
  add column if not exists legal_links jsonb not null default '[]'::jsonb;

comment on column public.site_settings.nav_links is
  'Menu principal : [{ "label": "Formations", "href": "/formations" }, …]';
comment on column public.site_settings.footer_columns is
  'Colonnes du pied : [{ "title": "…", "links": [{ "label": "…", "href": "…" }] }, …]';

do $$
begin
  alter table public.site_settings
    drop constraint if exists site_settings_nav_is_array;
  alter table public.site_settings
    add constraint site_settings_nav_is_array
    check (
      jsonb_typeof(nav_links) = 'array'
      and jsonb_typeof(footer_columns) = 'array'
      and jsonb_typeof(legal_links) = 'array'
    );
end
$$;


-- --- Valeurs de départ -----------------------------------------------------
-- Reprise de ce que portaient les tableaux TypeScript, pour que le site
-- continue d'afficher exactement la même chose après la migration. Sans cela
-- les menus disparaîtraient le temps que l'administration les ressaisisse.
update public.site_settings
   set nav_links = '[
         {"label": "Formations", "href": "/formations"},
         {"label": "Services",   "href": "/services"},
         {"label": "Blog",       "href": "/blog"},
         {"label": "Contact",    "href": "/contact"}
       ]'::jsonb
 where id = 1 and jsonb_array_length(nav_links) = 0;

update public.site_settings
   set legal_links = '[
         {"label": "Mentions légales",        "href": "/mentions-legales"},
         {"label": "Conditions générales",    "href": "/conditions"},
         {"label": "Politique de confidentialité", "href": "/confidentialite"}
       ]'::jsonb
 where id = 1 and jsonb_array_length(legal_links) = 0;

update public.site_settings
   set footer_columns = '[
         {"title": "Formations", "links": [
           {"label": "Toutes les formations", "href": "/formations"}
         ]},
         {"title": "Services", "links": [
           {"label": "Nos accompagnements", "href": "/services"}
         ]},
         {"title": "Ressources", "links": [
           {"label": "Blog",    "href": "/blog"},
           {"label": "Contact", "href": "/contact"}
         ]}
       ]'::jsonb
 where id = 1 and jsonb_array_length(footer_columns) = 0;
