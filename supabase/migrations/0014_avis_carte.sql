-- ===========================================================================
-- BIZELAN — Lien Google Maps et avis déposés par les clients
--
--   A. Lien Google Maps de l'adresse (pied de page, page Contact)
--   B. Avis : sur une formation, un produit ou le cabinet ; réponse publique
--
-- Idempotent : peut être rejoué sans effet de bord.
-- ===========================================================================


-- ===========================================================================
-- A. LIEN GOOGLE MAPS
-- ===========================================================================

-- Lien de partage de la fiche Google Maps (« Partager » → « Copier le lien »,
-- souvent `https://maps.app.goo.gl/…`). Distinct de `map_embed_url`, qui sert
-- la carte intégrée de la page Contact et n'est pas fait pour être ouvert.
-- Vide : le site construit une recherche Google Maps à partir de l'adresse.
alter table public.site_settings
  add column if not exists maps_url text;

comment on column public.site_settings.maps_url is
  'Lien Google Maps ouvert au clic sur l''adresse. Vide = recherche de l''adresse.';


-- ===========================================================================
-- B. AVIS
-- ===========================================================================

-- Un avis peut désormais porter sur un PRODUIT de la boutique. Sans formation
-- ni produit, il porte sur le cabinet lui-même.
alter table public.reviews
  add column if not exists product_id uuid references public.products(id) on delete cascade;

-- Réponse de l'équipe, affichée sous l'avis publié. Répondre aux avis, y
-- compris aux plus mitigés, inspire davantage confiance que leur absence.
alter table public.reviews
  add column if not exists admin_reply text;

alter table public.reviews
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.bz_set_updated_at();

create index if not exists reviews_product_status_idx on public.reviews(product_id, status);
create index if not exists reviews_status_created_idx on public.reviews(status, created_at desc);

-- Un avis par client et par sujet. Les avis saisis par l'administration
-- (`user_id` nul) ne sont pas concernés. L'index est créé seulement s'il
-- n'existe pas de doublon : une base où un client aurait déjà déposé deux
-- avis ne doit pas bloquer la migration — le code applicatif empêche de toute
-- façon d'en créer un second.
do $$
begin
  if not exists (
    select 1 from public.reviews
     where user_id is not null and course_id is not null
     group by user_id, course_id having count(*) > 1
  ) then
    create unique index if not exists reviews_one_per_course
      on public.reviews(user_id, course_id)
      where user_id is not null and course_id is not null;
  end if;

  if not exists (
    select 1 from public.reviews
     where user_id is not null and product_id is not null
     group by user_id, product_id having count(*) > 1
  ) then
    create unique index if not exists reviews_one_per_product
      on public.reviews(user_id, product_id)
      where user_id is not null and product_id is not null;
  end if;

  if not exists (
    select 1 from public.reviews
     where user_id is not null and course_id is null and product_id is null
     group by user_id having count(*) > 1
  ) then
    create unique index if not exists reviews_one_general
      on public.reviews(user_id)
      where user_id is not null and course_id is null and product_id is null;
  end if;
end
$$;

-- Le dépôt passe par le serveur, après vérification de l'achat : la politique
-- d'insertion directe de 0002 ne couvrait que les formations, et laissait un
-- inscrit choisir lui-même son statut ou se mettre « en avant ». Elle est
-- retirée ; la lecture des siens reste ouverte (statut de l'avis en attente).
drop policy if exists "reviews_insert_enrolled" on public.reviews;
