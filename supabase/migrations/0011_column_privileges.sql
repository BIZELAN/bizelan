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
