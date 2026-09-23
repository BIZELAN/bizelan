-- ===========================================================================
-- BIZELAN — Vidéos de leçon téléversées depuis l'admin
--
-- Le bucket est PRIVÉ : une vidéo de formation est du contenu payé. Aucune
-- lecture directe n'est ouverte ; la page de leçon signe une URL de courte
-- durée après avoir vérifié l'inscription, comme pour les supports.
--
-- Le téléversement ne passe PAS par l'application. Une route serveur lit
-- aujourd'hui tout le fichier avant de le relayer, ce qui plafonne à la
-- limite de corps de requête de l'hébergeur — de l'ordre de quelques
-- mégaoctets sur Vercel. Le navigateur téléverse donc directement vers le
-- stockage, muni d'une URL signée que l'admin obtient au préalable. La
-- promesse « 100 Mo » des supports de cours relève du même problème et ne
-- tient aujourd'hui qu'en développement local.
-- ===========================================================================

-- Nouveau fournisseur : la vidéo est hébergée chez nous.
-- `lessons.video_id` porte alors le CHEMIN dans le bucket, et non un
-- identifiant distant.
--
-- `add value` doit être validé avant d'être employé dans une instruction de
-- données. Ce fichier se contente de l'ajouter : aucune ligne n'utilise
-- 'upload' ici.
alter type bz_video_provider add value if not exists 'upload';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('lesson-videos', 'lesson-videos', false, 2147483648,
    array['video/mp4','video/webm','video/ogg','video/quicktime','video/x-matroska'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Seule l'administration écrit. La lecture passe par une URL signée émise
-- côté serveur : aucune politique de select n'est ouverte ici, volontairement.
drop policy if exists "bz_lesson_videos_admin_all" on storage.objects;
create policy "bz_lesson_videos_admin_all" on storage.objects
  for all using (bucket_id = 'lesson-videos' and public.bz_is_admin())
  with check (bucket_id = 'lesson-videos' and public.bz_is_admin());
