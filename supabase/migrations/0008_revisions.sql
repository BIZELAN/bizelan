-- ===========================================================================
-- BIZELAN — Historique des révisions
--
-- Une refonte publiée qu'on veut annuler n'a aujourd'hui aucun recours : la
-- composition précédente est écrasée, et `activity_log` note qu'une page a
-- changé sans dire ce qu'elle contenait.
--
-- Choix qui décide de tout : on enregistre l'état D'AVANT chaque écriture.
-- Une révision est donc « ce que la page contenait avant cet enregistrement »,
-- c'est-à-dire exactement ce vers quoi on veut revenir. Enregistrer l'état
-- d'après reviendrait à dupliquer la ligne courante sans rien offrir de plus.
-- ===========================================================================

create table if not exists public.bz_revisions (
  id         uuid primary key default gen_random_uuid(),
  -- 'page' | 'settings'. Une table unique plutôt qu'une par type : la
  -- mécanique est la même, et la première divergence serait une duplication.
  entity     text not null,
  -- Identifiant de la ligne concernée. Texte et non uuid : les réglages du
  -- site portent l'identifiant 1.
  entity_id  text not null,
  -- L'état complet, avant écriture.
  payload    jsonb not null,
  -- Résumé lisible, calculé à l'enregistrement : « 12 blocs, publiée ».
  -- Il évite d'avoir à ouvrir chaque révision pour retrouver la bonne.
  label      text,
  author_id  uuid references public.bz_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint bz_revisions_entity_known check (entity in ('page', 'settings'))
);

create index if not exists bz_revisions_entity_idx
  on public.bz_revisions(entity, entity_id, created_at desc);

alter table public.bz_revisions enable row level security;

drop policy if exists "bz_revisions_admin_all" on public.bz_revisions;
create policy "bz_revisions_admin_all" on public.bz_revisions
  for all using (public.bz_is_admin()) with check (public.bz_is_admin());


-- --- Élagage ---------------------------------------------------------------
-- Une composition de blocs pèse quelques dizaines de kilo-octets. Sans borne,
-- une page retouchée chaque jour pendant un an en accumulerait des centaines.
-- Au-delà de trente états, on ne revient plus en arrière : on repart.
create or replace function public.bz_prune_revisions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.bz_revisions r
   where r.entity = new.entity
     and r.entity_id = new.entity_id
     and r.id not in (
       select id from public.bz_revisions
        where entity = new.entity and entity_id = new.entity_id
        order by created_at desc
        limit 30
     );
  return null;
end;
$$;

drop trigger if exists bz_revisions_prune on public.bz_revisions;
create trigger bz_revisions_prune
  after insert on public.bz_revisions
  for each row execute function public.bz_prune_revisions();
