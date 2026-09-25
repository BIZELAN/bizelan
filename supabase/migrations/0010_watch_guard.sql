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
 * Doit rester cohérent avec `isDirectFile` dans `components/account/
 * lesson-player.tsx` : c'est la même question posée des deux côtés, et deux
 * réponses divergentes produiraient un certificat retenu sans raison.
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
    -- 'upload' : fichier hébergé par nos soins, donc toujours mesurable.
    p_provider = 'upload'
    -- 'url' ou absence de fournisseur : mesurable si le lien pointe un média.
    or (
      (p_provider is null or p_provider = 'url')
      and coalesce(p_video_url, '') ~* '\.(mp4|webm|ogg|m3u8)(\?|$)'
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
