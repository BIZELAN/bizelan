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
