-- ###########################################################################
-- #                                                                         #
-- #   BIZELAN — INSTALLATION COMPLÈTE SUR UN PROJET SUPABASE NEUF           #
-- #                                                                         #
-- ###########################################################################
--
-- Ce fichier est GÉNÉRÉ. Ne le modifiez pas à la main : éditez les migrations
-- dans `supabase/migrations/`, puis relancez
--
--     python scripts/build-complet-sql.py
--
-- Sans cela, le projet neuf et le projet existant divergeront, et c'est le
-- genre d'écart qui ne se découvre qu'en production. Le script vérifie au
-- passage que chaque section est identique à sa migration d'origine.
--
-- Les sections 14 et 15 sont écrites à la main, dans
-- `supabase/_pied_complet.sql` ; cet en-tête dans `_entete_complet.sql`.
--
-- Il réunit, dans l'ordre :
--
--   §1  à §12  les douze migrations, telles quelles
--   §13        le contenu de départ (formation, services, articles) — SUPPRIMABLE
--   §14        promotion de votre compte en administrateur
--   §15        vérification : ce que l'installation a réellement créé
--
--
-- COMMENT L'EXÉCUTER
-- ------------------
--   1. Projet Supabase > SQL Editor > New query
--   2. Collez TOUT ce fichier, puis « Run »
--   3. Lisez le tableau final de la §15 : il dit ce qui existe vraiment
--
-- Une exécution prend quelques secondes. Si l'éditeur refuse la taille, coupez
-- aux barres `====` : chaque section est autonome, dans l'ordre.
--
--
-- CE QU'IL FAUT FAIRE AVANT
-- -------------------------
-- Rien dans la base. Mais notez dès maintenant, depuis
-- Project Settings > API, les trois valeurs à reporter dans `.env` :
--
--   NEXT_PUBLIC_SUPABASE_URL        l'URL du projet
--   NEXT_PUBLIC_SUPABASE_ANON_KEY   la clé « anon / public »
--   SUPABASE_SERVICE_ROLE_KEY       la clé « service_role » — JAMAIS côté client
--
-- La clé `service_role` contourne toute la sécurité au niveau des lignes. Elle
-- n'a rien à faire dans une variable préfixée `NEXT_PUBLIC_`, ni dans un dépôt.
--
--
-- CE QU'IL FAUT FAIRE APRÈS
-- -------------------------
--   1. Reporter les trois valeurs ci-dessus dans `.env`
--   2. Créer votre compte par la page d'inscription du site
--      (un déclencheur crée le profil automatiquement)
--   3. Revenir exécuter la §14 avec votre adresse, pour devenir administrateur
--   4. Vérifier que les quatre espaces de stockage figurent bien dans
--      Storage : public-media, resources, payment-proofs, lesson-videos
--
-- Les envois d'e-mail (RESEND_API_KEY) et les paiements
-- (SASPAY_API_KEY, SASPAY_WEBHOOK_SECRET) sont indépendants de ce fichier :
-- sans eux, le site fonctionne mais ne notifie ni n'encaisse rien.
--
--
-- IDEMPOTENCE
-- -----------
-- Les sections §1 à §12 se relancent sans dommage : `create ... if not exists`,
-- `create or replace`, `drop policy if exists` avant chaque politique. La §12,
-- elle, INSÈRE du contenu : la relancer créerait des doublons de formations et
-- d'articles. Ne l'exécutez qu'une fois.
--
-- ###########################################################################



-- =========================================================================
-- =========================================================================
--
--   SECTION 1 — Schéma : types, tables, index, déclencheurs
--
--   Source : supabase/migrations/0001_schema.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Schéma initial
-- À exécuter dans Supabase > SQL Editor (ou via `supabase db push`)
-- ===========================================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ---------------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------------
do $$ begin
  create type bz_user_role as enum ('client', 'editor', 'admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bz_content_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bz_pricing_mode as enum ('fixed', 'quote', 'free');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bz_order_status as enum ('pending', 'awaiting_payment', 'paid', 'failed', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bz_payment_method as enum ('kkiapay', 'bank_transfer', 'manual', 'free');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bz_item_type as enum ('course', 'service');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bz_enrollment_state as enum ('active', 'revoked', 'completed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bz_quote_status as enum ('new', 'in_progress', 'won', 'lost');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bz_review_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bz_video_provider as enum ('bunny', 'youtube', 'vimeo', 'url');
exception when duplicate_object then null; end $$;
do $$ begin
  create type bz_discount_type as enum ('percent', 'amount');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Fonction utilitaire : horodatage automatique
-- ---------------------------------------------------------------------------
create or replace function public.bz_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Profils (prolonge auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.bz_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  phone       text,
  avatar_url  text,
  role        bz_user_role not null default 'client',
  city        text,
  activity    text,                       -- secteur d'activité déclaré par le client
  notes       text,                       -- note interne visible admin uniquement
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists bz_profiles_role_idx  on public.bz_profiles(role);
create index if not exists bz_profiles_email_idx on public.bz_profiles(lower(email));

drop trigger if exists bz_profiles_set_updated_at on public.bz_profiles;
create trigger bz_profiles_set_updated_at
  before update on public.bz_profiles
  for each row execute function public.bz_set_updated_at();

-- Création automatique du profil à l'inscription
create or replace function public.bz_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.bz_profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists bz_on_auth_user_created on auth.users;
create trigger bz_on_auth_user_created
  after insert on auth.users
  for each row execute function public.bz_handle_new_user();

-- Test de rôle, utilisé par toutes les politiques RLS
create or replace function public.bz_is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.bz_profiles
    where id = auth.uid() and role in ('admin', 'editor')
  );
$$;

create or replace function public.bz_is_super_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.bz_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Catégories (formations et articles)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  kind        text not null default 'course' check (kind in ('course', 'post', 'service')),
  description text,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Formations
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique,
  title                   text not null,
  subtitle                text,
  summary                 text,
  description             text,
  cover_url               text,
  promo_video_url         text,
  category_id             uuid references public.categories(id) on delete set null,
  price_cents             int  not null default 0,          -- en FCFA (unité entière, pas de centimes au Bénin)
  compare_at_price_cents  int,                              -- prix barré
  currency                text not null default 'XOF',
  pricing                 bz_pricing_mode not null default 'fixed',
  level                   text,                             -- « Débutant », « Intermédiaire »…
  duration_label          text,                             -- « 6 à 8 heures »
  format_label            text,                             -- « Vidéos + tableurs Excel »
  access_label            text,                             -- « Paiement unique · Accès à vie »
  what_you_get            jsonb not null default '[]'::jsonb, -- ["6 modules vidéo", ...]
  outcomes                jsonb not null default '[]'::jsonb, -- ["Votre Business Plan complet", ...]
  target_audience         jsonb not null default '[]'::jsonb,
  prerequisites           jsonb not null default '[]'::jsonb,
  faq                     jsonb not null default '[]'::jsonb, -- [{question, answer}]
  status                  bz_content_status not null default 'draft',
  featured                boolean not null default false,
  position                int not null default 0,
  seo_title               text,
  seo_description         text,
  og_image_url            text,
  published_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists courses_status_idx   on public.courses(status);
create index if not exists courses_featured_idx on public.courses(featured) where featured;

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.bz_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Modules et leçons
-- ---------------------------------------------------------------------------
create table if not exists public.course_modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  subtitle    text,
  description text,
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists course_modules_course_idx on public.course_modules(course_id, position);

drop trigger if exists course_modules_set_updated_at on public.course_modules;
create trigger course_modules_set_updated_at
  before update on public.course_modules
  for each row execute function public.bz_set_updated_at();

create table if not exists public.lessons (
  id                uuid primary key default gen_random_uuid(),
  module_id         uuid not null references public.course_modules(id) on delete cascade,
  title             text not null,
  slug              text not null,
  description       text,
  content           text,                              -- notes / transcription (markdown léger)
  video_provider    bz_video_provider,
  video_id          text,                              -- id Bunny / YouTube / Vimeo
  video_url         text,                              -- URL directe si provider = 'url'
  duration_seconds  int not null default 0,
  is_preview        boolean not null default false,    -- visible sans achat
  position          int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (module_id, slug)
);

create index if not exists lessons_module_idx on public.lessons(module_id, position);

drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.bz_set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Ressources téléchargeables (templates Word/Excel…)
-- ---------------------------------------------------------------------------
create table if not exists public.resources (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references public.courses(id) on delete cascade,
  lesson_id   uuid references public.lessons(id) on delete cascade,
  title       text not null,
  description text,
  storage_path text not null,               -- chemin dans le bucket privé « resources »
  file_name   text,
  file_size   bigint,
  mime_type   text,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  constraint resources_parent_check check (course_id is not null or lesson_id is not null)
);

create index if not exists resources_course_idx on public.resources(course_id);
create index if not exists resources_lesson_idx on public.resources(lesson_id);

-- ---------------------------------------------------------------------------
-- 6. Services / prestations
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  subtitle       text,
  summary        text,
  description    text,
  cover_url      text,
  icon           text,                            -- nom d'icône lucide
  pricing        bz_pricing_mode not null default 'quote',
  price_cents    int,
  price_label    text,                            -- « À partir de 150 000 FCFA »
  currency       text not null default 'XOF',
  features       jsonb not null default '[]'::jsonb,
  process_steps  jsonb not null default '[]'::jsonb, -- [{title, description}]
  deliverables   jsonb not null default '[]'::jsonb,
  faq            jsonb not null default '[]'::jsonb,
  status         bz_content_status not null default 'draft',
  featured       boolean not null default false,
  position       int not null default 0,
  seo_title      text,
  seo_description text,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.bz_set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Landing pages composées de blocs
-- ---------------------------------------------------------------------------
create table if not exists public.pages (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  description     text,
  blocks          jsonb not null default '[]'::jsonb,   -- tableau de blocs typés (voir src/lib/blocks.ts)
  status          bz_content_status not null default 'draft',
  is_home         boolean not null default false,
  hide_header     boolean not null default false,       -- page de vente « nue », sans navigation
  hide_footer     boolean not null default false,
  course_id       uuid references public.courses(id) on delete set null,
  service_id      uuid references public.services(id) on delete set null,
  seo_title       text,
  seo_description text,
  og_image_url    text,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists pages_single_home_idx on public.pages(is_home) where is_home;

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.bz_set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Blog
-- ---------------------------------------------------------------------------
create table if not exists public.bz_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  excerpt         text,
  content         text,                                  -- markdown
  cover_url       text,
  category_id     uuid references public.categories(id) on delete set null,
  author_id       uuid references public.bz_profiles(id) on delete set null,
  status          bz_content_status not null default 'draft',
  featured        boolean not null default false,
  reading_minutes int not null default 3,
  views           int not null default 0,
  seo_title       text,
  seo_description text,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists bz_posts_status_published_idx on public.bz_posts(status, published_at desc);

drop trigger if exists bz_posts_set_updated_at on public.bz_posts;
create trigger bz_posts_set_updated_at
  before update on public.bz_posts
  for each row execute function public.bz_set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. Codes promo
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  description     text,
  discount_type   bz_discount_type not null default 'percent',
  discount_value  int not null,                        -- 40 (= 40 %) ou 5000 (= 5 000 FCFA)
  max_redemptions int,
  redemptions     int not null default 0,
  course_id       uuid references public.courses(id) on delete cascade,  -- null = tous produits
  starts_at       timestamptz,
  ends_at         timestamptz,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 10. Commandes
-- ---------------------------------------------------------------------------
create sequence if not exists public.order_reference_seq start 1000;

create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  reference             text not null unique default ('BZ-' || to_char(now(), 'YYMM') || '-' || nextval('public.order_reference_seq')),
  user_id               uuid references public.bz_profiles(id) on delete set null,
  customer_name         text not null,
  customer_email        text not null,
  customer_phone        text,
  subtotal_cents        int not null default 0,
  discount_cents        int not null default 0,
  total_cents           int not null default 0,
  currency              text not null default 'XOF',
  coupon_id             uuid references public.coupons(id) on delete set null,
  coupon_code           text,
  status                bz_order_status not null default 'pending',
  payment_method        bz_payment_method not null default 'kkiapay',
  kkiapay_transaction_id text,
  payment_reference     text,                            -- réf. fournie par le client (virement)
  payment_proof_path    text,                            -- justificatif téléversé
  admin_note            text,
  validated_by          uuid references public.bz_profiles(id) on delete set null,
  paid_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists orders_user_idx    on public.orders(user_id);
create index if not exists orders_status_idx  on public.orders(status, created_at desc);
create index if not exists orders_kkiapay_idx on public.orders(kkiapay_transaction_id);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.bz_set_updated_at();

create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  item_type      bz_item_type not null,
  course_id      uuid references public.courses(id) on delete set null,
  service_id     uuid references public.services(id) on delete set null,
  title_snapshot text not null,
  unit_price_cents int not null default 0,
  quantity       int not null default 1,
  created_at     timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------------------------------------------------------------------------
-- 11. Inscriptions (accès aux formations) et progression
-- ---------------------------------------------------------------------------
create table if not exists public.enrollments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.bz_profiles(id) on delete cascade,
  course_id        uuid not null references public.courses(id) on delete cascade,
  order_id         uuid references public.orders(id) on delete set null,
  state            bz_enrollment_state not null default 'active',
  source           text not null default 'purchase',      -- purchase | admin_grant | import
  progress_percent int not null default 0,
  certificate_code text unique,
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists enrollments_user_idx   on public.enrollments(user_id);
create index if not exists enrollments_course_idx on public.enrollments(course_id);

drop trigger if exists enrollments_set_updated_at on public.enrollments;
create trigger enrollments_set_updated_at
  before update on public.enrollments
  for each row execute function public.bz_set_updated_at();

create table if not exists public.lesson_progress (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.bz_profiles(id) on delete cascade,
  lesson_id      uuid not null references public.lessons(id) on delete cascade,
  course_id      uuid not null references public.courses(id) on delete cascade,
  completed      boolean not null default false,
  last_position_seconds int not null default 0,
  completed_at   timestamptz,
  updated_at     timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists lesson_progress_user_course_idx on public.lesson_progress(user_id, course_id);

-- Recalcul automatique du pourcentage de progression
create or replace function public.bz_recalculate_enrollment_progress()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_user   uuid := coalesce(new.user_id, old.user_id);
  v_course uuid := coalesce(new.course_id, old.course_id);
  v_total  int;
  v_done   int;
  v_pct    int;
begin
  select count(l.id) into v_total
  from public.lessons l
  join public.course_modules m on m.id = l.module_id
  where m.course_id = v_course;

  select count(*) into v_done
  from public.lesson_progress lp
  where lp.user_id = v_user and lp.course_id = v_course and lp.completed;

  v_pct := case when coalesce(v_total, 0) = 0 then 0
                else least(100, round((v_done::numeric / v_total) * 100))::int end;

  update public.enrollments e
     set progress_percent = v_pct,
         started_at   = coalesce(e.started_at, now()),
         completed_at = case when v_pct >= 100 then coalesce(e.completed_at, now()) else null end,
         state        = case when v_pct >= 100 then 'completed'::bz_enrollment_state
                             when e.state = 'completed' then 'active'::bz_enrollment_state
                             else e.state end,
         certificate_code = case
            when v_pct >= 100 and e.certificate_code is null
              then 'BZ-CERT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
            else e.certificate_code end
   where e.user_id = v_user and e.course_id = v_course;

  return null;
end;
$$;

drop trigger if exists lesson_progress_recalc on public.lesson_progress;
create trigger lesson_progress_recalc
  after insert or update or delete on public.lesson_progress
  for each row execute function public.bz_recalculate_enrollment_progress();

-- ---------------------------------------------------------------------------
-- 12. Avis clients
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references public.courses(id) on delete cascade,
  user_id     uuid references public.bz_profiles(id) on delete set null,
  author_name text not null,
  author_role text,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  status      bz_review_status not null default 'pending',
  featured    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists reviews_course_status_idx on public.reviews(course_id, status);

-- ---------------------------------------------------------------------------
-- 13. Demandes de devis et messages de contact
-- ---------------------------------------------------------------------------
create table if not exists public.quote_requests (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid references public.services(id) on delete set null,
  name        text not null,
  email       text not null,
  phone       text,
  company     text,
  budget      text,
  message     text,
  status      bz_quote_status not null default 'new',
  admin_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists quote_requests_set_updated_at on public.quote_requests;
create trigger quote_requests_set_updated_at
  before update on public.quote_requests
  for each row execute function public.bz_set_updated_at();

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  subject    text,
  message    text not null,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text,
  source        text,
  unsubscribed  boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 14. Médiathèque
-- ---------------------------------------------------------------------------
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  bucket       text not null default 'public-media',
  storage_path text not null,
  public_url   text,
  file_name    text not null,
  mime_type    text,
  file_size    bigint,
  width        int,
  height       int,
  alt          text,
  uploaded_by  uuid references public.bz_profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (bucket, storage_path)
);

-- ---------------------------------------------------------------------------
-- 15. Statistiques de visite (léger, sans cookie tiers)
-- ---------------------------------------------------------------------------
create table if not exists public.page_views (
  id          bigserial primary key,
  path        text not null,
  page_id     uuid references public.pages(id) on delete set null,
  course_id   uuid references public.courses(id) on delete set null,
  referrer    text,
  country     text,
  device      text,
  session_id  text,
  created_at  timestamptz not null default now()
);

create index if not exists page_views_created_idx on public.page_views(created_at desc);
create index if not exists page_views_path_idx    on public.page_views(path, created_at desc);

-- ---------------------------------------------------------------------------
-- 16. Paramètres du site (une seule ligne)
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id                 int primary key default 1 check (id = 1),
  site_name          text not null default 'BIZELAN',
  tagline            text,
  logo_url           text,
  favicon_url        text,
  email              text,
  phone              text,
  whatsapp           text,
  address            text,
  map_embed_url      text,
  opening_hours      jsonb not null default '[]'::jsonb,   -- [{label, value}]
  social_links       jsonb not null default '{}'::jsonb,   -- {facebook, linkedin, youtube…}
  bank_transfer_instructions text,
  legal_notice       text,
  terms              text,
  privacy_policy     text,
  payments_kkiapay_enabled boolean not null default true,
  payments_transfer_enabled boolean not null default true,
  announcement       text,                                  -- bandeau haut de page
  announcement_active boolean not null default false,
  default_seo_title       text,
  default_seo_description text,
  updated_at         timestamptz not null default now()
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.bz_set_updated_at();

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 17. Journal d'activité admin
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id          bigserial primary key,
  actor_id    uuid references public.bz_profiles(id) on delete set null,
  action      text not null,
  entity      text,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_log_created_idx on public.activity_log(created_at desc);

-- ---------------------------------------------------------------------------
-- 18. Vues d'agrégation pour le tableau de bord
-- ---------------------------------------------------------------------------
create or replace view public.v_revenue_daily as
select
  date_trunc('day', paid_at)::date as day,
  count(*)                         as orders_count,
  sum(total_cents)                 as revenue_cents
from public.orders
where status = 'paid' and paid_at is not null
group by 1
order by 1;

create or replace view public.v_course_sales as
select
  c.id            as course_id,
  c.title         as course_title,
  coalesce(sum(oi.quantity) filter (where o.status = 'paid'), 0)                      as units_sold,
  coalesce(sum(oi.unit_price_cents * oi.quantity) filter (where o.status = 'paid'), 0) as revenue_cents
from public.courses c
left join public.order_items oi on oi.course_id = c.id
left join public.orders o       on o.id = oi.order_id
group by c.id, c.title;



-- =========================================================================
-- =========================================================================
--
--   SECTION 2 — Sécurité au niveau des lignes
--
--   Source : supabase/migrations/0002_rls.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Row Level Security
-- Règle générale :
--   · le contenu publié est lisible par tout le monde (même non connecté)
--   · le contenu en brouillon n'est visible que des admins/éditeurs
--   · chaque client ne voit que ses propres commandes, accès et progression
--   · toute écriture sensible passe par le rôle service_role (routes serveur)
-- ===========================================================================

alter table public.bz_profiles              enable row level security;
alter table public.categories            enable row level security;
alter table public.courses               enable row level security;
alter table public.course_modules        enable row level security;
alter table public.lessons               enable row level security;
alter table public.resources             enable row level security;
alter table public.services              enable row level security;
alter table public.pages                 enable row level security;
alter table public.bz_posts                 enable row level security;
alter table public.coupons               enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.enrollments           enable row level security;
alter table public.lesson_progress       enable row level security;
alter table public.reviews               enable row level security;
alter table public.quote_requests        enable row level security;
alter table public.contact_messages      enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.media                 enable row level security;
alter table public.page_views            enable row level security;
alter table public.site_settings         enable row level security;
alter table public.activity_log          enable row level security;

-- ---------------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------------
drop policy if exists "bz_profiles_select_own_or_admin" on public.bz_profiles;
create policy "bz_profiles_select_own_or_admin" on public.bz_profiles
  for select using (id = auth.uid() or public.bz_is_admin());

drop policy if exists "bz_profiles_update_own" on public.bz_profiles;
create policy "bz_profiles_update_own" on public.bz_profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "bz_profiles_admin_all" on public.bz_profiles;
create policy "bz_profiles_admin_all" on public.bz_profiles
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

-- Un utilisateur ne peut pas s'auto-promouvoir : le rôle reste figé hors admin.
create or replace function public.bz_guard_profile_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Seul un utilisateur *connecté* est bridé : il ne peut changer un rôle que
  -- s'il est lui-même administrateur. Le code serveur (clé service_role) et
  -- l'accès direct à la base (migrations, SQL Editor) n'ont pas de auth.uid()
  -- et restent autorisés — c'est ce qui permet d'amorcer le premier admin et
  -- de faire fonctionner changeUserRole() côté back-office.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.bz_is_super_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists bz_profiles_guard_role on public.bz_profiles;
create trigger bz_profiles_guard_role
  before update on public.bz_profiles
  for each row execute function public.bz_guard_profile_role();

-- ---------------------------------------------------------------------------
-- Contenus publiés : lecture publique, écriture admin
-- ---------------------------------------------------------------------------
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select using (true);
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "courses_public_read" on public.courses;
create policy "courses_public_read" on public.courses
  for select using (status = 'published' or public.bz_is_admin());
drop policy if exists "courses_admin_write" on public.courses;
create policy "courses_admin_write" on public.courses
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "modules_public_read" on public.course_modules;
create policy "modules_public_read" on public.course_modules
  for select using (
    public.bz_is_admin() or exists (
      select 1 from public.courses c where c.id = course_id and c.status = 'published'
    )
  );
drop policy if exists "modules_admin_write" on public.course_modules;
create policy "modules_admin_write" on public.course_modules
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

-- Les leçons sont listables publiquement (titres du programme) ; l'URL vidéo
-- n'est jamais servie depuis le client : elle passe par une route serveur qui
-- vérifie l'inscription.
drop policy if exists "lessons_public_read" on public.lessons;
create policy "lessons_public_read" on public.lessons
  for select using (
    public.bz_is_admin() or exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = module_id and c.status = 'published'
    )
  );
drop policy if exists "lessons_admin_write" on public.lessons;
create policy "lessons_admin_write" on public.lessons
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

-- Ressources : visibles uniquement aux inscrits (et aux admins)
drop policy if exists "resources_enrolled_read" on public.resources;
create policy "resources_enrolled_read" on public.resources
  for select using (
    public.bz_is_admin()
    or exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.state in ('active', 'completed')
        and e.course_id = coalesce(
          resources.course_id,
          (select m.course_id from public.lessons l
             join public.course_modules m on m.id = l.module_id
            where l.id = resources.lesson_id)
        )
    )
  );
drop policy if exists "resources_admin_write" on public.resources;
create policy "resources_admin_write" on public.resources
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "services_public_read" on public.services;
create policy "services_public_read" on public.services
  for select using (status = 'published' or public.bz_is_admin());
drop policy if exists "services_admin_write" on public.services;
create policy "services_admin_write" on public.services
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "pages_public_read" on public.pages;
create policy "pages_public_read" on public.pages
  for select using (status = 'published' or public.bz_is_admin());
drop policy if exists "pages_admin_write" on public.pages;
create policy "pages_admin_write" on public.pages
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "bz_posts_public_read" on public.bz_posts;
create policy "bz_posts_public_read" on public.bz_posts
  for select using (status = 'published' or public.bz_is_admin());
drop policy if exists "bz_posts_admin_write" on public.bz_posts;
create policy "bz_posts_admin_write" on public.bz_posts
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "media_public_read" on public.media;
create policy "media_public_read" on public.media for select using (true);
drop policy if exists "media_admin_write" on public.media;
create policy "media_admin_write" on public.media
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "settings_public_read" on public.site_settings;
create policy "settings_public_read" on public.site_settings for select using (true);
drop policy if exists "settings_admin_write" on public.site_settings;
create policy "settings_admin_write" on public.site_settings
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

-- Codes promo : jamais listables publiquement (la validation se fait côté serveur)
drop policy if exists "coupons_admin_only" on public.coupons;
create policy "coupons_admin_only" on public.coupons
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

-- ---------------------------------------------------------------------------
-- Commandes : chacun les siennes
-- ---------------------------------------------------------------------------
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (user_id = auth.uid() or public.bz_is_admin());

drop policy if exists "orders_admin_write" on public.orders;
create policy "orders_admin_write" on public.orders
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select using (
    public.bz_is_admin() or exists (
      select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()
    )
  );
drop policy if exists "order_items_admin_write" on public.order_items;
create policy "order_items_admin_write" on public.order_items
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

-- ---------------------------------------------------------------------------
-- Accès aux formations et progression
-- ---------------------------------------------------------------------------
drop policy if exists "enrollments_select_own" on public.enrollments;
create policy "enrollments_select_own" on public.enrollments
  for select using (user_id = auth.uid() or public.bz_is_admin());
drop policy if exists "enrollments_admin_write" on public.enrollments;
create policy "enrollments_admin_write" on public.enrollments
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "progress_select_own" on public.lesson_progress;
create policy "progress_select_own" on public.lesson_progress
  for select using (user_id = auth.uid() or public.bz_is_admin());

-- Un client marque lui-même ses leçons comme terminées, à condition d'y avoir accès.
drop policy if exists "progress_insert_own" on public.lesson_progress;
create policy "progress_insert_own" on public.lesson_progress
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = lesson_progress.course_id
        and e.state in ('active', 'completed')
    )
  );

drop policy if exists "progress_update_own" on public.lesson_progress;
create policy "progress_update_own" on public.lesson_progress
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "progress_admin_write" on public.lesson_progress;
create policy "progress_admin_write" on public.lesson_progress
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

-- ---------------------------------------------------------------------------
-- Avis : lecture des avis approuvés, dépôt réservé aux inscrits
-- ---------------------------------------------------------------------------
drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read" on public.reviews
  for select using (status = 'approved' or user_id = auth.uid() or public.bz_is_admin());

drop policy if exists "reviews_insert_enrolled" on public.reviews;
create policy "reviews_insert_enrolled" on public.reviews
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid() and e.course_id = reviews.course_id
    )
  );

drop policy if exists "reviews_admin_write" on public.reviews;
create policy "reviews_admin_write" on public.reviews
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

-- ---------------------------------------------------------------------------
-- Formulaires publics : dépôt libre, lecture admin
-- ---------------------------------------------------------------------------
drop policy if exists "quotes_insert_public" on public.quote_requests;
create policy "quotes_insert_public" on public.quote_requests for insert with check (true);
drop policy if exists "quotes_admin_read" on public.quote_requests;
create policy "quotes_admin_read" on public.quote_requests
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "contact_insert_public" on public.contact_messages;
create policy "contact_insert_public" on public.contact_messages for insert with check (true);
drop policy if exists "contact_admin_read" on public.contact_messages;
create policy "contact_admin_read" on public.contact_messages
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "newsletter_insert_public" on public.newsletter_subscribers;
create policy "newsletter_insert_public" on public.newsletter_subscribers for insert with check (true);
drop policy if exists "newsletter_admin_read" on public.newsletter_subscribers;
create policy "newsletter_admin_read" on public.newsletter_subscribers
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "pageviews_insert_public" on public.page_views;
create policy "pageviews_insert_public" on public.page_views for insert with check (true);
drop policy if exists "pageviews_admin_read" on public.page_views;
create policy "pageviews_admin_read" on public.page_views
  for select using (public.bz_is_admin());

drop policy if exists "activity_admin_only" on public.activity_log;
create policy "activity_admin_only" on public.activity_log
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());



-- =========================================================================
-- =========================================================================
--
--   SECTION 3 — Espaces de stockage et leurs règles
--
--   Source : supabase/migrations/0003_storage.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Buckets de stockage
--   public-media   : images du site (logos, couvertures, blog) — lecture publique
--   resources      : templates Excel/Word des formations — accès contrôlé
--   payment-proofs : justificatifs de virement déposés par les clients — privé
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true, 10485760,
    array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','video/mp4']),
  ('resources', 'resources', false, 104857600, null),
  ('payment-proofs', 'payment-proofs', false, 10485760,
    array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --- public-media ---------------------------------------------------------
drop policy if exists "bz_public_media_read" on storage.objects;
create policy "bz_public_media_read" on storage.objects
  for select using (bucket_id = 'public-media');

drop policy if exists "bz_public_media_admin_write" on storage.objects;
create policy "bz_public_media_admin_write" on storage.objects
  for all using (bucket_id = 'public-media' and public.bz_is_admin())
  with check (bucket_id = 'public-media' and public.bz_is_admin());

-- --- resources (privé) ----------------------------------------------------
-- Aucune lecture directe : les téléchargements passent par une route serveur
-- qui vérifie l'inscription puis génère une URL signée de courte durée.
drop policy if exists "bz_resources_admin_all" on storage.objects;
create policy "bz_resources_admin_all" on storage.objects
  for all using (bucket_id = 'resources' and public.bz_is_admin())
  with check (bucket_id = 'resources' and public.bz_is_admin());

-- --- payment-proofs (privé) ----------------------------------------------
drop policy if exists "bz_proofs_owner_insert" on storage.objects;
create policy "bz_proofs_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'payment-proofs' and auth.uid() is not null
  );

drop policy if exists "bz_proofs_admin_read" on storage.objects;
create policy "bz_proofs_admin_read" on storage.objects
  for select using (bucket_id = 'payment-proofs' and public.bz_is_admin());



-- =========================================================================
-- =========================================================================
--
--   SECTION 4 — Temps de visionnage et questionnaires
--
--   Source : supabase/migrations/0004_learning.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Suivi de visionnage et questionnaires
--
--   A. Temps de visionnage par apprenant, et conditionnement du certificat
--   B. QCM activables, attachés à une leçon
--
-- Un principe traverse ce fichier : l'apprenant ne doit pouvoir écrire NI son
-- temps de visionnage NI lire les bonnes réponses. Les politiques RLS ne
-- savent pas restreindre une colonne — elles filtrent des lignes. C'est donc
-- `revoke … (colonne)` qui s'en charge, et des fonctions `security definer`
-- qui fournissent les seules écritures et lectures légitimes.
--
-- Sans cela, la clé anon — publique par conception — permettrait à n'importe
-- quel apprenant d'écrire `update lesson_progress set watched_seconds = 99999`
-- sur sa propre ligne, que `progress_update_own` autorise déjà, et de lire
-- `select is_correct from quiz_choices`.
-- ===========================================================================


-- ===========================================================================
-- A. TEMPS DE VISIONNAGE
-- ===========================================================================

-- Temps de lecture RÉELLEMENT écoulé, cumulé. À distinguer de
-- `last_position_seconds`, qui est une position : avancer la barre de lecture
-- la fait bondir sans qu'une seule seconde ait été regardée.
alter table public.lesson_progress
  add column if not exists watched_seconds int not null default 0;

alter table public.lesson_progress
  drop constraint if exists lesson_progress_watched_seconds_positive;
alter table public.lesson_progress
  add constraint lesson_progress_watched_seconds_positive
  check (watched_seconds >= 0);

-- Part de la durée d'une leçon qu'il faut avoir visionnée pour que le
-- certificat soit délivré. 0 = exigence désactivée, comportement actuel.
alter table public.courses
  add column if not exists min_watch_ratio numeric(3, 2) not null default 0;

alter table public.courses
  drop constraint if exists courses_min_watch_ratio_range;
alter table public.courses
  add constraint courses_min_watch_ratio_range
  check (min_watch_ratio >= 0 and min_watch_ratio <= 1);

-- Exiger en plus que les QCM actifs du parcours soient réussis.
alter table public.courses
  add column if not exists require_quiz_pass boolean not null default false;

comment on column public.lesson_progress.watched_seconds is
  'Temps de lecture cumulé, en secondes. Écrit uniquement par bz_record_watch_time().';
comment on column public.courses.min_watch_ratio is
  'Part de chaque leçon à visionner pour obtenir le certificat. 0 = désactivé.';


-- --- L'apprenant ne peut pas écrire cette colonne -------------------------
-- RLS filtre des lignes, pas des colonnes : `progress_update_own` laisse
-- l'utilisateur modifier tout ce que porte sa propre ligne. Le retrait du
-- droit se fait donc au niveau du GRANT.
-- SANS EFFET, neutralisee : voir la SECTION 11. revoke update (watched_seconds) on public.lesson_progress from authenticated;
-- SANS EFFET, neutralisee : voir la SECTION 11. revoke update (watched_seconds) on public.lesson_progress from anon;

-- L'INSERT doit l'être aussi. `progress_insert_own` autorise l'apprenant à
-- créer la ligne de sa propre progression : sans ce retrait, il lui suffirait
-- d'insérer une leçon jamais ouverte avec `watched_seconds` déjà au plafond.
-- SANS EFFET, neutralisee : voir la SECTION 11. revoke insert (watched_seconds) on public.lesson_progress from authenticated;
-- SANS EFFET, neutralisee : voir la SECTION 11. revoke insert (watched_seconds) on public.lesson_progress from anon;


-- --- La seule écriture légitime -------------------------------------------
create or replace function public.bz_record_watch_time(
  p_lesson   uuid,
  p_course   uuid,
  p_seconds  int,      -- incrément depuis le dernier appel
  p_position int       -- position courante, pour la reprise de lecture
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_inc  int;
begin
  if v_user is null then
    raise exception 'Non authentifié.' using errcode = '28000';
  end if;

  -- L'accès au cours est revérifié ici : la fonction est `security definer`,
  -- elle contourne donc RLS et ne peut pas s'appuyer dessus.
  if not exists (
    select 1 from public.enrollments e
    where e.user_id = v_user and e.course_id = p_course -- 'completed' compte : le trigger de progression y bascule l'inscription
      -- des que toutes les lecons sont cochees, et c'est precisement l'apprenant
      -- qu'il faut pouvoir continuer a mesurer.
      and e.state in ('active', 'completed')
  ) then
    raise exception 'Aucun accès à cette formation.' using errcode = '42501';
  end if;

  -- L'incrément est borné. Le client rapporte toutes les 15 secondes ; au-delà
  -- de 120 s par appel, c'est soit un onglet resté en arrière-plan, soit une
  -- tentative de gonfler le compteur. Dans les deux cas on ne le croit pas.
  v_inc := least(greatest(coalesce(p_seconds, 0), 0), 120);

  insert into public.lesson_progress as lp
    (user_id, lesson_id, course_id, watched_seconds, last_position_seconds)
  values
    (v_user, p_lesson, p_course, v_inc, greatest(coalesce(p_position, 0), 0))
  on conflict (user_id, lesson_id) do update
    set watched_seconds       = lp.watched_seconds + v_inc,
        last_position_seconds = greatest(coalesce(p_position, 0), 0),
        updated_at            = now();
end;
$$;

revoke all on function public.bz_record_watch_time(uuid, uuid, int, int) from public;
grant execute on function public.bz_record_watch_time(uuid, uuid, int, int) to authenticated;


-- --- L'exigence est-elle satisfaite ? -------------------------------------
create or replace function public.bz_course_watch_ok(p_user uuid, p_course uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  -- Vrai s'il n'existe AUCUNE leçon en défaut. Une leçon sans durée
  -- renseignée est hors du calcul : on ne peut pas exiger une part d'une
  -- durée inconnue.
  select not exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c        on c.id = m.course_id
    left join public.lesson_progress lp
      on lp.lesson_id = l.id and lp.user_id = p_user
    where m.course_id = p_course
      and c.min_watch_ratio > 0
      and l.duration_seconds > 0
      and coalesce(lp.watched_seconds, 0) < l.duration_seconds * c.min_watch_ratio
  );
$$;


-- ===========================================================================
-- B. QUESTIONNAIRES À CHOIX MULTIPLES
-- ===========================================================================

-- Un questionnaire par leçon, activable. L'attache se fait à la LEÇON et non
-- au module : c'est l'unité que l'apprenant parcourt, et un questionnaire de
-- fin de module s'exprime en le posant sur sa dernière leçon. L'inverse ne
-- serait pas possible.
create table if not exists public.quizzes (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null unique references public.lessons(id) on delete cascade,
  title         text not null default 'Vérifiez vos acquis',
  intro         text,
  is_active     boolean not null default false,
  pass_percent  int not null default 70,
  -- 0 = illimité. Au-delà, l'apprenant ne peut plus retenter.
  max_attempts  int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint quizzes_pass_percent_range check (pass_percent between 1 and 100),
  constraint quizzes_max_attempts_positive check (max_attempts >= 0)
);

create table if not exists public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references public.quizzes(id) on delete cascade,
  prompt      text not null,
  -- Affichée APRÈS correction, pour que l'erreur serve à quelque chose.
  explanation text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists quiz_questions_quiz_idx
  on public.quiz_questions(quiz_id, position);

create table if not exists public.quiz_choices (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  label       text not null,
  is_correct  boolean not null default false,
  position    int not null default 0
);

create index if not exists quiz_choices_question_idx
  on public.quiz_choices(question_id, position);

create table if not exists public.quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.bz_profiles(id) on delete cascade,
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  score_percent int not null,
  passed        boolean not null,
  -- { "<question_id>": ["<choice_id>", …] } — conservé pour la correction
  -- détaillée et pour que l'administrateur puisse voir ce qui a été répondu.
  answers       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  constraint quiz_attempts_score_range check (score_percent between 0 and 100)
);

create index if not exists quiz_attempts_user_quiz_idx
  on public.quiz_attempts(user_id, quiz_id, created_at desc);
create index if not exists quiz_attempts_course_idx
  on public.quiz_attempts(course_id, created_at desc);

drop trigger if exists quizzes_set_updated_at on public.quizzes;
create trigger quizzes_set_updated_at
  before update on public.quizzes
  for each row execute function public.bz_set_updated_at();


-- --- RLS -------------------------------------------------------------------
alter table public.quizzes        enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_choices   enable row level security;
alter table public.quiz_attempts  enable row level security;

-- Un questionnaire actif est lisible par qui a accès à la formation.
drop policy if exists "quizzes_enrolled_read" on public.quizzes;
create policy "quizzes_enrolled_read" on public.quizzes
  for select using (
    public.bz_is_admin() or (
      is_active and exists (
        select 1
        from public.lessons l
        join public.course_modules m on m.id = l.module_id
        join public.enrollments e    on e.course_id = m.course_id
        where l.id = quizzes.lesson_id
          and e.user_id = auth.uid()
          -- 'completed' compte : le trigger de progression y bascule l'inscription
      -- des que toutes les lecons sont cochees, et c'est precisement l'apprenant
      -- qu'il faut pouvoir continuer a mesurer.
      and e.state in ('active', 'completed')
      )
    )
  );

drop policy if exists "quizzes_admin_write" on public.quizzes;
create policy "quizzes_admin_write" on public.quizzes
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "quiz_questions_read" on public.quiz_questions;
create policy "quiz_questions_read" on public.quiz_questions
  for select using (
    public.bz_is_admin() or exists (
      select 1 from public.quizzes q where q.id = quiz_id
    )
  );

drop policy if exists "quiz_questions_admin_write" on public.quiz_questions;
create policy "quiz_questions_admin_write" on public.quiz_questions
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

drop policy if exists "quiz_choices_read" on public.quiz_choices;
create policy "quiz_choices_read" on public.quiz_choices
  for select using (
    public.bz_is_admin() or exists (
      select 1 from public.quiz_questions qq where qq.id = question_id
    )
  );

drop policy if exists "quiz_choices_admin_write" on public.quiz_choices;
create policy "quiz_choices_admin_write" on public.quiz_choices
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());

-- L'apprenant lit ses propres tentatives ; il ne les écrit jamais lui-même,
-- c'est la correction serveur qui les enregistre.
drop policy if exists "quiz_attempts_select_own" on public.quiz_attempts;
create policy "quiz_attempts_select_own" on public.quiz_attempts
  for select using (user_id = auth.uid() or public.bz_is_admin());

drop policy if exists "quiz_attempts_admin_write" on public.quiz_attempts;
create policy "quiz_attempts_admin_write" on public.quiz_attempts
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());


-- --- La bonne réponse n'est pas lisible par l'apprenant -------------------
-- Même raison que pour `watched_seconds` : RLS ne filtre pas les colonnes.
-- Sans ce retrait, `select is_correct from quiz_choices` répondrait, et le
-- questionnaire n'évaluerait plus rien.
-- SANS EFFET, neutralisee : voir la SECTION 11. revoke select (is_correct) on public.quiz_choices from authenticated;
-- SANS EFFET, neutralisee : voir la SECTION 11. revoke select (is_correct) on public.quiz_choices from anon;


-- --- Correction : la seule voie qui lise les bonnes réponses ---------------
create or replace function public.bz_grade_quiz(
  p_quiz    uuid,
  p_answers jsonb   -- { "<question_id>": ["<choice_id>", …] }
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_course   uuid;
  v_active   boolean;
  v_pass     int;
  v_max      int;
  v_used     int;
  v_total    int := 0;
  v_correct  int := 0;
  v_score    int;
  v_passed   boolean;
  v_detail   jsonb := '[]'::jsonb;
  r          record;
begin
  if v_user is null then
    raise exception 'Non authentifié.' using errcode = '28000';
  end if;

  select m.course_id, q.is_active, q.pass_percent, q.max_attempts
    into v_course, v_active, v_pass, v_max
  from public.quizzes q
  join public.lessons l        on l.id = q.lesson_id
  join public.course_modules m on m.id = l.module_id
  where q.id = p_quiz;

  if v_course is null then
    raise exception 'Questionnaire introuvable.' using errcode = '42704';
  end if;
  if not v_active then
    raise exception 'Ce questionnaire n''est pas actif.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.enrollments e
    where e.user_id = v_user and e.course_id = v_course -- 'completed' compte : le trigger de progression y bascule l'inscription
      -- des que toutes les lecons sont cochees, et c'est precisement l'apprenant
      -- qu'il faut pouvoir continuer a mesurer.
      and e.state in ('active', 'completed')
  ) then
    raise exception 'Aucun accès à cette formation.' using errcode = '42501';
  end if;

  if v_max > 0 then
    select count(*) into v_used
    from public.quiz_attempts a
    where a.user_id = v_user and a.quiz_id = p_quiz;
    if v_used >= v_max then
      raise exception 'Nombre de tentatives épuisé.' using errcode = '42501';
    end if;
  end if;

  -- Une question est juste si l'ensemble des choix cochés est EXACTEMENT
  -- l'ensemble des choix corrects. Compter les bonnes réponses sans pénaliser
  -- les mauvaises rendrait le score maximal en cochant tout.
  for r in
    select
      qq.id as question_id,
      qq.explanation,
      coalesce(
        (select array_agg(c.id order by c.id)
         from public.quiz_choices c
         where c.question_id = qq.id and c.is_correct),
        '{}'::uuid[]
      ) as expected,
      coalesce(
        -- `distinct` : un client malformé peut envoyer deux fois le même
        -- choix, ce qui ferait échouer la comparaison d'ensembles.
        (select array_agg(distinct value::text::uuid order by value::text::uuid)
         from jsonb_array_elements_text(coalesce(p_answers -> qq.id::text, '[]'::jsonb))),
        '{}'::uuid[]
      ) as given
    from public.quiz_questions qq
    where qq.quiz_id = p_quiz
    order by qq.position, qq.created_at
  loop
    v_total := v_total + 1;
    if r.expected = r.given then
      v_correct := v_correct + 1;
    end if;

    v_detail := v_detail || jsonb_build_object(
      'question_id', r.question_id,
      'correct',     r.expected = r.given,
      'expected',    to_jsonb(r.expected),
      'explanation', r.explanation
    );
  end loop;

  v_score  := case when v_total = 0 then 0
                   else round((v_correct::numeric / v_total) * 100)::int end;
  v_passed := v_score >= v_pass;

  insert into public.quiz_attempts (user_id, quiz_id, course_id, score_percent, passed, answers)
  values (v_user, p_quiz, v_course, v_score, v_passed, coalesce(p_answers, '{}'::jsonb));

  -- Le certificat peut dépendre de la réussite : on relance le calcul.
  perform public.bz_refresh_enrollment_certificate(v_user, v_course);

  return jsonb_build_object(
    'score_percent', v_score,
    'pass_percent',  v_pass,
    'passed',        v_passed,
    'total',         v_total,
    'correct',       v_correct,
    'detail',        v_detail
  );
end;
$$;

revoke all on function public.bz_grade_quiz(uuid, jsonb) from public;
grant execute on function public.bz_grade_quiz(uuid, jsonb) to authenticated;


-- --- Tous les QCM actifs du parcours sont-ils réussis ? --------------------
create or replace function public.bz_course_quizzes_ok(p_user uuid, p_course uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select not exists (
    select 1
    from public.quizzes q
    join public.lessons l        on l.id = q.lesson_id
    join public.course_modules m on m.id = l.module_id
    where m.course_id = p_course
      and q.is_active
      and not exists (
        select 1 from public.quiz_attempts a
        where a.quiz_id = q.id and a.user_id = p_user and a.passed
      )
  );
$$;


-- ===========================================================================
-- C. CONDITIONNEMENT DU CERTIFICAT
-- ===========================================================================

-- Jusqu'ici, `bz_recalculate_enrollment_progress` délivrait le code de
-- certificat dès que toutes les leçons étaient marquées terminées — or c'est
-- l'apprenant lui-même qui les marque. Cliquer treize fois suffisait.
create or replace function public.bz_enrollment_certificate_ok(p_user uuid, p_course uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.bz_course_watch_ok(p_user, p_course)
     and (
       not (select require_quiz_pass from public.courses where id = p_course)
       or public.bz_course_quizzes_ok(p_user, p_course)
     );
$$;

-- Délivre ou retire le code selon les conditions du moment. Appelée par le
-- recalcul de progression ET après chaque correction de questionnaire : un
-- QCM réussi en dernier doit débloquer le certificat sans attendre qu'une
-- leçon soit recochée.
create or replace function public.bz_refresh_enrollment_certificate(p_user uuid, p_course uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.enrollments e
     set certificate_code = case
           when e.progress_percent >= 100
            and public.bz_enrollment_certificate_ok(p_user, p_course)
            and e.certificate_code is null
             then 'BZ-CERT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
           else e.certificate_code
         end
   where e.user_id = p_user and e.course_id = p_course;
end;
$$;

-- Recalcul de progression : même corps qu'en 0001, à ceci près que la
-- délivrance du certificat passe désormais par les conditions ci-dessus.
create or replace function public.bz_recalculate_enrollment_progress()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_user   uuid := coalesce(new.user_id, old.user_id);
  v_course uuid := coalesce(new.course_id, old.course_id);
  v_total  int;
  v_done   int;
  v_pct    int;
begin
  select count(l.id) into v_total
  from public.lessons l
  join public.course_modules m on m.id = l.module_id
  where m.course_id = v_course;

  select count(*) into v_done
  from public.lesson_progress lp
  where lp.user_id = v_user and lp.course_id = v_course and lp.completed;

  v_pct := case when coalesce(v_total, 0) = 0 then 0
                else least(100, round((v_done::numeric / v_total) * 100))::int end;

  update public.enrollments e
     set progress_percent = v_pct,
         started_at   = coalesce(e.started_at, now()),
         completed_at = case when v_pct >= 100 then coalesce(e.completed_at, now()) else null end,
         state        = case when v_pct >= 100 then 'completed'::bz_enrollment_state
                             when e.state = 'completed' then 'active'::bz_enrollment_state
                             else e.state end
   where e.user_id = v_user and e.course_id = v_course;

  -- Le code n'est plus attribué ici : il dépend du visionnage et des QCM,
  -- que ce trigger ne mesure pas.
  perform public.bz_refresh_enrollment_certificate(v_user, v_course);

  return null;
end;
$$;


-- ===========================================================================
-- D. VUE D'ADMINISTRATION — temps de visionnage par apprenant
-- ===========================================================================
create or replace view public.bz_learner_watch_stats as
select
  e.user_id,
  e.course_id,
  p.full_name,
  p.email,
  c.title                                        as course_title,
  c.min_watch_ratio,
  e.progress_percent,
  e.certificate_code,
  count(l.id)                                    as lessons_total,
  count(*) filter (where lp.completed)           as lessons_completed,
  coalesce(sum(lp.watched_seconds), 0)::bigint   as watched_seconds,
  coalesce(sum(l.duration_seconds), 0)::bigint   as duration_seconds,
  -- Leçons marquées terminées SANS avoir été visionnées à hauteur du seuil.
  count(*) filter (
    where lp.completed
      and c.min_watch_ratio > 0
      and l.duration_seconds > 0
      and coalesce(lp.watched_seconds, 0) < l.duration_seconds * c.min_watch_ratio
  )                                              as lessons_skipped
from public.enrollments e
join public.bz_profiles p     on p.id = e.user_id
join public.courses c         on c.id = e.course_id
join public.course_modules m  on m.course_id = e.course_id
join public.lessons l         on l.module_id = m.id
left join public.lesson_progress lp
       on lp.lesson_id = l.id and lp.user_id = e.user_id
group by e.user_id, e.course_id, p.full_name, p.email,
         c.title, c.min_watch_ratio, e.progress_percent, e.certificate_code;

-- La vue traverse plusieurs tables protégées. Elle n'est donc jamais exposée
-- au client : seul le code serveur, muni de la clé service_role, la lit.
revoke all on public.bz_learner_watch_stats from anon;
revoke all on public.bz_learner_watch_stats from authenticated;



-- =========================================================================
-- =========================================================================
--
--   SECTION 5 — Espace privé pour les vidéos de leçon
--
--   Source : supabase/migrations/0005_lesson_videos.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Vidéos de leçon déposées depuis l'administration
--
-- Le bucket est PRIVÉ : une vidéo de formation est du contenu payé. Aucune
-- lecture directe n'est ouverte ; la page de leçon signe une URL de courte
-- durée après avoir vérifié l'inscription, comme pour les supports.
--
-- Le dépôt ne passe PAS par l'application. Une route serveur lisait tout le
-- fichier avant de le relayer, ce qui plafonnait à la limite de corps de
-- requête de l'hébergeur — quelques mégaoctets sur Vercel. Le navigateur
-- dépose donc directement vers le stockage, muni d'un jeton signé que
-- l'administration obtient au préalable.
--
-- ---------------------------------------------------------------------------
-- CE FICHIER A ÉTÉ RÉÉCRIT, et ce qu'il ne fait plus compte autant que ce
-- qu'il fait.
--
-- Sa première version ajoutait `'upload'` à l'enum `bz_video_provider` :
--
--     alter type bz_video_provider add value if not exists 'upload';
--
-- Elle n'a jamais été appliquée, et l'administration a vécu plusieurs
-- semaines avec un sélecteur qui proposait « Téléverser la vidéo » par
-- défaut. Chaque enregistrement échouait donc avec `22P02 invalid input
-- value for enum bz_video_provider: "upload"`, et AUCUNE vidéo ne pouvait
-- être attachée à une leçon.
--
-- La valeur d'enum était de toute façon une mauvaise idée, pour une raison
-- qui ne tient pas à cet incident : `courses.promo_video_url` et le bloc
-- « Vidéo » des pages ne portent qu'une colonne de texte, sans fournisseur à
-- côté. Un enum ne peut pas les servir. Une vidéo déposée s'écrit désormais
--
--     storage://lesson-videos/2026/abc123-presentation.mp4
--
-- dans n'importe quelle colonne de texte, `video_provider` restant à `'url'`.
-- L'information voyage avec la valeur. Voir `src/lib/video.ts`.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('lesson-videos', 'lesson-videos', false, 2147483648,
    array['video/mp4','video/webm','video/ogg','video/quicktime','video/x-matroska'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Le dépôt se fait avec un jeton signé émis par la clé de service, qui ne
-- passe pas par RLS ; la lecture se fait avec une URL signée, de même. Cette
-- politique ne sert donc qu'aux accès directs depuis le tableau de bord
-- Supabase ou un script d'administration. Aucune politique de `select` n'est
-- ouverte aux apprenants, volontairement : sans URL signée, rien n'est
-- lisible.
drop policy if exists "bz_lesson_videos_admin_all" on storage.objects;
create policy "bz_lesson_videos_admin_all" on storage.objects
  for all using (bucket_id = 'lesson-videos' and public.bz_is_admin())
  with check (bucket_id = 'lesson-videos' and public.bz_is_admin());



-- =========================================================================
-- =========================================================================
--
--   SECTION 6 — Paiements : traces de livraison
--
--   Source : supabase/migrations/0006_chariow.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Passage de KkiaPay à Chariow
--
-- Différence de nature entre les deux, et c'est elle qui impose ce fichier :
-- KkiaPay encaisse un MONTANT que nous lui dictons. Chariow vend SES PROPRES
-- produits, et c'est le prix du produit Chariow qui fait foi. Chaque formation
-- doit donc être appariée à un produit Chariow, sans quoi aucun paiement n'est
-- possible.
--
-- L'ancienne colonne `kkiapay_transaction_id` est conservée : elle porte
-- l'historique des ventes déjà encaissées, qu'il n'y a aucune raison d'effacer.
-- ===========================================================================

-- `add value` doit être validé avant d'être employé dans une instruction de
-- données. Ce fichier se contente de l'ajouter.
alter type bz_payment_method add value if not exists 'chariow';

-- Identifiant de la vente Chariow (`SALE…`). Le webhook s'en sert pour
-- retrouver la commande, en complément de `custom_metadata`.
alter table public.orders
  add column if not exists chariow_sale_id text;

create index if not exists orders_chariow_idx on public.orders(chariow_sale_id);

comment on column public.orders.kkiapay_transaction_id is
  'Historique : ventes encaissées via KkiaPay avant le passage à Chariow.';

-- Appariement formation ↔ produit Chariow (`prd_…`).
--
-- Sans lui, la formation ne peut pas être vendue : l'API de paiement exige un
-- `product_id` existant côté Chariow. L'administration doit donc renseigner ce
-- champ pour chaque formation payante.
alter table public.courses
  add column if not exists chariow_product_id text;

comment on column public.courses.chariow_product_id is
  'Produit Chariow correspondant (prd_…). Obligatoire pour vendre la formation.';

-- --- Journal des livraisons de webhook ------------------------------------
-- Chariow rejoue un Pulse jusqu'à environ trois heures tant qu'il ne reçoit
-- pas de 2xx. Sans trace des livraisons déjà traitées, un rejeu rouvrirait
-- l'accès et réécrirait la commande. `x-pulse-delivery-id` est l'identifiant
-- stable d'une tentative : il sert de clé d'idempotence.
create table if not exists public.chariow_deliveries (
  delivery_id  text primary key,
  event        text not null,
  sale_id      text,
  received_at  timestamptz not null default now()
);

create index if not exists chariow_deliveries_sale_idx
  on public.chariow_deliveries(sale_id, received_at desc);

alter table public.chariow_deliveries enable row level security;

-- Aucune politique d'ouverture : seule la clé de service écrit et lit cette
-- table. RLS activé sans politique = rien n'est accessible aux autres rôles,
-- ce qui est exactement l'intention.

-- --- Le drapeau d'activation change de nom --------------------------------
-- `payments_kkiapay_enabled` pilotait le paiement en ligne. Le lui laisser
-- pour commander Chariow serait un nom faux, et un nom faux finit par égarer
-- quelqu'un. Le renommer préserve la valeur déjà réglée par l'administration.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'payments_kkiapay_enabled'
  ) then
    alter table public.site_settings
      rename column payments_kkiapay_enabled to payments_online_enabled;
  end if;
end
$$;

-- Filet pour une base qui n'aurait jamais eu l'ancienne colonne.
alter table public.site_settings
  add column if not exists payments_online_enabled boolean not null default true;



-- =========================================================================
-- =========================================================================
--
--   SECTION 7 — Thème et mise en page pilotés depuis la console
--
--   Source : supabase/migrations/0007_site_theme.sql
--
-- =========================================================================
-- =========================================================================


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



-- =========================================================================
-- =========================================================================
--
--   SECTION 8 — Historique des refontes, et retour arrière
--
--   Source : supabase/migrations/0008_revisions.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Historique des révisions
--
-- Une refonte publiée qu'on veut annuler n'a aujourd'hui aucun recours : la
-- composition précédente est écrasée, et `activity_log` note qu'une page a
-- changé sans dire ce qu'elle contenait.
--
-- Choix qui décide de tout : on enregistre l'état D'AVANT chaque écriture.
-- Une révision est donc « ce que la page contenait avant cet enregistrement »,
-- c'est-à-dire exactement ce vers quoi on veut revenir. Enregistrer l'état
-- d'après reviendrait à dupliquer la ligne courante sans rien offrir de plus.
-- ===========================================================================

create table if not exists public.bz_revisions (
  id         uuid primary key default gen_random_uuid(),
  -- 'page' | 'settings'. Une table unique plutôt qu'une par type : la
  -- mécanique est la même, et la première divergence serait une duplication.
  entity     text not null,
  -- Identifiant de la ligne concernée. Texte et non uuid : les réglages du
  -- site portent l'identifiant 1.
  entity_id  text not null,
  -- L'état complet, avant écriture.
  payload    jsonb not null,
  -- Résumé lisible, calculé à l'enregistrement : « 12 blocs, publiée ».
  -- Il évite d'avoir à ouvrir chaque révision pour retrouver la bonne.
  label      text,
  author_id  uuid references public.bz_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint bz_revisions_entity_known check (entity in ('page', 'settings'))
);

create index if not exists bz_revisions_entity_idx
  on public.bz_revisions(entity, entity_id, created_at desc);

alter table public.bz_revisions enable row level security;

drop policy if exists "bz_revisions_admin_all" on public.bz_revisions;
create policy "bz_revisions_admin_all" on public.bz_revisions
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());


-- --- Élagage ---------------------------------------------------------------
-- Une composition de blocs pèse quelques dizaines de kilo-octets. Sans borne,
-- une page retouchée chaque jour pendant un an en accumulerait des centaines.
-- Au-delà de trente états, on ne revient plus en arrière : on repart.
create or replace function public.bz_prune_revisions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.bz_revisions r
   where r.entity = new.entity
     and r.entity_id = new.entity_id
     and r.id not in (
       select id from public.bz_revisions
        where entity = new.entity and entity_id = new.entity_id
        order by created_at desc
        limit 30
     );
  return null;
end;
$$;

drop trigger if exists bz_revisions_prune on public.bz_revisions;
create trigger bz_revisions_prune
  after insert on public.bz_revisions
  for each row execute function public.bz_prune_revisions();



-- =========================================================================
-- =========================================================================
--
--   SECTION 9 — Paiements SasPay
--
--   Source : supabase/migrations/0009_saspay.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Passage de Chariow à SasPay
--
-- Ce changement n'est pas qu'un changement de prestataire : il rend enfin
-- possible ce qui avait été demandé dès le départ et que Chariow ne pouvait
-- pas tenir — encaisser SANS que le client quitte le site.
--
-- SasPay expose un mode « softpay » : une demande de validation est poussée
-- directement sur le téléphone du client, et la page reste ouverte pendant
-- qu'il compose son code. Chariow n'avait qu'une page hébergée, protégée par
-- `frame-ancestors 'none'`, donc impossible à intégrer.
--
-- Seconde conséquence : SasPay encaisse un MONTANT que nous lui dictons.
-- Chariow encaissait le prix de SON produit, ce qui obligeait à apparier
-- chaque formation et privait nos codes promo d'effet. Les deux contraintes
-- disparaissent.
-- ===========================================================================

alter type bz_payment_method add value if not exists 'saspay';

-- Identifiant de paiement SasPay (UUID). Le webhook et l'interrogation de
-- statut s'en servent pour retrouver la commande.
alter table public.orders
  add column if not exists saspay_payment_id text;

create index if not exists orders_saspay_idx on public.orders(saspay_payment_id);

-- Réseau choisi par le client — mtn_bj, moov_bj, celtiis_bj. Conservé pour le
-- service après-vente : « le paiement a échoué » se traite différemment selon
-- l'opérateur, et l'information n'est plus consultable une fois la tentative
-- passée.
alter table public.orders
  add column if not exists saspay_network text;

comment on column public.orders.chariow_sale_id is
  'Historique : ventes encaissées via Chariow avant le passage à SasPay.';


-- --- Journal des livraisons de webhook, rendu générique --------------------
-- `chariow_deliveries` ne servait qu'à un prestataire. La mécanique est
-- identique pour tous : une clé de livraison, insérée en clé primaire, dont
-- l'échec d'insertion signale un rejeu. On la rend donc commune plutôt que
-- d'en créer une par passerelle.
alter table public.chariow_deliveries
  add column if not exists provider text not null default 'chariow';

alter table public.chariow_deliveries
  rename to payment_deliveries;

comment on table public.payment_deliveries is
  'Clés de livraison des webhooks de paiement, pour rejeter les rejeux. '
  'S''appelait chariow_deliveries : la mécanique est commune à toutes les '
  'passerelles.';

create index if not exists payment_deliveries_provider_idx
  on public.payment_deliveries(provider, received_at desc);



-- =========================================================================
-- =========================================================================
--
--   SECTION 10 — Garde-fou de visionnage pour le certificat
--
--   Source : supabase/migrations/0010_watch_guard.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Garde-fou sur l'exigence de visionnage
--
-- Le défaut corrigé ici est silencieux, et c'est ce qui le rend coûteux.
--
-- Le temps de visionnage ne peut être mesuré que sur une vidéo servie en
-- FICHIER DIRECT : le navigateur voit alors l'élément `<video>` et rapporte
-- la lecture. Pour YouTube, Vimeo ou Bunny Stream, la vidéo vit dans une
-- iframe d'un autre domaine, et rien ne remonte — `watched_seconds` reste à
-- zéro pour toujours.
--
-- Or `bz_course_watch_ok` exigeait une part de visionnage de TOUTE leçon dont
-- la durée est renseignée. Sur une formation hébergée en iframe, chaque leçon
-- se retrouvait donc en défaut, et AUCUN certificat n'était jamais délivré —
-- à personne, sans le moindre message.
--
-- Deux corrections : l'exigence ne porte plus que sur les leçons réellement
-- mesurables, et l'administration est prévenue quand elle règle une exigence
-- qui ne s'appliquera à rien.
-- ===========================================================================

/**
 * Une leçon est mesurable quand sa vidéo est servie en fichier direct.
 *
 * Doit rester cohérent avec `isMeasurableVideoUrl` dans `src/lib/video.ts` :
 * c'est la même question posée des deux côtés, et deux réponses divergentes
 * produiraient un certificat retenu sans raison visible. `scripts/test-video.mjs`
 * vérifie que les deux listes d'extensions concordent.
 */
create or replace function public.bz_lesson_is_measurable(
  p_provider bz_video_provider,
  p_video_url text
)
returns boolean
language sql
immutable
as $$
  select
    -- Fichier déposé par nos soins. Reconnu à son URI et NON à une valeur de
    -- fournisseur : `'upload'` n'existe pas dans l'enum, et la version
    -- précédente de cette fonction était donc inapplicable telle quelle.
    -- La liste blanche de dépôt garantit déjà un format vidéo ; on vérifie
    -- tout de même l'extension, car `.mov` et `.mkv` y sont admis sans être
    -- décodables par la plupart des navigateurs.
    coalesce(p_video_url, '') ~* '^storage://[a-z0-9-]+/.*\.(mp4|webm|ogg|ogv|m3u8|m4v)$'
    -- 'url' ou absence de fournisseur : mesurable si le lien pointe un média.
    or (
      (p_provider is null or p_provider = 'url')
      and coalesce(p_video_url, '') ~* '\.(mp4|webm|ogg|ogv|m3u8|m4v)(\?|#|$)'
    );
$$;

comment on function public.bz_lesson_is_measurable is
  'Vrai si le temps de visionnage de cette leçon peut être mesuré. '
  'Les lectures en iframe (YouTube, Vimeo, Bunny) ne le permettent pas.';


-- --- L'exigence ne porte que sur ce qui est mesurable ----------------------
create or replace function public.bz_course_watch_ok(p_user uuid, p_course uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  -- Vrai s'il n'existe AUCUNE leçon en défaut.
  --
  -- Sont hors du calcul : les leçons sans durée renseignée — on ne peut pas
  -- exiger une part d'une durée inconnue — ET les leçons non mesurables, dont
  -- le compteur resterait à zéro quoi que fasse l'apprenant.
  select not exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c        on c.id = m.course_id
    left join public.lesson_progress lp
      on lp.lesson_id = l.id and lp.user_id = p_user
    where m.course_id = p_course
      and c.min_watch_ratio > 0
      and l.duration_seconds > 0
      and public.bz_lesson_is_measurable(l.video_provider, l.video_url)
      and coalesce(lp.watched_seconds, 0) < l.duration_seconds * c.min_watch_ratio
  );
$$;


-- --- De quoi prévenir l'administration -------------------------------------
-- Une exigence réglée sur une formation dont aucune leçon n'est mesurable ne
-- retient plus personne, mais ne vérifie rien non plus. Le dire vaut mieux que
-- laisser croire à une protection qui n'existe pas.
create or replace view public.bz_course_watch_coverage as
select
  c.id                                                   as course_id,
  c.min_watch_ratio,
  count(l.id)                                            as lessons_total,
  count(*) filter (
    where public.bz_lesson_is_measurable(l.video_provider, l.video_url)
  )                                                      as lessons_measurable,
  count(*) filter (
    where l.duration_seconds = 0
  )                                                      as lessons_without_duration
from public.courses c
left join public.course_modules m on m.course_id = c.id
left join public.lessons l        on l.module_id = m.id
group by c.id, c.min_watch_ratio;

-- Lue par le seul code serveur, comme les autres vues d'administration.
revoke all on public.bz_course_watch_coverage from anon;
revoke all on public.bz_course_watch_coverage from authenticated;


-- --- La vue de suivi doit dire la même chose -------------------------------
-- `lessons_skipped` comptait comme « sautée » toute leçon cochée sans
-- visionnage suffisant, y compris celles qu'on ne sait pas mesurer. Elle
-- affichait donc des sauts imaginaires sur une formation YouTube.
create or replace view public.bz_learner_watch_stats as
select
  e.user_id,
  e.course_id,
  p.full_name,
  p.email,
  c.title                                        as course_title,
  c.min_watch_ratio,
  e.progress_percent,
  e.certificate_code,
  count(l.id)                                    as lessons_total,
  count(*) filter (where lp.completed)           as lessons_completed,
  coalesce(sum(lp.watched_seconds), 0)::bigint   as watched_seconds,
  coalesce(sum(l.duration_seconds), 0)::bigint   as duration_seconds,
  -- Leçons MESURABLES marquées terminées sans avoir été visionnées au seuil.
  count(*) filter (
    where lp.completed
      and c.min_watch_ratio > 0
      and l.duration_seconds > 0
      and public.bz_lesson_is_measurable(l.video_provider, l.video_url)
      and coalesce(lp.watched_seconds, 0) < l.duration_seconds * c.min_watch_ratio
  )                                              as lessons_skipped,
  -- Leçons hors de portée de la mesure, pour que le chiffre ci-dessus se lise
  -- sans se tromper sur ce qu'il couvre.
  count(*) filter (
    where not public.bz_lesson_is_measurable(l.video_provider, l.video_url)
  )                                              as lessons_unmeasurable
from public.enrollments e
join public.bz_profiles p     on p.id = e.user_id
join public.courses c         on c.id = e.course_id
join public.course_modules m  on m.course_id = e.course_id
join public.lessons l         on l.module_id = m.id
left join public.lesson_progress lp
       on lp.lesson_id = l.id and lp.user_id = e.user_id
group by e.user_id, e.course_id, p.full_name, p.email,
         c.title, c.min_watch_ratio, e.progress_percent, e.certificate_code;

revoke all on public.bz_learner_watch_stats from anon;
revoke all on public.bz_learner_watch_stats from authenticated;



-- =========================================================================
-- =========================================================================
--
--   SECTION 11 — Droits par colonne — la correction qui compte
--
--   Source : supabase/migrations/0011_column_privileges.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Correction de deux protections qui n'en étaient pas
--
-- La migration 0004 retirait des droits COLONNE par COLONNE :
--
--     revoke select (is_correct)     on quiz_choices    from authenticated;
--     revoke update (watched_seconds) on lesson_progress from authenticated;
--
-- Ces instructions n'ont RIEN fait. En PostgreSQL, un privilège accordé au
-- niveau de la TABLE couvre déjà toutes ses colonnes, présentes et futures :
-- on ne peut pas en soustraire une par un `revoke` de colonne. Il faut retirer
-- le privilège de table, puis le re-accorder colonne par colonne.
--
-- Conséquences mesurées avec une vraie session d'apprenant inscrit, avant
-- cette correction :
--
--   · `select is_correct from quiz_choices` répondait — toutes les bonnes
--     réponses étaient lisibles depuis le navigateur, ce qui rendait les
--     questionnaires décoratifs ;
--   · `insert`/`update` de `watched_seconds` passaient — n'importe qui
--     pouvait se déclarer 999 999 secondes de visionnage et décrocher son
--     certificat sans ouvrir une vidéo.
--
-- Les fonctions `security definer` — `bz_grade_quiz`, `bz_record_watch_time` —
-- ne sont pas concernées : elles s'exécutent avec les droits du propriétaire.
-- ===========================================================================


-- --- Les bonnes réponses ---------------------------------------------------
-- On retire le SELECT de table, puis on le rend sur les seules colonnes que
-- l'apprenant a besoin de lire pour afficher le questionnaire.
revoke select on public.quiz_choices from authenticated;
revoke select on public.quiz_choices from anon;

grant select (id, question_id, label, position) on public.quiz_choices to authenticated;
grant select (id, question_id, label, position) on public.quiz_choices to anon;

comment on column public.quiz_choices.is_correct is
  'Jamais lisible par un client : le SELECT de table est retiré et re-accordé '
  'sans cette colonne. Seul bz_grade_quiz, security definer, la lit.';


-- --- Le temps de visionnage ------------------------------------------------
-- Même mécanique. L'apprenant garde ce qu'il lui faut pour marquer une leçon
-- terminée et mémoriser sa position ; le compteur cumulé lui échappe.
revoke insert on public.lesson_progress from authenticated;
revoke update on public.lesson_progress from authenticated;
revoke insert on public.lesson_progress from anon;
revoke update on public.lesson_progress from anon;

-- `updated_at` est posé par un déclencheur, `watched_seconds` par
-- `bz_record_watch_time` : ni l'un ni l'autre n'est accordé.
grant insert (user_id, lesson_id, course_id, completed, completed_at, last_position_seconds)
  on public.lesson_progress to authenticated;
grant update (user_id, lesson_id, course_id, completed, completed_at, last_position_seconds)
  on public.lesson_progress to authenticated;

-- La lecture reste entière : voir son propre temps de visionnage ne pose
-- aucun problème, c'est l'écrire qui en posait un.
grant select on public.lesson_progress to authenticated;

comment on column public.lesson_progress.watched_seconds is
  'Temps de lecture cumulé. Non accordé en écriture au client : l''INSERT et '
  'l''UPDATE de table sont retirés et re-accordés sans cette colonne. Seul '
  'bz_record_watch_time, security definer, l''incrémente.';


-- --- Ce que les prochaines migrations ne doivent pas défaire ---------------
-- Supabase ré-accorde parfois les privilèges de table lors d'opérations
-- d'administration. Si `select is_correct` redevient possible un jour, c'est
-- ici qu'il faut revenir — et `scripts/` porte les sondes qui le détectent.



-- =========================================================================
-- =========================================================================
--
--   SECTION 12 — Bouton WhatsApp flottant, réglable
--
--   Source : supabase/migrations/0012_whatsapp_float.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Bouton WhatsApp flottant, réglable depuis la console
--
-- Le numéro WhatsApp existait déjà (`site_settings.whatsapp`) et servait au
-- pied de page et à la page Contact. Ce qui manquait : un accès permanent,
-- visible depuis n'importe quelle page.
--
-- Trois réglages, et non un simple interrupteur. Le côté parce qu'un bouton
-- fixé en bas à droite recouvre, sur certains gabarits, le dernier élément
-- d'une colonne ; le message pré-rempli parce qu'un message qui nomme la page
-- d'origine fait gagner un aller-retour à l'équipe ; l'interrupteur parce
-- qu'une campagne peut vouloir concentrer les demandes sur le formulaire.
-- ===========================================================================

alter table public.site_settings
  add column if not exists whatsapp_float_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists whatsapp_float_message text;

alter table public.site_settings
  add column if not exists whatsapp_float_position text not null default 'right';

-- La valeur atterrit dans un nom de classe côté rendu. La contrainte est donc
-- une barrière de sécurité autant qu'une garantie de cohérence : sans elle,
-- une valeur inattendue produirait un bouton sans position, collé au flux.
do $$ begin
  alter table public.site_settings
    add constraint site_settings_whatsapp_float_position_check
    check (whatsapp_float_position in ('left', 'right'));
exception when duplicate_object then null; end $$;

comment on column public.site_settings.whatsapp_float_enabled is
  'Affiche le bouton WhatsApp flottant sur tout le site public.';
comment on column public.site_settings.whatsapp_float_message is
  'Message pré-rempli dans la conversation. Vide = aucun message.';
comment on column public.site_settings.whatsapp_float_position is
  'Coin d''ancrage du bouton : left ou right. Contraint en base.';



-- =========================================================================
-- =========================================================================
--
--   SECTION 13 — Contenu de depart (supprimable)
--
--   Source : supabase/seed.sql
--
-- =========================================================================
-- =========================================================================


-- ===========================================================================
-- BIZELAN — Données de départ
-- Reprend le contenu réel de la page « Plan d'Affaires Agricole » (Systeme.io)
-- pour que le site soit immédiatement utilisable après installation.
--
-- À exécuter APRÈS 0001_schema.sql, 0002_rls.sql et 0003_storage.sql.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Paramètres du site
-- ---------------------------------------------------------------------------
update public.site_settings set
  site_name = 'BIZELAN',
  tagline   = 'Cabinet d''accompagnement et de transformation des entreprises',
  email     = 'contactbizelan@gmail.com',
  phone     = '+229 01 97 86 82 89',
  whatsapp  = '22997868289',
  address   = 'BIZELAN, Bénin',
  map_embed_url = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3323.2128546599993!2d2.2194050741007074!3d6.636209993358248!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x660343e51926ba31%3A0xde5aaccfc57bb307!2sBIZELAN!5e1!3m2!1sfr!2sbj!4v1782134739842!5m2!1sfr!2sbj',
  opening_hours = '[
    {"label": "Lundi – Vendredi", "value": "08h – 18h"},
    {"label": "Samedi", "value": "09h – 16h"},
    {"label": "Dimanche", "value": "Fermé"}
  ]'::jsonb,
  bank_transfer_instructions = 'Effectuez votre dépôt Mobile Money au +229 01 97 86 82 89 (MTN / Moov / Celtiis) en indiquant la référence de votre commande, puis validez ci-dessous. Votre accès est ouvert dès vérification, généralement sous quelques heures ouvrées.',
  default_seo_title = 'BIZELAN — Structurez et financez votre projet',
  default_seo_description = 'Cabinet d''accompagnement dédié aux entreprises qui veulent améliorer leur fonctionnement, renforcer leur performance et assurer leur pérennité.',
  announcement = '-40 % sur la formation Plan d''Affaires Agricole — offre de lancement',
  announcement_active = true
where id = 1;

-- ---------------------------------------------------------------------------
-- Catégories
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, kind, position) values
  ('Agriculture & Agrobusiness', 'agriculture', 'course', 1),
  ('Gestion & Finance',          'gestion-finance', 'course', 2),
  ('Conseil',                    'conseil', 'service', 1),
  ('Business Plan',              'business-plan', 'post', 1),
  ('Gestion d''entreprise',      'gestion-entreprise', 'post', 2)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Formation phare : Plan d'Affaires Agricole
-- ---------------------------------------------------------------------------
insert into public.courses (
  slug, title, subtitle, summary, description,
  cover_url, category_id,
  price_cents, compare_at_price_cents, currency, pricing,
  level, duration_label, format_label, access_label,
  what_you_get, outcomes, target_audience, faq,
  status, featured, position, seo_title, seo_description, published_at
) values (
  'plan-affaires-agricole',
  'Plan d''Affaires Agricole',
  'Donnez à votre projet agricole la structure qu''il mérite',
  'Transformez votre activité en un Plan d''Affaires solide, chiffré et présentable — en suivant la méthode étape par étape, avec des cas concrets du secteur agricole.',
  'Ce parcours s''adresse aux porteurs de projets agricoles qui ont déjà démarré leur activité et veulent la structurer pour convaincre un financeur ou un partenaire. En trois phases — Radiographie, Restructuration, Formalisation — vous passez d''une activité qui fonctionne « au feeling » à un Business Plan complet, chiffré et présentable, accompagné d''un plan financier Excel réutilisable.',
  'https://d1yei2z3i6k35z.cloudfront.net/17985501/6a448c888802a6.72536382_ARAF.png',
  (select id from public.categories where slug = 'agriculture'),
  14999, 24999, 'XOF', 'fixed',
  'Tous niveaux',
  '6 à 8 heures de travail dont 3h de visionnage',
  'Séquences vidéo courtes + supports Word, Excel et PowerPoint',
  'Paiement unique · Accès à vie',
  '["6 modules vidéo complets", "1 Template Business Plan", "18 tableurs Excel automatisés", "Accès à vie, depuis téléphone ou ordinateur"]'::jsonb,
  '["Votre Business Plan complet rédigé, structuré, présentable", "Plan financier Excel réutilisable : coûts · ventes · trésorerie · financement", "Certificat de fin de parcours"]'::jsonb,
  '["Vous avez déjà démarré une activité agricole", "Vous voulez structurer ou restructurer votre projet", "Vous visez un financement ou un partenariat", "Vous êtes prêt à travailler sur votre projet"]'::jsonb,
  '[
    {"question": "Dois-je avoir des connaissances en comptabilité ou en gestion ?", "answer": "Non. Tout est expliqué pas à pas, avec des exemples concrets. Aucune base préalable n''est nécessaire."},
    {"question": "Combien de temps faut-il pour suivre la formation ?", "answer": "Comptez entre 6 et 8 heures de travail au total, à votre rythme. Vous pouvez avancer module par module, sans contrainte de calendrier."},
    {"question": "Ai-je besoin d''un ordinateur ?", "answer": "Les vidéos sont accessibles sur smartphone. Pour les tableurs Excel, un ordinateur ou une tablette est recommandé, mais pas obligatoire — certaines applications mobiles permettent aussi de les remplir."},
    {"question": "Cette formation est-elle adaptée à mon secteur agricole précis ?", "answer": "Oui. La méthode s''applique à tous les maillons — production, transformation, commercialisation, ou prestation de service — quel que soit votre secteur."},
    {"question": "Et si je n''arrive pas à terminer seul certains exercices ?", "answer": "Les fiches et tableurs sont conçus pour être autonomes, avec des exemples détaillés à chaque étape. Et les projets les plus engagés pourront accéder à un accompagnement personnalisé annoncé séparément."},
    {"question": "Le paiement est-il sécurisé ?", "answer": "Oui, le paiement se fait directement via opérateur mobile (MTN, Moov, Celtiis). Vérifiez toujours le montant avant de valider."}
  ]'::jsonb,
  'published', true, 1,
  'Formation Plan d''Affaires Agricole — BIZELAN',
  'Construisez un Business Plan agricole solide, chiffré et présentable. 6 modules vidéo, 18 tableurs Excel, template Business Plan. Accès à vie.',
  now()
) on conflict (slug) do nothing;

-- Modules (les 3 phases du parcours)
with c as (select id from public.courses where slug = 'plan-affaires-agricole')
insert into public.course_modules (course_id, title, subtitle, description, position)
select c.id, m.title, m.subtitle, m.description, m.position
from c, (values
  ('Phase 1 — Radiographie', 'Où en est vraiment votre projet',
   'Vous découvrez où en est réellement votre projet aujourd''hui, et les principes de diagnostic qui font la différence entre une activité qui survit et une activité qui convainc un partenaire.', 1),
  ('Phase 2 — Restructuration', 'Stratégie, organisation et chiffres réels',
   'Vous construisez votre stratégie, votre organisation et vos chiffres réels — pour enfin savoir exactement où va votre argent et combien vous gagnez vraiment.', 2),
  ('Phase 3 — Formalisation', 'Votre Business Plan complet',
   'Vous assemblez tout votre travail dans un Business Plan complet, structuré comme ceux que lisent les institutions de financement — qui vous servira de feuille de route.', 3)
) as m(title, subtitle, description, position)
where not exists (select 1 from public.course_modules cm where cm.course_id = c.id);

-- Leçons de la Phase 1
with m as (
  select cm.id from public.course_modules cm
  join public.courses c on c.id = cm.course_id
  where c.slug = 'plan-affaires-agricole' and cm.position = 1
)
insert into public.lessons (module_id, title, slug, description, duration_seconds, is_preview, position)
select m.id, l.title, l.slug, l.description, l.duration, l.is_preview, l.position
from m, (values
  ('L''état réel de votre projet', 'etat-reel-projet',
   'Ce que vous faites bien, ce qui vous freine — sans vous mentir à vous-même.', 900, true, 1),
  ('Ce qui sépare un projet financé d''un projet refusé', 'projet-finance-ou-refuse',
   'Les critères réels qu''appliquent les financeurs avant de dire oui.', 1080, false, 2),
  ('Les 3 questions qui révèlent si votre marché est prêt à payer', 'marche-pret-a-payer',
   'Valider la demande avant d''investir davantage.', 960, false, 3)
) as l(title, slug, description, duration, is_preview, position)
where not exists (select 1 from public.lessons x where x.module_id = m.id);

-- Leçons de la Phase 2
with m as (
  select cm.id from public.course_modules cm
  join public.courses c on c.id = cm.course_id
  where c.slug = 'plan-affaires-agricole' and cm.position = 2
)
insert into public.lessons (module_id, title, slug, description, duration_seconds, is_preview, position)
select m.id, l.title, l.slug, l.description, l.duration, false, l.position
from m, (values
  ('Le calcul de votre coût de revient réel', 'cout-de-revient-reel',
   'Celui que la plupart des porteurs de projet ignorent.', 1200, 1),
  ('Construire un plan de ventes crédible', 'plan-de-ventes-credible',
   'Des projections que les financeurs prennent au sérieux.', 1140, 2),
  ('Le tableau de trésorerie', 'tableau-de-tresorerie',
   'Éviter de se retrouver à sec en pleine campagne.', 1320, 3)
) as l(title, slug, description, duration, position)
where not exists (select 1 from public.lessons x where x.module_id = m.id);

-- Leçons de la Phase 3
with m as (
  select cm.id from public.course_modules cm
  join public.courses c on c.id = cm.course_id
  where c.slug = 'plan-affaires-agricole' and cm.position = 3
)
insert into public.lessons (module_id, title, slug, description, duration_seconds, is_preview, position)
select m.id, l.title, l.slug, l.description, l.duration, false, l.position
from m, (values
  ('Le Business Plan recommandé par les SFD', 'business-plan-sfd',
   'La structure attendue par les institutions de financement et partenaires techniques du secteur agricole.', 1500, 1),
  ('Rédiger un résumé exécutif qui donne envie', 'resume-executif',
   'La première page que lit votre financeur — et souvent la seule.', 900, 2),
  ('Présenter votre projet à l''oral', 'presentation-orale',
   'La méthode pour ne pas perdre votre partenaire en 2 minutes.', 1080, 3)
) as l(title, slug, description, duration, position)
where not exists (select 1 from public.lessons x where x.module_id = m.id);

-- ---------------------------------------------------------------------------
-- Services du cabinet
-- ---------------------------------------------------------------------------
insert into public.services (slug, title, subtitle, summary, description, icon, pricing, price_label, features, process_steps, status, featured, position, published_at)
values
(
  'diagnostic-organisationnel',
  'Diagnostic organisationnel',
  'Comprendre ce qui freine réellement votre entreprise',
  'Une analyse profonde de la santé organisationnelle de votre structure, suivie d''un diagnostic clair des problématiques.',
  'Nous analysons votre organisation — processus, rôles, flux financiers, pilotage — pour identifier précisément ce qui limite votre performance. Vous repartez avec un rapport de diagnostic hiérarchisant les problèmes et les leviers d''action.',
  'stethoscope', 'quote', 'Sur devis',
  '["Analyse profonde de la santé organisationnelle", "Entretiens avec les équipes clés", "Rapport de diagnostic hiérarchisé", "Restitution et plan d''action priorisé"]'::jsonb,
  '[{"title": "Cadrage", "description": "Nous définissons ensemble le périmètre et les objectifs de la mission."},
    {"title": "Collecte", "description": "Entretiens, analyse documentaire et observation de terrain."},
    {"title": "Diagnostic", "description": "Identification et hiérarchisation des problématiques."},
    {"title": "Restitution", "description": "Présentation des conclusions et du plan d''action."}]'::jsonb,
  'published', true, 1, now()
),
(
  'accompagnement-strategique',
  'Accompagnement stratégique',
  'Une transformation suivie dans la durée',
  'Un accompagnement personnalisé pour mettre en œuvre les changements et garantir la durabilité des résultats.',
  'Au-delà du diagnostic, nous vous accompagnons dans la mise en œuvre : structuration des processus, outils de pilotage, montée en compétence de vos équipes, et suivi régulier des indicateurs jusqu''à l''atteinte des résultats.',
  'trending-up', 'quote', 'Sur devis',
  '["Solutions adaptées et personnalisées", "Points de suivi réguliers", "Outils de pilotage sur mesure", "Suivi des résultats dans la durée"]'::jsonb,
  '[{"title": "Feuille de route", "description": "Nous traduisons le diagnostic en chantiers concrets et datés."},
    {"title": "Mise en œuvre", "description": "Accompagnement opérationnel de vos équipes sur chaque chantier."},
    {"title": "Pilotage", "description": "Tableaux de bord et points de suivi mensuels."},
    {"title": "Consolidation", "description": "Transfert de compétences pour que les résultats tiennent sans nous."}]'::jsonb,
  'published', true, 2, now()
),
(
  'montage-plan-affaires',
  'Montage de plan d''affaires',
  'Un dossier prêt à présenter à vos financeurs',
  'Nous construisons avec vous le Business Plan complet de votre projet, chiffré et conforme aux attentes des institutions de financement.',
  'Pour les porteurs de projet qui préfèrent être accompagnés plutôt que de suivre la formation en autonomie : nous rédigeons et chiffrons votre plan d''affaires avec vous, jusqu''au dossier finalisé prêt à déposer.',
  'file-text', 'quote', 'Sur devis',
  '["Étude de marché et positionnement", "Plan financier complet sur 3 ans", "Dossier conforme aux attentes des SFD et partenaires", "Préparation à la soutenance orale"]'::jsonb,
  '[{"title": "Immersion", "description": "Nous prenons connaissance de votre projet en profondeur."},
    {"title": "Chiffrage", "description": "Construction du modèle financier et des hypothèses."},
    {"title": "Rédaction", "description": "Production du dossier complet."},
    {"title": "Préparation", "description": "Entraînement à la présentation devant vos interlocuteurs."}]'::jsonb,
  'published', false, 3, now()
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Landing page de vente (reprise de la page /bp actuelle, en blocs éditables)
-- ---------------------------------------------------------------------------
insert into public.pages (slug, title, description, status, hide_header, course_id, seo_title, seo_description, published_at, blocks)
select
  'bp',
  'Plan d''Affaires Agricole — page de vente',
  'Page de vente de la formation Plan d''Affaires Agricole',
  'published',
  true,
  c.id,
  'Formation Plan d''Affaires Agricole — BIZELAN',
  'Transformez votre activité agricole en un Business Plan solide, chiffré et présentable. -40 % sur l''offre de lancement.',
  now(),
  jsonb_build_array(
    jsonb_build_object(
      'id', 'b1', 'type', 'hero',
      'data', jsonb_build_object(
        'badge', '-40 % de réduction',
        'title', 'Vous avez déjà démarré votre Projet Agricole. Donnez-lui la structure qu''il mérite.',
        'subtitle', 'Transformez votre activité en un Plan d''Affaires solide, chiffré et présentable — en suivant la méthode étape par étape, avec des cas concrets du secteur agricole.',
        'ctaLabel', 'JE REJOINS LA FORMATION',
        'ctaHref', '#offre',
        'align', 'center',
        'theme', 'dark'
      )
    ),
    jsonb_build_object(
      'id', 'b2', 'type', 'painPoints',
      'data', jsonb_build_object(
        'title', 'Vous reconnaissez-vous dans l''une de ces situations ?',
        'items', jsonb_build_array(
          'Vous ne savez pas exactement si votre activité est vraiment rentable.',
          'Vous voulez convaincre un partenaire ou un financeur mais vous n''avez rien de solide à présenter.',
          'Vous sentez que votre projet stagne sans savoir exactement pourquoi.'
        ),
        'imageUrl', 'https://d1yei2z3i6k35z.cloudfront.net/17985501/6a448c888802a6.72536382_ARAF.png'
      )
    ),
    jsonb_build_object(
      'id', 'b3', 'type', 'beforeAfter',
      'data', jsonb_build_object(
        'title', 'Ce qui change avec ce parcours',
        'beforeTitle', 'Avant',
        'afterTitle', 'Après',
        'before', jsonb_build_array(
          'Activité sans direction claire',
          'Chiffres approximatifs ou inexistants',
          'Aucun document à montrer',
          'Stratégie commerciale au feeling'
        ),
        'after', jsonb_build_array(
          'Vision et objectifs précis sur 12 mois',
          'Coûts, rentabilité, seuil calculés',
          'Business Plan complet et présentable',
          'Positionnement clair face au marché'
        )
      )
    ),
    jsonb_build_object(
      'id', 'b4', 'type', 'checklist',
      'data', jsonb_build_object(
        'title', 'Cette formation est faite pour vous si...',
        'items', jsonb_build_array(
          'Vous avez déjà démarré une activité agricole',
          'Vous voulez structurer ou restructurer',
          'Vous visez un financement ou partenariat',
          'Vous êtes prêt à travailler sur votre projet'
        ),
        'imageUrl', 'https://d1yei2z3i6k35z.cloudfront.net/17985501/6a44900356afa7.03241324_ARAF12.png'
      )
    ),
    jsonb_build_object(
      'id', 'b5', 'type', 'phases',
      'data', jsonb_build_object(
        'title', 'Ce que votre projet va subir',
        'items', jsonb_build_array(
          jsonb_build_object(
            'label', 'Phase 1', 'title', 'Radiographie',
            'description', 'Vous allez découvrir où en est vraiment votre projet aujourd''hui, et les principes de diagnostic qui font la différence entre une activité qui survit et une activité qui convainc un partenaire.',
            'bullets', jsonb_build_array(
              'L''état réel de votre projet : ce que vous faites bien, ce qui vous freine, sans vous mentir à vous-même',
              'Ce qui sépare un projet qu''on finance d''un projet qu''on refuse',
              'Les 3 questions qui révèlent si votre marché est vraiment prêt à payer pour votre solution'
            )
          ),
          jsonb_build_object(
            'label', 'Phase 2', 'title', 'Restructuration',
            'description', 'Vous allez construire votre stratégie, votre organisation et vos chiffres réels — pour enfin savoir exactement où va votre argent et combien vous gagnez vraiment.',
            'bullets', jsonb_build_array(
              'Le calcul de votre coût de revient réel — celui que la plupart des porteurs de projet ignorent',
              'Comment construire un plan de ventes crédible que les financeurs prennent au sérieux',
              'Le tableau de trésorerie qui vous évite de vous retrouver à sec en pleine campagne'
            )
          ),
          jsonb_build_object(
            'label', 'Phase 3', 'title', 'Formalisation',
            'description', 'Vous allez assembler tout votre travail dans un Business Plan complet, structuré comme ceux que lisent les institutions de financement — qui va vous servir de feuille de route.',
            'bullets', jsonb_build_array(
              'Le Business Plan recommandé par les SFD et partenaires techniques dans le secteur agricole',
              'Comment rédiger un résumé exécutif qui donne envie de lire la suite',
              'La méthode pour présenter votre projet à l''oral sans perdre votre partenaire en 2 minutes'
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'id', 'b6', 'type', 'features',
      'data', jsonb_build_object(
        'items', jsonb_build_array(
          jsonb_build_object('title', 'Où', 'description', 'En ligne, accessible depuis votre téléphone ou votre ordinateur.', 'icon', 'monitor-smartphone'),
          jsonb_build_object('title', 'Format', 'description', 'Séquences vidéo courtes, et supports Word, Excel, PowerPoint.', 'icon', 'play-circle'),
          jsonb_build_object('title', 'Durée', 'description', '6 à 8 heures au total de travail dont 3h de visionnage.', 'icon', 'clock')
        )
      )
    ),
    jsonb_build_object(
      'id', 'b7', 'type', 'pricing',
      'data', jsonb_build_object(
        'anchor', 'offre',
        'badge', '-40 %',
        'note', 'Paiement unique · Accès à vie',
        'includesTitle', 'Vous aurez accès à :',
        'includes', jsonb_build_array('6 modules vidéo complets', '1 Template Business Plan', '18 tableurs Excel automatisés'),
        'outcomesTitle', 'Vous repartez avec :',
        'outcomes', jsonb_build_array(
          'Votre Business Plan complet rédigé, structuré, présentable',
          'Plan financier Excel réutilisable : coûts · ventes · trésorerie · financement',
          'Certificat de fin de parcours'
        ),
        'ctaLabel', 'Passer au paiement',
        'securityNote', 'Paiement sécurisé par Mobile Money (MTN, Moov, Celtiis)'
      )
    ),
    jsonb_build_object(
      'id', 'b8', 'type', 'quote',
      'data', jsonb_build_object(
        'text', 'Les projets les plus avancés à l''issue de ce parcours pourront être sélectionnés pour un accompagnement personnalisé de 3 mois.',
        'imageUrl', 'https://d1yei2z3i6k35z.cloudfront.net/17985501/6a3931100db3a0.61082558_ChatGPTImage22juin202613_11_211.png',
        'ctaLabel', 'REJOINDRE',
        'ctaHref', '#offre'
      )
    ),
    jsonb_build_object(
      'id', 'b9', 'type', 'about',
      'data', jsonb_build_object(
        'eyebrow', 'Qui sommes-nous ?',
        'title', 'Cabinet BIZELAN',
        'text', 'BIZELAN est un cabinet d''accompagnement et de transformation dédié aux entreprises qui souhaitent améliorer leur fonctionnement, renforcer leur performance et assurer leur pérennité.',
        'bullets', jsonb_build_array(
          'Analyse profonde de la santé organisationnelle',
          'Diagnostic clair des problématiques',
          'Solutions adaptées et personnalisées',
          'Suivi pour garantir la durabilité des résultats'
        )
      )
    ),
    jsonb_build_object(
      'id', 'b10', 'type', 'faq',
      'data', jsonb_build_object(
        'title', 'Les questions fréquentes',
        'useCourseFaq', true,
        'items', jsonb_build_array()
      )
    )
  )
from public.courses c
where c.slug = 'plan-affaires-agricole'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Page d'accueil
-- ---------------------------------------------------------------------------
insert into public.pages (slug, title, description, status, is_home, seo_title, seo_description, published_at, blocks)
values (
  'accueil',
  'Accueil',
  'Page d''accueil du site BIZELAN',
  'published',
  true,
  'BIZELAN — Structurez et financez votre projet',
  'Cabinet d''accompagnement et de transformation des entreprises. Formations en ligne et conseil sur mesure.',
  now(),
  jsonb_build_array(
    jsonb_build_object(
      'id', 'h1', 'type', 'hero',
      'data', jsonb_build_object(
        'badge', 'Cabinet d''accompagnement et de transformation',
        'title', 'Structurez votre projet. Convainquez vos partenaires.',
        'subtitle', 'BIZELAN accompagne les entreprises et porteurs de projets qui veulent améliorer leur fonctionnement, renforcer leur performance et assurer leur pérennité.',
        'ctaLabel', 'Découvrir les formations',
        'ctaHref', '/formations',
        'secondaryCtaLabel', 'Nos services',
        'secondaryCtaHref', '/services',
        'align', 'left',
        'theme', 'dark'
      )
    ),
    jsonb_build_object('id', 'h2', 'type', 'courseGrid',
      'data', jsonb_build_object('title', 'Nos formations', 'subtitle', 'Des parcours concrets, pensés pour être appliqués immédiatement à votre activité.', 'limit', 3, 'featuredOnly', false)),
    jsonb_build_object('id', 'h3', 'type', 'serviceGrid',
      'data', jsonb_build_object('title', 'Nos services', 'subtitle', 'Un accompagnement sur mesure, du diagnostic à la mise en œuvre.', 'limit', 3)),
    jsonb_build_object(
      'id', 'h4', 'type', 'about',
      'data', jsonb_build_object(
        'eyebrow', 'Notre approche',
        'title', 'Analyser, diagnostiquer, transformer, suivre',
        'text', 'Nous combinons une analyse profonde de la santé organisationnelle, un diagnostic clair des problématiques, des solutions adaptées et un suivi pour garantir la durabilité des résultats.',
        'bullets', jsonb_build_array(
          'Analyse profonde de la santé organisationnelle',
          'Diagnostic clair des problématiques',
          'Solutions adaptées et personnalisées',
          'Suivi pour garantir la durabilité des résultats'
        )
      )
    ),
    jsonb_build_object('id', 'h5', 'type', 'postGrid',
      'data', jsonb_build_object('title', 'Derniers articles', 'subtitle', 'Nos analyses et conseils pour structurer votre activité.', 'limit', 3)),
    jsonb_build_object('id', 'h6', 'type', 'cta',
      'data', jsonb_build_object(
        'title', 'Un projet à structurer ?',
        'text', 'Parlons-en. Le premier échange sert à comprendre où vous en êtes et ce dont vous avez réellement besoin.',
        'ctaLabel', 'Demander un échange',
        'ctaHref', '/contact'
      ))
  )
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Article de blog d'exemple
-- ---------------------------------------------------------------------------
insert into public.bz_posts (slug, title, excerpt, content, category_id, status, featured, reading_minutes, seo_title, seo_description, published_at)
values (
  'pourquoi-projets-agricoles-refuses-financement',
  'Pourquoi tant de projets agricoles se voient refuser un financement',
  'Les institutions de financement ne refusent pas des projets parce qu''ils sont mauvais. Elles refusent des dossiers qui ne permettent pas de décider. Voici la différence.',
  E'## Le problème n''est presque jamais le projet\n\nQuand un porteur de projet agricole essuie un refus, sa première réaction est souvent de croire que son activité n''intéresse pas. Dans la grande majorité des cas, ce n''est pas cela.\n\nUne institution de financement ne cherche pas un projet parfait. Elle cherche un dossier qui lui permet de **décider** : est-ce que cette activité génère assez pour rembourser, et à quelle échéance ?\n\n## Les trois manques qui reviennent systématiquement\n\n### 1. Un coût de revient inconnu\n\nBeaucoup d''exploitations savent ce qu''elles vendent, mais pas ce que leur coûte réellement une unité produite. Sans coût de revient, impossible de prouver une marge — donc impossible de prouver une capacité de remboursement.\n\n### 2. Des prévisions de ventes sans méthode\n\nAnnoncer une croissance de 40 % sans expliquer d''où viennent les clients supplémentaires décrédibilise l''ensemble du dossier. Un plan de ventes crédible part de la capacité de production réelle et des canaux de vente déjà testés.\n\n### 3. Aucune visibilité sur la trésorerie\n\nL''agriculture est saisonnière : les dépenses arrivent avant les recettes. Un dossier qui ne montre pas ce décalage, et comment il est couvert, inquiète immédiatement l''analyste.\n\n## Ce qu''il faut produire\n\nUn dossier qui se défend tient en trois pièces : un diagnostic honnête de l''activité, un modèle financier chiffré (coûts, ventes, trésorerie), et un document de synthèse structuré. C''est exactement la logique du parcours **Plan d''Affaires Agricole**.\n\nCe n''est pas une question de talent en rédaction. C''est une question de méthode.',
  (select id from public.categories where slug = 'business-plan'),
  'published', true, 5,
  'Pourquoi les projets agricoles se voient refuser un financement',
  'Les trois manques qui font échouer un dossier de financement agricole, et comment les corriger.',
  now()
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Code promo de lancement
-- ---------------------------------------------------------------------------
insert into public.coupons (code, description, discount_type, discount_value, active)
values ('LANCEMENT40', 'Offre de lancement -40 %', 'percent', 40, true)
on conflict (code) do nothing;



-- =========================================================================
-- =========================================================================
--
--   SECTION 14 — Devenir administrateur
--
-- =========================================================================
-- =========================================================================
--
-- À EXÉCUTER SÉPARÉMENT, et seulement APRÈS avoir créé votre compte par la
-- page d'inscription du site. Le compte doit exister dans `auth.users` : c'est
-- le déclencheur `bz_on_auth_user_created` qui en fabrique le profil, et rien
-- ne peut le devancer.
--
-- Remplacez l'adresse ci-dessous par la vôtre, puis exécutez le bloc.
--
-- Il désigne le compte par son ADRESSE et non par son identifiant : un UUID se
-- recopie mal, et une faute de frappe y passe inaperçue alors qu'une adresse
-- fausse se voit immédiatement dans le message renvoyé.

do $$
declare
  cible text := 'remplacez-moi@exemple.com';   -- <<<<<< VOTRE ADRESSE ICI
  touches int;
begin
  if cible = 'remplacez-moi@exemple.com' then
    raise notice '§14 ignoree : remplacez d abord l adresse dans le bloc.';
    return;
  end if;

  update public.bz_profiles
     set role = 'admin'
   where lower(email) = lower(cible);

  get diagnostics touches = row_count;

  if touches = 0 then
    raise exception
      'Aucun profil pour %. Creez d abord le compte par la page d inscription du site.', cible;
  end if;

  raise notice 'Compte % promu administrateur.', cible;
end $$;


-- =========================================================================
-- =========================================================================
--
--   SECTION 15 — Vérification
--
-- =========================================================================
-- =========================================================================
--
-- Ce bloc ne modifie rien. Il répond à la seule question qui compte après une
-- installation : est-ce que les protections sont RÉELLEMENT en place ?
--
-- Les deux lignes sur les droits de colonne sont les plus importantes. Elles
-- interrogent `information_schema.column_privileges`, qui développe aussi les
-- privilèges accordés au niveau de la TABLE — c'est ce qui la rend concluante.
-- Pendant plusieurs semaines, ce projet a cru ces deux colonnes protégées
-- parce qu'un `revoke (colonne)` avait été écrit ; il ne faisait rien, et un
-- apprenant inscrit pouvait lire toutes les bonnes réponses des questionnaires
-- et se déclarer un temps de visionnage arbitraire.

with controles as (

  select 1 as ordre,
         'Tables du schema public' as controle,
         count(*)::text as mesure,
         (count(*) >= 25) as ok
    from information_schema.tables
   where table_schema = 'public' and table_type = 'BASE TABLE'

  union all
  select 2,
         'Espaces de stockage attendus',
         count(*)::text || ' / 4',
         count(*) = 4
    from storage.buckets
   where id in ('public-media', 'resources', 'payment-proofs', 'lesson-videos')

  union all
  select 3,
         'Videos de lecon : espace PRIVE',
         coalesce((select case when public then 'PUBLIC' else 'prive' end
                     from storage.buckets where id = 'lesson-videos'), 'absent'),
         coalesce((select not public from storage.buckets where id = 'lesson-videos'), false)

  union all
  -- LA protection n°1 : les bonnes reponses ne doivent jamais sortir.
  select 4,
         'Bonnes reponses (quiz_choices.is_correct) hors de portee du client',
         coalesce(string_agg(distinct grantee, ', '), 'aucun droit accorde'),
         count(*) = 0
    from information_schema.column_privileges
   where table_schema = 'public'
     and table_name   = 'quiz_choices'
     and column_name  = 'is_correct'
     and grantee in ('anon', 'authenticated')

  union all
  -- LA protection n°2 : le temps de visionnage ne doit pas etre auto-declare.
  select 5,
         'Temps de visionnage non inscriptible par le client',
         coalesce(string_agg(distinct grantee || ':' || lower(privilege_type), ', '),
                  'aucun droit accorde'),
         count(*) = 0
    from information_schema.column_privileges
   where table_schema = 'public'
     and table_name   = 'lesson_progress'
     and column_name  = 'watched_seconds'
     and grantee in ('anon', 'authenticated')
     and privilege_type in ('INSERT', 'UPDATE')

  union all
  -- Le client doit tout de meme pouvoir marquer une lecon terminee.
  select 6,
         'Le client peut marquer une lecon terminee',
         count(*)::text || ' droit(s)',
         count(*) >= 2
    from information_schema.column_privileges
   where table_schema = 'public'
     and table_name   = 'lesson_progress'
     and column_name  = 'completed'
     and grantee = 'authenticated'
     and privilege_type in ('INSERT', 'UPDATE')

  union all
  -- Le garde-fou doit reconnaitre un fichier deposé, et NON un format que le
  -- navigateur ne decode pas : sinon le certificat serait retenu a jamais.
  select 7,
         'Garde-fou : .mp4 depose mesurable, .mov non',
         public.bz_lesson_is_measurable(null, 'storage://lesson-videos/2026/a.mp4')::text
           || ' / ' ||
         public.bz_lesson_is_measurable(null, 'storage://lesson-videos/2026/a.mov')::text,
         public.bz_lesson_is_measurable(null, 'storage://lesson-videos/2026/a.mp4')
           and not public.bz_lesson_is_measurable(null, 'storage://lesson-videos/2026/a.mov')

  union all
  select 8,
         'Garde-fou : une iframe YouTube n est pas mesurable',
         public.bz_lesson_is_measurable('youtube', null)::text,
         not public.bz_lesson_is_measurable('youtube', null)

  union all
  select 9,
         'Securite au niveau des lignes activee partout',
         count(*) filter (where not rowsecurity)::text || ' table(s) sans RLS',
         count(*) filter (where not rowsecurity) = 0
    from pg_tables
   where schemaname = 'public'

  union all
  select 10,
         'Ligne unique de parametres du site',
         count(*)::text,
         count(*) = 1
    from public.site_settings
   where id = 1

  union all
  select 11,
         'Administrateur designe',
         coalesce(string_agg(email, ', '), 'AUCUN — executez la §14'),
         count(*) >= 1
    from public.bz_profiles
   where role = 'admin'

  union all
  -- Les trois colonnes de 0012. Sans elles, la console enregistre les reglages
  -- du bouton dans le vide et l'administrateur ne comprend pas pourquoi.
  select 12,
         'Reglages du bouton WhatsApp flottant',
         count(*)::text || ' / 3',
         count(*) = 3
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'site_settings'
     and column_name in ('whatsapp_float_enabled', 'whatsapp_float_message',
                         'whatsapp_float_position')

  union all
  select 13,
         'Contenu de depart (formations publiees)',
         count(*)::text,
         true
    from public.courses
   where status = 'published'

)
select case when ok then 'OK' else '!!  A REGARDER' end as verdict,
       controle,
       mesure
  from controles
 order by ordre;


-- ###########################################################################
--
--   Toutes les lignes doivent porter « OK », sauf la 11 si vous n'avez pas
--   encore exécuté la §14 — ce qui est normal à ce stade, puisque votre compte
--   n'existe pas avant votre première inscription sur le site.
--
--   La ligne 13 n'a pas de verdict : elle compte simplement ce que la §12 a
--   déposé, pour que vous sachiez si le site démarre avec du contenu ou vide.
--
-- ###########################################################################
