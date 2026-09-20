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
