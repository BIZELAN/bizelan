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
revoke update (watched_seconds) on public.lesson_progress from authenticated;
revoke update (watched_seconds) on public.lesson_progress from anon;

-- L'INSERT doit l'être aussi. `progress_insert_own` autorise l'apprenant à
-- créer la ligne de sa propre progression : sans ce retrait, il lui suffirait
-- d'insérer une leçon jamais ouverte avec `watched_seconds` déjà au plafond.
revoke insert (watched_seconds) on public.lesson_progress from authenticated;
revoke insert (watched_seconds) on public.lesson_progress from anon;


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
    where e.user_id = v_user and e.course_id = p_course
      -- 'completed' compte : le déclencheur de progression y bascule
      -- l'inscription dès que toutes les leçons sont cochées, et c'est
      -- précisément l'apprenant qu'il faut pouvoir continuer à mesurer.
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
          -- 'completed' compte : le déclencheur de progression y bascule
          -- l'inscription dès que toutes les leçons sont cochées, et c'est
          -- précisément l'apprenant qu'il faut pouvoir continuer à mesurer.
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
revoke select (is_correct) on public.quiz_choices from authenticated;
revoke select (is_correct) on public.quiz_choices from anon;


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
    where e.user_id = v_user and e.course_id = v_course
      -- 'completed' compte : le déclencheur de progression y bascule
      -- l'inscription dès que toutes les leçons sont cochées, et c'est
      -- précisément l'apprenant qu'il faut pouvoir continuer à mesurer.
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
-- Supprimée puis recréée, et non remplacée : 0010 lui ajoute une colonne, et
-- `create or replace view` refuse de retirer une colonne existante. Sans
-- cela, rejouer ce fichier après 0010 échouait.
drop view if exists public.bz_learner_watch_stats;
create view public.bz_learner_watch_stats as
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
