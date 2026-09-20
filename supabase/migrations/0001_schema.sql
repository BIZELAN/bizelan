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
