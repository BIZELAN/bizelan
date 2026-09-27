-- ===========================================================================
-- BIZELAN — Bouton WhatsApp flottant, réglable depuis la console
--
-- Le numéro WhatsApp existait déjà (`site_settings.whatsapp`) et servait au
-- pied de page et à la page Contact. Ce qui manquait : un accès permanent,
-- visible depuis n'importe quelle page.
--
-- Trois réglages, et non un simple interrupteur. Le côté parce qu'un bouton
-- fixé en bas à droite recouvre, sur certains gabarits, le dernier élément
-- d'une colonne ; le message pré-rempli parce qu'un message qui nomme la page
-- d'origine fait gagner un aller-retour à l'équipe ; l'interrupteur parce
-- qu'une campagne peut vouloir concentrer les demandes sur le formulaire.
-- ===========================================================================

alter table public.site_settings
  add column if not exists whatsapp_float_enabled boolean not null default true;

alter table public.site_settings
  add column if not exists whatsapp_float_message text;

alter table public.site_settings
  add column if not exists whatsapp_float_position text not null default 'right';

-- La valeur atterrit dans un nom de classe côté rendu. La contrainte est donc
-- une barrière de sécurité autant qu'une garantie de cohérence : sans elle,
-- une valeur inattendue produirait un bouton sans position, collé au flux.
do $$ begin
  alter table public.site_settings
    add constraint site_settings_whatsapp_float_position_check
    check (whatsapp_float_position in ('left', 'right'));
exception when duplicate_object then null; end $$;

comment on column public.site_settings.whatsapp_float_enabled is
  'Affiche le bouton WhatsApp flottant sur tout le site public.';
comment on column public.site_settings.whatsapp_float_message is
  'Message pré-rempli dans la conversation. Vide = aucun message.';
comment on column public.site_settings.whatsapp_float_position is
  'Coin d''ancrage du bouton : left ou right. Contraint en base.';
