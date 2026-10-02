-- ===========================================================================
-- BIZELAN — Évolutions d'octobre 2026
--
--   A. Médiathèque : tout type de fichier, vidéos comprises, et miniatures
--   B. Présentations par blocs : formations, services, produits, articles
--   C. Rareté : compte à rebours et quantité restante
--   D. Miniatures des vidéos de leçon et de présentation
--   E. Certificats : formation certifiante ou non, demande par l'apprenant,
--      modèle configurable
--
-- Idempotent : peut être rejoué sans effet de bord.
-- ===========================================================================


-- ===========================================================================
-- A. MÉDIATHÈQUE
-- ===========================================================================

-- Le bucket public n'acceptait que cinq formats d'image et la vidéo MP4,
-- jusqu'à 10 Mo. Il reçoit désormais tout fichier, jusqu'à 2 Go : vidéos de
-- fond de bloc, PDF à offrir, audio, archives. La limite effective reste celle
-- du projet Supabase (Settings > Storage), qui peut être plus basse.
update storage.buckets
   set allowed_mime_types = null,
       file_size_limit    = 2147483648
 where id = 'public-media';

-- Miniature d'une vidéo de la médiathèque (image choisie ou téléversée).
alter table public.media
  add column if not exists poster_url text;

create index if not exists media_created_idx on public.media(created_at desc);


-- ===========================================================================
-- B. PRÉSENTATIONS PAR BLOCS
-- ===========================================================================

-- Même format que `pages.blocks` : un tableau `{ id, type, data, style? }`.
-- Vide, la page publique retombe sur l'ancienne présentation riche
-- (`description` ou `content`), qui reste en base : rien n'est perdu.
alter table public.courses  add column if not exists blocks jsonb not null default '[]'::jsonb;
alter table public.services add column if not exists blocks jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists blocks jsonb not null default '[]'::jsonb;
alter table public.posts    add column if not exists blocks jsonb not null default '[]'::jsonb;


-- ===========================================================================
-- C. RARETÉ — COMPTE À REBOURS ET QUANTITÉ RESTANTE
-- ===========================================================================

do $$
declare
  t text;
begin
  foreach t in array array['courses', 'services', 'products'] loop
    execute format('alter table public.%I add column if not exists countdown_ends_at timestamptz', t);
    execute format('alter table public.%I add column if not exists countdown_label text', t);
    -- Vrai : l'offre n'est plus achetable une fois le compte à rebours écoulé.
    -- Faux : seul le compteur disparaît (fin d'une promotion, par exemple).
    execute format('alter table public.%I add column if not exists countdown_closes_sale boolean not null default false', t);
    -- Nul : quantité illimitée, rien n'est affiché.
    execute format('alter table public.%I add column if not exists stock_remaining int', t);
    execute format('alter table public.%I add column if not exists stock_label text', t);
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['courses', 'services', 'products'] loop
    begin
      execute format(
        'alter table public.%I add constraint %I check (stock_remaining is null or stock_remaining >= 0)',
        t, t || '_stock_remaining_check');
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Décompte d'une vente, atomique : deux paiements simultanés ne peuvent pas
-- vendre la même dernière place. Sans quantité (nulle), rien ne bouge.
create or replace function public.bz_consume_stock(p_kind text, p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_kind = 'course' then
    update public.courses set stock_remaining = greatest(stock_remaining - 1, 0)
     where id = p_id and stock_remaining is not null;
  elsif p_kind = 'product' then
    update public.products set stock_remaining = greatest(stock_remaining - 1, 0)
     where id = p_id and stock_remaining is not null;
  end if;
end;
$$;

-- Appelée uniquement par le serveur (clé de service) après encaissement.
revoke all on function public.bz_consume_stock(text, uuid) from public, anon, authenticated;


-- ===========================================================================
-- D. MINIATURES DES VIDÉOS
-- ===========================================================================

alter table public.lessons
  add column if not exists video_poster_url text;

alter table public.courses
  add column if not exists promo_video_poster_url text;


-- ===========================================================================
-- E. CERTIFICATS
-- ===========================================================================

-- Une formation peut ne pas être certifiante (atelier, contenu offert…).
-- Vrai par défaut : les formations existantes gardent leur certificat.
alter table public.courses
  add column if not exists certificate_enabled boolean not null default true;

-- Nom imprimé, choisi par l'apprenant au moment de la demande — souvent plus
-- complet que celui du profil (« Koffi » contre « Koffi Mensah AHOUANDJINOU »).
alter table public.enrollments
  add column if not exists certificate_name text;
alter table public.enrollments
  add column if not exists certificate_issued_at timestamptz;

-- Modèle du certificat : signataire, mentions, couleurs (voir
-- `src/lib/certificate.ts`). Un objet vide donne le modèle par défaut.
alter table public.site_settings
  add column if not exists certificate jsonb not null default '{}'::jsonb;

-- Le certificat n'est plus délivré d'office à la fin du parcours : c'est
-- l'apprenant qui le DEMANDE, en confirmant le nom à imprimer. La fonction
-- reste — le recalcul de progression et la correction des QCM l'appellent —
-- mais elle ne délivre plus rien. Les certificats déjà délivrés sont intacts.
create or replace function public.bz_refresh_enrollment_certificate(p_user uuid, p_course uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  return;
end;
$$;

-- Demande de certificat par l'apprenant connecté.
-- Renvoie `{ ok, code }` ou `{ ok: false, reason }`.
create or replace function public.bz_request_certificate(p_course uuid, p_name text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_name    text := nullif(btrim(coalesce(p_name, '')), '');
  v_enabled boolean;
  v_row     public.enrollments%rowtype;
  v_code    text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'auth');
  end if;

  if v_name is null or char_length(v_name) < 3 then
    return jsonb_build_object('ok', false, 'reason', 'name');
  end if;
  v_name := left(v_name, 120);

  select certificate_enabled into v_enabled from public.courses where id = p_course;
  if not coalesce(v_enabled, false) then
    return jsonb_build_object('ok', false, 'reason', 'not_certifying');
  end if;

  select * into v_row from public.enrollments
   where user_id = v_user and course_id = p_course and state in ('active', 'completed')
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_enrolled');
  end if;

  -- Déjà délivré : on renvoie le même code. Le nom peut encore être corrigé
  -- (faute de frappe) sans changer le numéro, déjà communiqué peut-être.
  if v_row.certificate_code is not null then
    update public.enrollments
       set certificate_name = v_name,
           certificate_issued_at = coalesce(certificate_issued_at, completed_at, now())
     where id = v_row.id;
    return jsonb_build_object('ok', true, 'code', v_row.certificate_code);
  end if;

  if v_row.progress_percent < 100 then
    return jsonb_build_object('ok', false, 'reason', 'progress');
  end if;

  if not public.bz_enrollment_certificate_ok(v_user, p_course) then
    return jsonb_build_object('ok', false, 'reason', 'conditions');
  end if;

  v_code := 'BZ-CERT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  update public.enrollments
     set certificate_code      = v_code,
         certificate_name      = v_name,
         certificate_issued_at = now()
   where id = v_row.id;

  return jsonb_build_object('ok', true, 'code', v_code);
end;
$$;

revoke all on function public.bz_request_certificate(uuid, text) from public, anon;
grant execute on function public.bz_request_certificate(uuid, text) to authenticated;

-- Les certificats délivrés avant cette migration : la date de délivrance
-- est celle de fin de parcours, comme l'affichait déjà le certificat.
update public.enrollments
   set certificate_issued_at = coalesce(completed_at, updated_at)
 where certificate_code is not null and certificate_issued_at is null;
