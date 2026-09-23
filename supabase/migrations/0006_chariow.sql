-- ===========================================================================
-- BIZELAN — Passage de KkiaPay à Chariow
--
-- Différence de nature entre les deux, et c'est elle qui impose ce fichier :
-- KkiaPay encaisse un MONTANT que nous lui dictons. Chariow vend SES PROPRES
-- produits, et c'est le prix du produit Chariow qui fait foi. Chaque formation
-- doit donc être appariée à un produit Chariow, sans quoi aucun paiement n'est
-- possible.
--
-- L'ancienne colonne `kkiapay_transaction_id` est conservée : elle porte
-- l'historique des ventes déjà encaissées, qu'il n'y a aucune raison d'effacer.
-- ===========================================================================

-- `add value` doit être validé avant d'être employé dans une instruction de
-- données. Ce fichier se contente de l'ajouter.
alter type bz_payment_method add value if not exists 'chariow';

-- Identifiant de la vente Chariow (`SALE…`). Le webhook s'en sert pour
-- retrouver la commande, en complément de `custom_metadata`.
alter table public.orders
  add column if not exists chariow_sale_id text;

create index if not exists orders_chariow_idx on public.orders(chariow_sale_id);

comment on column public.orders.kkiapay_transaction_id is
  'Historique : ventes encaissées via KkiaPay avant le passage à Chariow.';

-- Appariement formation ↔ produit Chariow (`prd_…`).
--
-- Sans lui, la formation ne peut pas être vendue : l'API de paiement exige un
-- `product_id` existant côté Chariow. L'administration doit donc renseigner ce
-- champ pour chaque formation payante.
alter table public.courses
  add column if not exists chariow_product_id text;

comment on column public.courses.chariow_product_id is
  'Produit Chariow correspondant (prd_…). Obligatoire pour vendre la formation.';

-- --- Journal des livraisons de webhook ------------------------------------
-- Chariow rejoue un Pulse jusqu'à environ trois heures tant qu'il ne reçoit
-- pas de 2xx. Sans trace des livraisons déjà traitées, un rejeu rouvrirait
-- l'accès et réécrirait la commande. `x-pulse-delivery-id` est l'identifiant
-- stable d'une tentative : il sert de clé d'idempotence.
create table if not exists public.chariow_deliveries (
  delivery_id  text primary key,
  event        text not null,
  sale_id      text,
  received_at  timestamptz not null default now()
);

create index if not exists chariow_deliveries_sale_idx
  on public.chariow_deliveries(sale_id, received_at desc);

alter table public.chariow_deliveries enable row level security;

-- Aucune politique d'ouverture : seule la clé de service écrit et lit cette
-- table. RLS activé sans politique = rien n'est accessible aux autres rôles,
-- ce qui est exactement l'intention.

-- --- Le drapeau d'activation change de nom --------------------------------
-- `payments_kkiapay_enabled` pilotait le paiement en ligne. Le lui laisser
-- pour commander Chariow serait un nom faux, et un nom faux finit par égarer
-- quelqu'un. Le renommer préserve la valeur déjà réglée par l'administration.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'payments_kkiapay_enabled'
  ) then
    alter table public.site_settings
      rename column payments_kkiapay_enabled to payments_online_enabled;
  end if;
end
$$;

-- Filet pour une base qui n'aurait jamais eu l'ancienne colonne.
alter table public.site_settings
  add column if not exists payments_online_enabled boolean not null default true;
