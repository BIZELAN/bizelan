

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
