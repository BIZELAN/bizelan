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
