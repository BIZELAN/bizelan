-- ===========================================================================
-- BIZELAN — Passage de Chariow à SasPay
--
-- Ce changement n'est pas qu'un changement de prestataire : il rend enfin
-- possible ce qui avait été demandé dès le départ et que Chariow ne pouvait
-- pas tenir — encaisser SANS que le client quitte le site.
--
-- SasPay expose un mode « softpay » : une demande de validation est poussée
-- directement sur le téléphone du client, et la page reste ouverte pendant
-- qu'il compose son code. Chariow n'avait qu'une page hébergée, protégée par
-- `frame-ancestors 'none'`, donc impossible à intégrer.
--
-- Seconde conséquence : SasPay encaisse un MONTANT que nous lui dictons.
-- Chariow encaissait le prix de SON produit, ce qui obligeait à apparier
-- chaque formation et privait nos codes promo d'effet. Les deux contraintes
-- disparaissent.
-- ===========================================================================

alter type bz_payment_method add value if not exists 'saspay';

-- Identifiant de paiement SasPay (UUID). Le webhook et l'interrogation de
-- statut s'en servent pour retrouver la commande.
alter table public.orders
  add column if not exists saspay_payment_id text;

create index if not exists orders_saspay_idx on public.orders(saspay_payment_id);

-- Réseau choisi par le client — mtn_bj, moov_bj, celtiis_bj. Conservé pour le
-- service après-vente : « le paiement a échoué » se traite différemment selon
-- l'opérateur, et l'information n'est plus consultable une fois la tentative
-- passée.
alter table public.orders
  add column if not exists saspay_network text;

comment on column public.orders.chariow_sale_id is
  'Historique : ventes encaissées via Chariow avant le passage à SasPay.';


-- --- Journal des livraisons de webhook, rendu générique --------------------
-- `chariow_deliveries` ne servait qu'à un prestataire. La mécanique est
-- identique pour tous : une clé de livraison, insérée en clé primaire, dont
-- l'échec d'insertion signale un rejeu. On la rend donc commune plutôt que
-- d'en créer une par passerelle.
-- Conditionnel pour rester rejouable : une fois renommée, la table n'existe
-- plus sous son ancien nom, et un `alter table public.chariow_deliveries`
-- nu faisait échouer toute nouvelle exécution du fichier.
do $$
begin
  if to_regclass('public.payment_deliveries') is null
     and to_regclass('public.chariow_deliveries') is not null then
    alter table public.chariow_deliveries
      add column if not exists provider text not null default 'chariow';
    alter table public.chariow_deliveries
      rename to payment_deliveries;
  end if;
end
$$;

comment on table public.payment_deliveries is
  'Clés de livraison des webhooks de paiement, pour rejeter les rejeux. '
  'S''appelait chariow_deliveries : la mécanique est commune à toutes les '
  'passerelles.';

create index if not exists payment_deliveries_provider_idx
  on public.payment_deliveries(provider, received_at desc);
