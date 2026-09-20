-- ===========================================================================
-- BIZELAN — Données de départ
-- Reprend le contenu réel de la page « Plan d'Affaires Agricole » (Systeme.io)
-- pour que le site soit immédiatement utilisable après installation.
--
-- À exécuter APRÈS 0001_schema.sql, 0002_rls.sql et 0003_storage.sql.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Paramètres du site
-- ---------------------------------------------------------------------------
update public.site_settings set
  site_name = 'BIZELAN',
  tagline   = 'Cabinet d''accompagnement et de transformation des entreprises',
  email     = 'contactbizelan@gmail.com',
  phone     = '+229 01 97 86 82 89',
  whatsapp  = '22997868289',
  address   = 'BIZELAN, Bénin',
  map_embed_url = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3323.2128546599993!2d2.2194050741007074!3d6.636209993358248!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x660343e51926ba31%3A0xde5aaccfc57bb307!2sBIZELAN!5e1!3m2!1sfr!2sbj!4v1782134739842!5m2!1sfr!2sbj',
  opening_hours = '[
    {"label": "Lundi – Vendredi", "value": "08h – 18h"},
    {"label": "Samedi", "value": "09h – 16h"},
    {"label": "Dimanche", "value": "Fermé"}
  ]'::jsonb,
  bank_transfer_instructions = 'Effectuez votre dépôt Mobile Money au +229 01 97 86 82 89 (MTN / Moov / Celtiis) en indiquant la référence de votre commande, puis validez ci-dessous. Votre accès est ouvert dès vérification, généralement sous quelques heures ouvrées.',
  default_seo_title = 'BIZELAN — Structurez et financez votre projet',
  default_seo_description = 'Cabinet d''accompagnement dédié aux entreprises qui veulent améliorer leur fonctionnement, renforcer leur performance et assurer leur pérennité.',
  announcement = '-40 % sur la formation Plan d''Affaires Agricole — offre de lancement',
  announcement_active = true
where id = 1;

-- ---------------------------------------------------------------------------
-- Catégories
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, kind, position) values
  ('Agriculture & Agrobusiness', 'agriculture', 'course', 1),
  ('Gestion & Finance',          'gestion-finance', 'course', 2),
  ('Conseil',                    'conseil', 'service', 1),
  ('Business Plan',              'business-plan', 'post', 1),
  ('Gestion d''entreprise',      'gestion-entreprise', 'post', 2)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Formation phare : Plan d'Affaires Agricole
-- ---------------------------------------------------------------------------
insert into public.courses (
  slug, title, subtitle, summary, description,
  cover_url, category_id,
  price_cents, compare_at_price_cents, currency, pricing,
  level, duration_label, format_label, access_label,
  what_you_get, outcomes, target_audience, faq,
  status, featured, position, seo_title, seo_description, published_at
) values (
  'plan-affaires-agricole',
  'Plan d''Affaires Agricole',
  'Donnez à votre projet agricole la structure qu''il mérite',
  'Transformez votre activité en un Plan d''Affaires solide, chiffré et présentable — en suivant la méthode étape par étape, avec des cas concrets du secteur agricole.',
  'Ce parcours s''adresse aux porteurs de projets agricoles qui ont déjà démarré leur activité et veulent la structurer pour convaincre un financeur ou un partenaire. En trois phases — Radiographie, Restructuration, Formalisation — vous passez d''une activité qui fonctionne « au feeling » à un Business Plan complet, chiffré et présentable, accompagné d''un plan financier Excel réutilisable.',
  'https://d1yei2z3i6k35z.cloudfront.net/17985501/6a448c888802a6.72536382_ARAF.png',
  (select id from public.categories where slug = 'agriculture'),
  14999, 24999, 'XOF', 'fixed',
  'Tous niveaux',
  '6 à 8 heures de travail dont 3h de visionnage',
  'Séquences vidéo courtes + supports Word, Excel et PowerPoint',
  'Paiement unique · Accès à vie',
  '["6 modules vidéo complets", "1 Template Business Plan", "18 tableurs Excel automatisés", "Accès à vie, depuis téléphone ou ordinateur"]'::jsonb,
  '["Votre Business Plan complet rédigé, structuré, présentable", "Plan financier Excel réutilisable : coûts · ventes · trésorerie · financement", "Certificat de fin de parcours"]'::jsonb,
  '["Vous avez déjà démarré une activité agricole", "Vous voulez structurer ou restructurer votre projet", "Vous visez un financement ou un partenariat", "Vous êtes prêt à travailler sur votre projet"]'::jsonb,
  '[
    {"question": "Dois-je avoir des connaissances en comptabilité ou en gestion ?", "answer": "Non. Tout est expliqué pas à pas, avec des exemples concrets. Aucune base préalable n''est nécessaire."},
    {"question": "Combien de temps faut-il pour suivre la formation ?", "answer": "Comptez entre 6 et 8 heures de travail au total, à votre rythme. Vous pouvez avancer module par module, sans contrainte de calendrier."},
    {"question": "Ai-je besoin d''un ordinateur ?", "answer": "Les vidéos sont accessibles sur smartphone. Pour les tableurs Excel, un ordinateur ou une tablette est recommandé, mais pas obligatoire — certaines applications mobiles permettent aussi de les remplir."},
    {"question": "Cette formation est-elle adaptée à mon secteur agricole précis ?", "answer": "Oui. La méthode s''applique à tous les maillons — production, transformation, commercialisation, ou prestation de service — quel que soit votre secteur."},
    {"question": "Et si je n''arrive pas à terminer seul certains exercices ?", "answer": "Les fiches et tableurs sont conçus pour être autonomes, avec des exemples détaillés à chaque étape. Et les projets les plus engagés pourront accéder à un accompagnement personnalisé annoncé séparément."},
    {"question": "Le paiement est-il sécurisé ?", "answer": "Oui, le paiement se fait directement via opérateur mobile (MTN, Moov, Celtiis). Vérifiez toujours le montant avant de valider."}
  ]'::jsonb,
  'published', true, 1,
  'Formation Plan d''Affaires Agricole — BIZELAN',
  'Construisez un Business Plan agricole solide, chiffré et présentable. 6 modules vidéo, 18 tableurs Excel, template Business Plan. Accès à vie.',
  now()
) on conflict (slug) do nothing;

-- Modules (les 3 phases du parcours)
with c as (select id from public.courses where slug = 'plan-affaires-agricole')
insert into public.course_modules (course_id, title, subtitle, description, position)
select c.id, m.title, m.subtitle, m.description, m.position
from c, (values
  ('Phase 1 — Radiographie', 'Où en est vraiment votre projet',
   'Vous découvrez où en est réellement votre projet aujourd''hui, et les principes de diagnostic qui font la différence entre une activité qui survit et une activité qui convainc un partenaire.', 1),
  ('Phase 2 — Restructuration', 'Stratégie, organisation et chiffres réels',
   'Vous construisez votre stratégie, votre organisation et vos chiffres réels — pour enfin savoir exactement où va votre argent et combien vous gagnez vraiment.', 2),
  ('Phase 3 — Formalisation', 'Votre Business Plan complet',
   'Vous assemblez tout votre travail dans un Business Plan complet, structuré comme ceux que lisent les institutions de financement — qui vous servira de feuille de route.', 3)
) as m(title, subtitle, description, position)
where not exists (select 1 from public.course_modules cm where cm.course_id = c.id);

-- Leçons de la Phase 1
with m as (
  select cm.id from public.course_modules cm
  join public.courses c on c.id = cm.course_id
  where c.slug = 'plan-affaires-agricole' and cm.position = 1
)
insert into public.lessons (module_id, title, slug, description, duration_seconds, is_preview, position)
select m.id, l.title, l.slug, l.description, l.duration, l.is_preview, l.position
from m, (values
  ('L''état réel de votre projet', 'etat-reel-projet',
   'Ce que vous faites bien, ce qui vous freine — sans vous mentir à vous-même.', 900, true, 1),
  ('Ce qui sépare un projet financé d''un projet refusé', 'projet-finance-ou-refuse',
   'Les critères réels qu''appliquent les financeurs avant de dire oui.', 1080, false, 2),
  ('Les 3 questions qui révèlent si votre marché est prêt à payer', 'marche-pret-a-payer',
   'Valider la demande avant d''investir davantage.', 960, false, 3)
) as l(title, slug, description, duration, is_preview, position)
where not exists (select 1 from public.lessons x where x.module_id = m.id);

-- Leçons de la Phase 2
with m as (
  select cm.id from public.course_modules cm
  join public.courses c on c.id = cm.course_id
  where c.slug = 'plan-affaires-agricole' and cm.position = 2
)
insert into public.lessons (module_id, title, slug, description, duration_seconds, is_preview, position)
select m.id, l.title, l.slug, l.description, l.duration, false, l.position
from m, (values
  ('Le calcul de votre coût de revient réel', 'cout-de-revient-reel',
   'Celui que la plupart des porteurs de projet ignorent.', 1200, 1),
  ('Construire un plan de ventes crédible', 'plan-de-ventes-credible',
   'Des projections que les financeurs prennent au sérieux.', 1140, 2),
  ('Le tableau de trésorerie', 'tableau-de-tresorerie',
   'Éviter de se retrouver à sec en pleine campagne.', 1320, 3)
) as l(title, slug, description, duration, position)
where not exists (select 1 from public.lessons x where x.module_id = m.id);

-- Leçons de la Phase 3
with m as (
  select cm.id from public.course_modules cm
  join public.courses c on c.id = cm.course_id
  where c.slug = 'plan-affaires-agricole' and cm.position = 3
)
insert into public.lessons (module_id, title, slug, description, duration_seconds, is_preview, position)
select m.id, l.title, l.slug, l.description, l.duration, false, l.position
from m, (values
  ('Le Business Plan recommandé par les SFD', 'business-plan-sfd',
   'La structure attendue par les institutions de financement et partenaires techniques du secteur agricole.', 1500, 1),
  ('Rédiger un résumé exécutif qui donne envie', 'resume-executif',
   'La première page que lit votre financeur — et souvent la seule.', 900, 2),
  ('Présenter votre projet à l''oral', 'presentation-orale',
   'La méthode pour ne pas perdre votre partenaire en 2 minutes.', 1080, 3)
) as l(title, slug, description, duration, position)
where not exists (select 1 from public.lessons x where x.module_id = m.id);

-- ---------------------------------------------------------------------------
-- Services du cabinet
-- ---------------------------------------------------------------------------
insert into public.services (slug, title, subtitle, summary, description, icon, pricing, price_label, features, process_steps, status, featured, position, published_at)
values
(
  'diagnostic-organisationnel',
  'Diagnostic organisationnel',
  'Comprendre ce qui freine réellement votre entreprise',
  'Une analyse profonde de la santé organisationnelle de votre structure, suivie d''un diagnostic clair des problématiques.',
  'Nous analysons votre organisation — processus, rôles, flux financiers, pilotage — pour identifier précisément ce qui limite votre performance. Vous repartez avec un rapport de diagnostic hiérarchisant les problèmes et les leviers d''action.',
  'stethoscope', 'quote', 'Sur devis',
  '["Analyse profonde de la santé organisationnelle", "Entretiens avec les équipes clés", "Rapport de diagnostic hiérarchisé", "Restitution et plan d''action priorisé"]'::jsonb,
  '[{"title": "Cadrage", "description": "Nous définissons ensemble le périmètre et les objectifs de la mission."},
    {"title": "Collecte", "description": "Entretiens, analyse documentaire et observation de terrain."},
    {"title": "Diagnostic", "description": "Identification et hiérarchisation des problématiques."},
    {"title": "Restitution", "description": "Présentation des conclusions et du plan d''action."}]'::jsonb,
  'published', true, 1, now()
),
(
  'accompagnement-strategique',
  'Accompagnement stratégique',
  'Une transformation suivie dans la durée',
  'Un accompagnement personnalisé pour mettre en œuvre les changements et garantir la durabilité des résultats.',
  'Au-delà du diagnostic, nous vous accompagnons dans la mise en œuvre : structuration des processus, outils de pilotage, montée en compétence de vos équipes, et suivi régulier des indicateurs jusqu''à l''atteinte des résultats.',
  'trending-up', 'quote', 'Sur devis',
  '["Solutions adaptées et personnalisées", "Points de suivi réguliers", "Outils de pilotage sur mesure", "Suivi des résultats dans la durée"]'::jsonb,
  '[{"title": "Feuille de route", "description": "Nous traduisons le diagnostic en chantiers concrets et datés."},
    {"title": "Mise en œuvre", "description": "Accompagnement opérationnel de vos équipes sur chaque chantier."},
    {"title": "Pilotage", "description": "Tableaux de bord et points de suivi mensuels."},
    {"title": "Consolidation", "description": "Transfert de compétences pour que les résultats tiennent sans nous."}]'::jsonb,
  'published', true, 2, now()
),
(
  'montage-plan-affaires',
  'Montage de plan d''affaires',
  'Un dossier prêt à présenter à vos financeurs',
  'Nous construisons avec vous le Business Plan complet de votre projet, chiffré et conforme aux attentes des institutions de financement.',
  'Pour les porteurs de projet qui préfèrent être accompagnés plutôt que de suivre la formation en autonomie : nous rédigeons et chiffrons votre plan d''affaires avec vous, jusqu''au dossier finalisé prêt à déposer.',
  'file-text', 'quote', 'Sur devis',
  '["Étude de marché et positionnement", "Plan financier complet sur 3 ans", "Dossier conforme aux attentes des SFD et partenaires", "Préparation à la soutenance orale"]'::jsonb,
  '[{"title": "Immersion", "description": "Nous prenons connaissance de votre projet en profondeur."},
    {"title": "Chiffrage", "description": "Construction du modèle financier et des hypothèses."},
    {"title": "Rédaction", "description": "Production du dossier complet."},
    {"title": "Préparation", "description": "Entraînement à la présentation devant vos interlocuteurs."}]'::jsonb,
  'published', false, 3, now()
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Landing page de vente (reprise de la page /bp actuelle, en blocs éditables)
-- ---------------------------------------------------------------------------
insert into public.pages (slug, title, description, status, hide_header, course_id, seo_title, seo_description, published_at, blocks)
select
  'bp',
  'Plan d''Affaires Agricole — page de vente',
  'Page de vente de la formation Plan d''Affaires Agricole',
  'published',
  true,
  c.id,
  'Formation Plan d''Affaires Agricole — BIZELAN',
  'Transformez votre activité agricole en un Business Plan solide, chiffré et présentable. -40 % sur l''offre de lancement.',
  now(),
  jsonb_build_array(
    jsonb_build_object(
      'id', 'b1', 'type', 'hero',
      'data', jsonb_build_object(
        'badge', '-40 % de réduction',
        'title', 'Vous avez déjà démarré votre Projet Agricole. Donnez-lui la structure qu''il mérite.',
        'subtitle', 'Transformez votre activité en un Plan d''Affaires solide, chiffré et présentable — en suivant la méthode étape par étape, avec des cas concrets du secteur agricole.',
        'ctaLabel', 'JE REJOINS LA FORMATION',
        'ctaHref', '#offre',
        'align', 'center',
        'theme', 'dark'
      )
    ),
    jsonb_build_object(
      'id', 'b2', 'type', 'painPoints',
      'data', jsonb_build_object(
        'title', 'Vous reconnaissez-vous dans l''une de ces situations ?',
        'items', jsonb_build_array(
          'Vous ne savez pas exactement si votre activité est vraiment rentable.',
          'Vous voulez convaincre un partenaire ou un financeur mais vous n''avez rien de solide à présenter.',
          'Vous sentez que votre projet stagne sans savoir exactement pourquoi.'
        ),
        'imageUrl', 'https://d1yei2z3i6k35z.cloudfront.net/17985501/6a448c888802a6.72536382_ARAF.png'
      )
    ),
    jsonb_build_object(
      'id', 'b3', 'type', 'beforeAfter',
      'data', jsonb_build_object(
        'title', 'Ce qui change avec ce parcours',
        'beforeTitle', 'Avant',
        'afterTitle', 'Après',
        'before', jsonb_build_array(
          'Activité sans direction claire',
          'Chiffres approximatifs ou inexistants',
          'Aucun document à montrer',
          'Stratégie commerciale au feeling'
        ),
        'after', jsonb_build_array(
          'Vision et objectifs précis sur 12 mois',
          'Coûts, rentabilité, seuil calculés',
          'Business Plan complet et présentable',
          'Positionnement clair face au marché'
        )
      )
    ),
    jsonb_build_object(
      'id', 'b4', 'type', 'checklist',
      'data', jsonb_build_object(
        'title', 'Cette formation est faite pour vous si...',
        'items', jsonb_build_array(
          'Vous avez déjà démarré une activité agricole',
          'Vous voulez structurer ou restructurer',
          'Vous visez un financement ou partenariat',
          'Vous êtes prêt à travailler sur votre projet'
        ),
        'imageUrl', 'https://d1yei2z3i6k35z.cloudfront.net/17985501/6a44900356afa7.03241324_ARAF12.png'
      )
    ),
    jsonb_build_object(
      'id', 'b5', 'type', 'phases',
      'data', jsonb_build_object(
        'title', 'Ce que votre projet va subir',
        'items', jsonb_build_array(
          jsonb_build_object(
            'label', 'Phase 1', 'title', 'Radiographie',
            'description', 'Vous allez découvrir où en est vraiment votre projet aujourd''hui, et les principes de diagnostic qui font la différence entre une activité qui survit et une activité qui convainc un partenaire.',
            'bullets', jsonb_build_array(
              'L''état réel de votre projet : ce que vous faites bien, ce qui vous freine, sans vous mentir à vous-même',
              'Ce qui sépare un projet qu''on finance d''un projet qu''on refuse',
              'Les 3 questions qui révèlent si votre marché est vraiment prêt à payer pour votre solution'
            )
          ),
          jsonb_build_object(
            'label', 'Phase 2', 'title', 'Restructuration',
            'description', 'Vous allez construire votre stratégie, votre organisation et vos chiffres réels — pour enfin savoir exactement où va votre argent et combien vous gagnez vraiment.',
            'bullets', jsonb_build_array(
              'Le calcul de votre coût de revient réel — celui que la plupart des porteurs de projet ignorent',
              'Comment construire un plan de ventes crédible que les financeurs prennent au sérieux',
              'Le tableau de trésorerie qui vous évite de vous retrouver à sec en pleine campagne'
            )
          ),
          jsonb_build_object(
            'label', 'Phase 3', 'title', 'Formalisation',
            'description', 'Vous allez assembler tout votre travail dans un Business Plan complet, structuré comme ceux que lisent les institutions de financement — qui va vous servir de feuille de route.',
            'bullets', jsonb_build_array(
              'Le Business Plan recommandé par les SFD et partenaires techniques dans le secteur agricole',
              'Comment rédiger un résumé exécutif qui donne envie de lire la suite',
              'La méthode pour présenter votre projet à l''oral sans perdre votre partenaire en 2 minutes'
            )
          )
        )
      )
    ),
    jsonb_build_object(
      'id', 'b6', 'type', 'features',
      'data', jsonb_build_object(
        'items', jsonb_build_array(
          jsonb_build_object('title', 'Où', 'description', 'En ligne, accessible depuis votre téléphone ou votre ordinateur.', 'icon', 'monitor-smartphone'),
          jsonb_build_object('title', 'Format', 'description', 'Séquences vidéo courtes, et supports Word, Excel, PowerPoint.', 'icon', 'play-circle'),
          jsonb_build_object('title', 'Durée', 'description', '6 à 8 heures au total de travail dont 3h de visionnage.', 'icon', 'clock')
        )
      )
    ),
    jsonb_build_object(
      'id', 'b7', 'type', 'pricing',
      'data', jsonb_build_object(
        'anchor', 'offre',
        'badge', '-40 %',
        'note', 'Paiement unique · Accès à vie',
        'includesTitle', 'Vous aurez accès à :',
        'includes', jsonb_build_array('6 modules vidéo complets', '1 Template Business Plan', '18 tableurs Excel automatisés'),
        'outcomesTitle', 'Vous repartez avec :',
        'outcomes', jsonb_build_array(
          'Votre Business Plan complet rédigé, structuré, présentable',
          'Plan financier Excel réutilisable : coûts · ventes · trésorerie · financement',
          'Certificat de fin de parcours'
        ),
        'ctaLabel', 'Passer au paiement',
        'securityNote', 'Paiement sécurisé par Mobile Money (MTN, Moov, Celtiis)'
      )
    ),
    jsonb_build_object(
      'id', 'b8', 'type', 'quote',
      'data', jsonb_build_object(
        'text', 'Les projets les plus avancés à l''issue de ce parcours pourront être sélectionnés pour un accompagnement personnalisé de 3 mois.',
        'imageUrl', 'https://d1yei2z3i6k35z.cloudfront.net/17985501/6a3931100db3a0.61082558_ChatGPTImage22juin202613_11_211.png',
        'ctaLabel', 'REJOINDRE',
        'ctaHref', '#offre'
      )
    ),
    jsonb_build_object(
      'id', 'b9', 'type', 'about',
      'data', jsonb_build_object(
        'eyebrow', 'Qui sommes-nous ?',
        'title', 'Cabinet BIZELAN',
        'text', 'BIZELAN est un cabinet d''accompagnement et de transformation dédié aux entreprises qui souhaitent améliorer leur fonctionnement, renforcer leur performance et assurer leur pérennité.',
        'bullets', jsonb_build_array(
          'Analyse profonde de la santé organisationnelle',
          'Diagnostic clair des problématiques',
          'Solutions adaptées et personnalisées',
          'Suivi pour garantir la durabilité des résultats'
        )
      )
    ),
    jsonb_build_object(
      'id', 'b10', 'type', 'faq',
      'data', jsonb_build_object(
        'title', 'Les questions fréquentes',
        'useCourseFaq', true,
        'items', jsonb_build_array()
      )
    )
  )
from public.courses c
where c.slug = 'plan-affaires-agricole'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Page d'accueil
-- ---------------------------------------------------------------------------
insert into public.pages (slug, title, description, status, is_home, seo_title, seo_description, published_at, blocks)
values (
  'accueil',
  'Accueil',
  'Page d''accueil du site BIZELAN',
  'published',
  true,
  'BIZELAN — Structurez et financez votre projet',
  'Cabinet d''accompagnement et de transformation des entreprises. Formations en ligne et conseil sur mesure.',
  now(),
  jsonb_build_array(
    jsonb_build_object(
      'id', 'h1', 'type', 'hero',
      'data', jsonb_build_object(
        'badge', 'Cabinet d''accompagnement et de transformation',
        'title', 'Structurez votre projet. Convainquez vos partenaires.',
        'subtitle', 'BIZELAN accompagne les entreprises et porteurs de projets qui veulent améliorer leur fonctionnement, renforcer leur performance et assurer leur pérennité.',
        'ctaLabel', 'Découvrir les formations',
        'ctaHref', '/formations',
        'secondaryCtaLabel', 'Nos services',
        'secondaryCtaHref', '/services',
        'align', 'left',
        'theme', 'dark'
      )
    ),
    jsonb_build_object('id', 'h2', 'type', 'courseGrid',
      'data', jsonb_build_object('title', 'Nos formations', 'subtitle', 'Des parcours concrets, pensés pour être appliqués immédiatement à votre activité.', 'limit', 3, 'featuredOnly', false)),
    jsonb_build_object('id', 'h3', 'type', 'serviceGrid',
      'data', jsonb_build_object('title', 'Nos services', 'subtitle', 'Un accompagnement sur mesure, du diagnostic à la mise en œuvre.', 'limit', 3)),
    jsonb_build_object(
      'id', 'h4', 'type', 'about',
      'data', jsonb_build_object(
        'eyebrow', 'Notre approche',
        'title', 'Analyser, diagnostiquer, transformer, suivre',
        'text', 'Nous combinons une analyse profonde de la santé organisationnelle, un diagnostic clair des problématiques, des solutions adaptées et un suivi pour garantir la durabilité des résultats.',
        'bullets', jsonb_build_array(
          'Analyse profonde de la santé organisationnelle',
          'Diagnostic clair des problématiques',
          'Solutions adaptées et personnalisées',
          'Suivi pour garantir la durabilité des résultats'
        )
      )
    ),
    jsonb_build_object('id', 'h5', 'type', 'postGrid',
      'data', jsonb_build_object('title', 'Derniers articles', 'subtitle', 'Nos analyses et conseils pour structurer votre activité.', 'limit', 3)),
    jsonb_build_object('id', 'h6', 'type', 'cta',
      'data', jsonb_build_object(
        'title', 'Un projet à structurer ?',
        'text', 'Parlons-en. Le premier échange sert à comprendre où vous en êtes et ce dont vous avez réellement besoin.',
        'ctaLabel', 'Demander un échange',
        'ctaHref', '/contact'
      ))
  )
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Article de blog d'exemple
-- ---------------------------------------------------------------------------
insert into public.bz_posts (slug, title, excerpt, content, category_id, status, featured, reading_minutes, seo_title, seo_description, published_at)
values (
  'pourquoi-projets-agricoles-refuses-financement',
  'Pourquoi tant de projets agricoles se voient refuser un financement',
  'Les institutions de financement ne refusent pas des projets parce qu''ils sont mauvais. Elles refusent des dossiers qui ne permettent pas de décider. Voici la différence.',
  E'## Le problème n''est presque jamais le projet\n\nQuand un porteur de projet agricole essuie un refus, sa première réaction est souvent de croire que son activité n''intéresse pas. Dans la grande majorité des cas, ce n''est pas cela.\n\nUne institution de financement ne cherche pas un projet parfait. Elle cherche un dossier qui lui permet de **décider** : est-ce que cette activité génère assez pour rembourser, et à quelle échéance ?\n\n## Les trois manques qui reviennent systématiquement\n\n### 1. Un coût de revient inconnu\n\nBeaucoup d''exploitations savent ce qu''elles vendent, mais pas ce que leur coûte réellement une unité produite. Sans coût de revient, impossible de prouver une marge — donc impossible de prouver une capacité de remboursement.\n\n### 2. Des prévisions de ventes sans méthode\n\nAnnoncer une croissance de 40 % sans expliquer d''où viennent les clients supplémentaires décrédibilise l''ensemble du dossier. Un plan de ventes crédible part de la capacité de production réelle et des canaux de vente déjà testés.\n\n### 3. Aucune visibilité sur la trésorerie\n\nL''agriculture est saisonnière : les dépenses arrivent avant les recettes. Un dossier qui ne montre pas ce décalage, et comment il est couvert, inquiète immédiatement l''analyste.\n\n## Ce qu''il faut produire\n\nUn dossier qui se défend tient en trois pièces : un diagnostic honnête de l''activité, un modèle financier chiffré (coûts, ventes, trésorerie), et un document de synthèse structuré. C''est exactement la logique du parcours **Plan d''Affaires Agricole**.\n\nCe n''est pas une question de talent en rédaction. C''est une question de méthode.',
  (select id from public.categories where slug = 'business-plan'),
  'published', true, 5,
  'Pourquoi les projets agricoles se voient refuser un financement',
  'Les trois manques qui font échouer un dossier de financement agricole, et comment les corriger.',
  now()
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Code promo de lancement
-- ---------------------------------------------------------------------------
insert into public.coupons (code, description, discount_type, discount_value, active)
values ('LANCEMENT40', 'Offre de lancement -40 %', 'percent', 40, true)
on conflict (code) do nothing;
