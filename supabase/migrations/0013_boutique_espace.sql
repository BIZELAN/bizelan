-- ===========================================================================
-- BIZELAN — Boutique de produits digitaux, espace apprenant, durcissement
--
--   A. Boutique : produits (e-book, pack vidéo, modèle, audio…), fichiers
--      privés, achats et journal des téléchargements
--   B. Commandes et codes promo étendus aux produits
--   C. Espace apprenant : notes personnelles, dernière activité réelle
--   D. Durcissement : vues de chiffre d'affaires et fonctions internes
--
-- Idempotent : peut être rejoué sans effet de bord.
-- ===========================================================================


-- ===========================================================================
-- A. BOUTIQUE
-- ===========================================================================

do $$ begin
  create type bz_product_kind as enum ('ebook', 'video', 'template', 'audio', 'bundle', 'other');
exception when duplicate_object then null; end $$;

-- `add value` doit être validé avant d'être employé : ce fichier se contente
-- de l'ajouter, aucune instruction ci-dessous ne s'en sert.
alter type bz_item_type add value if not exists 'product';

create table if not exists public.products (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique,
  title                   text not null,
  subtitle                text,
  summary                 text,
  description             text,                              -- contenu riche (JSON d'éditeur)
  cover_url               text,
  kind                    bz_product_kind not null default 'ebook',
  pricing                 bz_pricing_mode not null default 'fixed',
  price_cents             int  not null default 0,           -- FCFA, unités entières
  compare_at_price_cents  int,
  currency                text not null default 'XOF',
  format_label            text,                              -- « PDF · 84 pages »
  delivery_label          text,                              -- « Téléchargement immédiat »
  highlights              jsonb not null default '[]'::jsonb, -- ["12 modèles Excel", …]
  faq                     jsonb not null default '[]'::jsonb,
  -- Nombre de téléchargements autorisés par fichier et par acheteur.
  -- 0 = illimité. Freine le partage d'un compte sans gêner un usage normal.
  download_limit          int  not null default 0,
  status                  bz_content_status not null default 'draft',
  featured                boolean not null default false,
  position                int not null default 0,
  seo_title               text,
  seo_description         text,
  og_image_url            text,
  published_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint products_price_positive check (price_cents >= 0),
  constraint products_download_limit_positive check (download_limit >= 0)
);

create index if not exists products_status_idx on public.products(status, position);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.bz_set_updated_at();

create table if not exists public.product_files (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  title         text not null,
  description   text,
  storage_path  text not null,                -- chemin dans le bucket privé « product-files »
  file_name     text,
  file_size     bigint,
  mime_type     text,
  -- Extrait offert : téléchargeable sans achat depuis la fiche produit.
  is_preview    boolean not null default false,
  position      int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists product_files_product_idx on public.product_files(product_id, position);

create table if not exists public.product_purchases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.bz_profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  state       text not null default 'active',
  source      text not null default 'purchase',        -- purchase | admin_grant | free
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, product_id),
  constraint product_purchases_state_known check (state in ('active', 'revoked'))
);

create index if not exists product_purchases_user_idx on public.product_purchases(user_id);
create index if not exists product_purchases_product_idx on public.product_purchases(product_id);

drop trigger if exists product_purchases_set_updated_at on public.product_purchases;
create trigger product_purchases_set_updated_at
  before update on public.product_purchases
  for each row execute function public.bz_set_updated_at();

-- Journal des téléchargements : sert au plafond par acheteur et aux
-- statistiques de l'administration. Écrit uniquement par le serveur.
create table if not exists public.product_downloads (
  id               bigserial primary key,
  user_id          uuid references public.bz_profiles(id) on delete set null,
  product_id       uuid references public.products(id) on delete cascade,
  product_file_id  uuid references public.product_files(id) on delete cascade,
  created_at       timestamptz not null default now()
);

create index if not exists product_downloads_file_user_idx
  on public.product_downloads(product_file_id, user_id);
create index if not exists product_downloads_product_idx
  on public.product_downloads(product_id, created_at desc);


-- --- Stockage ---------------------------------------------------------------
-- Privé : un produit digital est du contenu payé. Aucune lecture directe ;
-- le serveur signe une URL de courte durée après avoir vérifié l'achat.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-files', 'product-files', false, 2147483648, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "bz_product_files_admin_all" on storage.objects;
create policy "bz_product_files_admin_all" on storage.objects
  for all using (bucket_id = 'product-files' and public.bz_is_admin())
  with check (bucket_id = 'product-files' and public.bz_is_admin());


-- --- RLS ----------------------------------------------------------------------
alter table public.products          enable row level security;
alter table public.product_files     enable row level security;
alter table public.product_purchases enable row level security;
alter table public.product_downloads enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (status = 'published' or public.bz_is_admin());
drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

-- La liste des fichiers d'un produit acheté est lisible par l'acheteur ; les
-- extraits offerts le sont par tous. Le chemin de stockage n'ouvre rien à lui
-- seul : le bucket est privé et n'a aucune politique de lecture publique.
drop policy if exists "product_files_read" on public.product_files;
create policy "product_files_read" on public.product_files
  for select using (
    public.bz_is_admin()
    or (
      is_preview and exists (
        select 1 from public.products p
        where p.id = product_files.product_id and p.status = 'published'
      )
    )
    or exists (
      select 1 from public.product_purchases pp
      where pp.product_id = product_files.product_id
        and pp.user_id = auth.uid()
        and pp.state = 'active'
    )
  );
drop policy if exists "product_files_admin_write" on public.product_files;
create policy "product_files_admin_write" on public.product_files
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "product_purchases_select_own" on public.product_purchases;
create policy "product_purchases_select_own" on public.product_purchases
  for select using (user_id = auth.uid() or public.bz_is_admin());
drop policy if exists "product_purchases_admin_write" on public.product_purchases;
create policy "product_purchases_admin_write" on public.product_purchases
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "product_downloads_admin_read" on public.product_downloads;
create policy "product_downloads_admin_read" on public.product_downloads
  for select using (public.bz_is_admin());


-- --- La boutique dans le menu du site ------------------------------------------
-- Le menu vit en base (0007). Sans cette entrée, la boutique existerait sans
-- qu'aucun visiteur ne la trouve. Ajoutée juste après « Formations », une
-- seule fois : si l'administration l'a déjà placée — ou retirée puis
-- remise ailleurs — on n'y touche pas.
update public.site_settings s
   set nav_links = (
     select coalesce(jsonb_agg(item order by ord), '[]'::jsonb)
       from (
         select value as item, (ordinality * 10)::int as ord
           from jsonb_array_elements(s.nav_links) with ordinality
         union all
         select '{"label": "Boutique", "href": "/boutique"}'::jsonb,
                coalesce((
                  select (ordinality * 10 + 5)::int
                    from jsonb_array_elements(s.nav_links) with ordinality
                   where value->>'href' = '/formations'
                   limit 1
                ), 5)
       ) entries
   )
 where s.id = 1
   and jsonb_typeof(s.nav_links) = 'array'
   and jsonb_array_length(s.nav_links) > 0
   and not exists (
     select 1 from jsonb_array_elements(s.nav_links) e where e->>'href' = '/boutique'
   );


-- ===========================================================================
-- B. COMMANDES ET CODES PROMO
-- ===========================================================================

alter table public.order_items
  add column if not exists product_id uuid references public.products(id) on delete set null;

create index if not exists order_items_product_idx on public.order_items(product_id);

-- Un code peut viser une formation, un produit, ou tout le catalogue.
alter table public.coupons
  add column if not exists product_id uuid references public.products(id) on delete cascade;

-- Les valeurs aberrantes étaient acceptées : une remise de 250 % ou négative.
do $$ begin
  alter table public.coupons
    add constraint coupons_discount_value_range
    check (discount_value > 0 and (discount_type <> 'percent' or discount_value <= 100));
exception when duplicate_object then null; when check_violation then null; end $$;

-- Incrément ATOMIQUE du compteur. La lecture puis l'écriture faites côté
-- serveur laissaient deux paiements simultanés compter pour un seul, et un
-- code « 50 utilisations » pouvait en servir davantage.
create or replace function public.bz_redeem_coupon(p_coupon uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.coupons set redemptions = redemptions + 1 where id = p_coupon;
$$;

revoke all on function public.bz_redeem_coupon(uuid) from public;
revoke all on function public.bz_redeem_coupon(uuid) from anon;
revoke all on function public.bz_redeem_coupon(uuid) from authenticated;
grant execute on function public.bz_redeem_coupon(uuid) to service_role;

-- Ventes par produit, pour le tableau de bord.
create or replace view public.v_product_sales as
select
  p.id            as product_id,
  p.title         as product_title,
  coalesce(sum(oi.quantity) filter (where o.status = 'paid'), 0)                      as units_sold,
  coalesce(sum(oi.unit_price_cents * oi.quantity) filter (where o.status = 'paid'), 0) as revenue_cents
from public.products p
left join public.order_items oi on oi.product_id = p.id
left join public.orders o       on o.id = oi.order_id
group by p.id, p.title;


-- ===========================================================================
-- C. ESPACE APPRENANT
-- ===========================================================================

-- --- Notes personnelles -------------------------------------------------------
-- Ce que l'apprenant retient d'une leçon, à côté de la vidéo. Visible de lui
-- seul : ni l'administration ni les autres apprenants n'en ont l'usage.
create table if not exists public.lesson_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.bz_profiles(id) on delete cascade,
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  body        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, lesson_id),
  constraint lesson_notes_body_length check (char_length(body) <= 20000)
);

create index if not exists lesson_notes_user_course_idx on public.lesson_notes(user_id, course_id);

drop trigger if exists lesson_notes_set_updated_at on public.lesson_notes;
create trigger lesson_notes_set_updated_at
  before update on public.lesson_notes
  for each row execute function public.bz_set_updated_at();

alter table public.lesson_notes enable row level security;

drop policy if exists "lesson_notes_own" on public.lesson_notes;
create policy "lesson_notes_own" on public.lesson_notes
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = lesson_notes.course_id
        and e.state in ('active', 'completed')
    )
  );


-- --- Dernière activité réelle -------------------------------------------------
-- `lesson_progress.updated_at` n'avait aucun déclencheur : un `upsert` qui
-- cochait une leçon laissait la date de première visite. « Reprendre » ne
-- pouvait donc pas savoir où l'apprenant s'était arrêté.
drop trigger if exists lesson_progress_set_updated_at on public.lesson_progress;
create trigger lesson_progress_set_updated_at
  before update on public.lesson_progress
  for each row execute function public.bz_set_updated_at();

-- Ouvrir une leçon compte comme une activité, même sans lancer la vidéo : on
-- lit les notes, on télécharge un support. Security definer parce que la
-- colonne `updated_at` n'est pas accordée en écriture au client ; l'accès au
-- cours est donc revérifié ici.
create or replace function public.bz_touch_lesson(p_lesson uuid, p_course uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return;
  end if;

  if not exists (
    select 1 from public.enrollments e
    where e.user_id = v_user and e.course_id = p_course
      and e.state in ('active', 'completed')
  ) then
    return;
  end if;

  -- La leçon doit appartenir au cours annoncé : sans ce contrôle, on pourrait
  -- créer une ligne de progression rattachée au mauvais parcours.
  if not exists (
    select 1 from public.lessons l
    join public.course_modules m on m.id = l.module_id
    where l.id = p_lesson and m.course_id = p_course
  ) then
    return;
  end if;

  insert into public.lesson_progress as lp (user_id, lesson_id, course_id)
  values (v_user, p_lesson, p_course)
  on conflict (user_id, lesson_id) do update set updated_at = now();
end;
$$;

revoke all on function public.bz_touch_lesson(uuid, uuid) from public;
revoke all on function public.bz_touch_lesson(uuid, uuid) from anon;
grant execute on function public.bz_touch_lesson(uuid, uuid) to authenticated;


-- ===========================================================================
-- D. DURCISSEMENT
-- ===========================================================================

-- Une vue PostgreSQL s'exécute avec les droits de son PROPRIÉTAIRE : elle
-- contourne donc RLS. Les trois vues ci-dessous étaient lisibles avec la clé
-- anon, publique par conception — n'importe quel visiteur pouvait obtenir le
-- chiffre d'affaires jour par jour et les ventes par formation. Seul le code
-- serveur, muni de la clé de service, les lit.
revoke all on public.v_revenue_daily from anon;
revoke all on public.v_revenue_daily from authenticated;
revoke all on public.v_course_sales from anon;
revoke all on public.v_course_sales from authenticated;
revoke all on public.v_product_sales from anon;
revoke all on public.v_product_sales from authenticated;

-- Fonctions internes `security definer` : PostgreSQL accorde EXECUTE à tout le
-- monde par défaut. Elles prennent un identifiant d'utilisateur en paramètre
-- et permettaient donc d'interroger la progression de n'importe qui. Elles ne
-- servent qu'à d'autres fonctions, qui s'exécutent avec les droits du
-- propriétaire et ne sont pas concernées par ce retrait.
revoke all on function public.bz_course_watch_ok(uuid, uuid) from public, anon, authenticated;
revoke all on function public.bz_course_quizzes_ok(uuid, uuid) from public, anon, authenticated;
revoke all on function public.bz_enrollment_certificate_ok(uuid, uuid) from public, anon, authenticated;
revoke all on function public.bz_refresh_enrollment_certificate(uuid, uuid) from public, anon, authenticated;
