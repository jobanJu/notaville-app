-- ============================================================
-- NOTAVILLE — Migration 07 : catalogue complet de défis
-- À exécuter après 06_defis_extension.sql
--
-- Reprend précisément la taxonomie demandée : Découverte, Photo,
-- Patrimoine, Gastronomie, Vie quotidienne, Connaissances, Voyage,
-- Communauté, Défis événementiels — plus les offres partenaires et
-- mini-jeux, volontairement secondaires. Tout ceci reste éditable
-- depuis le Table editor Supabase ou depuis /admin/defis (Phase 1
-- application) sans toucher au code.
-- ============================================================

-- ---------- 1. Réaligne les catégories de la migration 05 sur les noms du cahier des charges ----------
-- icone : clé sobre résolue par components/Icone.js (voir 04_defis_schema.sql).
update categories_defis set nom = 'Découverte', icone = 'compass', type = 'ville', description = 'Explore ta ville et ses quartiers sous un nouvel angle', ordre = 10 where cle = 'vie_de_quartier';
update categories_defis set nom = 'Voyage', icone = 'carte', type = 'voyage', description = 'Note et documente les villes que tu traverses', ordre = 70 where cle = 'exploration_voyage';
update categories_defis set nom = 'Vie quotidienne', icone = 'wallet', type = 'contribution', description = 'Prix, loyers, salaires anonymisés : la donnée la plus utile de Notaville', ordre = 50 where cle = 'donnees_utiles';
update categories_defis set nom = 'Photo', icone = 'camera', type = 'contribution', description = 'Immortalise ta ville, la communauté vote pour les meilleurs clichés', ordre = 20 where cle = 'photo_du_mois';
update categories_defis set nom = 'Offres partenaires', icone = 'cadeau', ordre = 200 where cle = 'offres_partenaires';
update categories_defis set nom = 'Mini-jeux', icone = 'jeu', ordre = 210 where cle = 'mini_jeux';

insert into categories_defis (cle, nom, description, icone, type, ordre) values
  ('patrimoine', 'Patrimoine', 'Monuments, lieux historiques et curiosités architecturales', 'landmark', 'patrimoine', 30),
  ('gastronomie', 'Gastronomie', 'Bonnes adresses et prix réels, du café au restaurant', 'restaurant', 'gastronomie', 40),
  ('connaissances', 'Connaissances', 'Quiz et devinettes sur les villes du monde', 'livre', 'connaissance', 60),
  ('communaute', 'Communauté', 'Complète et améliore les fiches de Notaville', 'utilisateurs', 'communaute', 80),
  ('evenementiel', 'Défis événementiels', 'Défis du moment : jour, semaine, mois et saisons', 'flamme', 'evenementiel', 90)
on conflict (cle) do nothing;

-- ---------- 2. Récompenses supplémentaires, alignées sur les exemples du cahier des charges ----------
insert into parametres_recompenses (cle, valeur, description) values
  ('photo_monument', 100, 'Ajouter une photo dans le défi patrimoine'),
  ('prix_quotidien', 50, 'Renseigner un prix du quotidien (café, bière, transport...)'),
  ('defi_multi_patrimoine', 250, 'Compléter un défi patrimoine multi-étapes'),
  ('salaire_mensuel', 100, 'Renseigner son salaire net mensuel (anonymisé, jamais montré individuellement)'),
  ('quiz_correct', 15, 'Bonne réponse à un quiz')
on conflict (cle) do nothing;

-- ---------- 3. Découverte ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'Découvre ta ville', 'Swipe sur 10 quartiers de ta ville d''origine.', 'Va dans Découvrir et note 10 quartiers.', 'multi_etapes', 'defi_etape', 'facile', 'permanent', now(), null::timestamptz, 10, 5, null from categories_defis where cle = 'vie_de_quartier'
union all
select id, 'Touriste dans ta propre ville', 'Visite et note un lieu de ta ville que tu n''avais jamais vu.', 'Rédige un avis détaillé sur un quartier que tu ne connais pas encore.', 'action_simple', 'avis_detaille', 'facile', 'permanent', now(), null::timestamptz, null::integer, 15, null from categories_defis where cle = 'vie_de_quartier'
union all
select id, 'Explore ta ville à pied', 'Documente une balade à pied dans un quartier peu visité.', 'Ajoute une photo et un avis sur un quartier que tu as exploré à pied.', 'photo', 'defi_photo', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 25, null from categories_defis where cle = 'vie_de_quartier'
union all
select id, 'Découvre un lieu caché', 'Partage un endroit peu connu de ta ville.', 'Ajoute une photo et une courte description du lieu.', 'photo', 'defi_photo', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 30, null from categories_defis where cle = 'vie_de_quartier'
on conflict do nothing;

-- ---------- 4. Photo ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Plus belle vue', 'Montre-nous ta plus belle vue sur ta ville.', 'Ajoute une photo. La communauté vote, le top 10 est mis en avant.', 'photo', 'defi_photo', 'facile', 'permanent', now(), null::timestamptz, 10, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Plus beau coucher de soleil', 'Le plus beau coucher de soleil vu depuis ta ville.', 'Ajoute ta photo, votée par la communauté.', 'photo', 'defi_photo', 'facile', 'permanent', now(), null::timestamptz, 20, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Street art', 'Repère la plus belle fresque ou œuvre de street art de ta ville.', 'Photo + localisation approximative.', 'photo', 'defi_photo', 'facile', 'permanent', now(), null::timestamptz, 30, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Architecture insolite', 'Un bâtiment qui sort de l''ordinaire.', 'Photo + un mot sur ce qui le rend insolite.', 'photo', 'defi_photo', 'moyen', 'permanent', now(), null::timestamptz, 40, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Avant / après d''un lieu', 'Montre l''évolution d''un lieu dans le temps.', 'Deux photos du même endroit, à des dates différentes.', 'photo', 'defi_photo', 'difficile', 'permanent', now(), null::timestamptz, 50, null from categories_defis where cle = 'photo_du_mois'
on conflict do nothing;

-- ---------- 5. Patrimoine ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'Découvrir un monument', 'Ajoute une photo d''un monument de ta ville.', 'Photo + nom du monument.', 'photo', 'photo_monument', 'facile', 'permanent', now(), null::timestamptz, null::integer, 10, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Découvrir un monument méconnu', 'Un monument que peu de gens connaissent.', 'Photo + pourquoi il mérite d''être connu.', 'photo', 'photo_monument', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 20, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Patrimoine industriel', 'Une ancienne usine, friche ou site industriel reconverti.', 'Photo + un mot d''histoire si tu la connais.', 'photo', 'photo_monument', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 30, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Quiz patrimoine', 'Teste tes connaissances sur le patrimoine de ta région.', 'Réponds à la question. Correction automatique.', 'quiz', 'quiz_correct', 'facile', 'permanent', now(), null::timestamptz, null::integer, 40, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Grand Explorateur du patrimoine', 'Défi complet : découvre le patrimoine de ta ville sous toutes ses formes.', 'Complète les étapes ci-dessous.', 'multi_etapes', 'defi_multi_patrimoine', 'difficile', 'permanent', now(), null::timestamptz, 4, 50, null from categories_defis where cle = 'patrimoine'
on conflict do nothing;

-- ---------- 6. Gastronomie ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Trouver le meilleur café', 'Ton café préféré dans ta ville.', 'Ajoute le nom du lieu et un avis rapide.', 'action_simple', 'defi_action_simple', 'facile', 'permanent', now(), null::timestamptz, 10, null from categories_defis where cle = 'gastronomie'
union all
select id, 'Trouver le meilleur restaurant', 'Ton restaurant préféré, avec le rapport qualité/prix.', 'Ajoute le nom du lieu et un avis rapide.', 'action_simple', 'defi_action_simple', 'facile', 'permanent', now(), null::timestamptz, 20, null from categories_defis where cle = 'gastronomie'
union all
select id, 'Renseigne le prix d''une bière', 'Combien coûte une bière pression dans ton bar habituel ?', 'Indique le prix en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 30, 'prix_biere'
from categories_defis where cle = 'gastronomie'
union all
select id, 'Renseigne le prix d''un café', 'Combien coûte un café au comptoir ?', 'Indique le prix en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 40, 'prix_cafe'
from categories_defis where cle = 'gastronomie'
union all
select id, 'Tester une spécialité locale', 'La spécialité culinaire de ta région.', 'Photo ou description + où la trouver.', 'photo', 'defi_photo', 'moyen', 'permanent', now(), null::timestamptz, 50, null from categories_defis where cle = 'gastronomie'
on conflict do nothing;

-- ---------- 7. Vie quotidienne (alimente directement les statistiques de ville) ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Quel est ton loyer ?', 'Loyer mensuel de ton logement actuel (donnée anonyme, jamais montrée individuellement).', 'Indique ton loyer en euros. Affiché uniquement en moyenne, à partir de 5 contributions.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 10, 'loyer_m2'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Quel est ton salaire net mensuel ?', 'Donnée strictement anonyme, jamais affichée à ton nom.', 'Indique ton salaire net mensuel. Seule une moyenne par ville est publiée, à partir de 5 contributions.', 'contribution_donnee', 'salaire_mensuel', 'facile', 'permanent', now(), null::timestamptz, 20, 'salaire_net_mensuel'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte un plein ?', 'Prix payé pour ton dernier plein d''essence.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 30, 'prix_plein'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte un panier de courses ?', 'Un panier de courses hebdomadaire type.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 40, 'panier_courses'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte ton abonnement transport ?', 'Abonnement transports en commun mensuel.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 50, 'abonnement_transport'
from categories_defis where cle = 'donnees_utiles'
on conflict do nothing;

-- ---------- 8. Connaissances (quiz auto-corrigés) ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Devine la population', 'Sauras-tu deviner la population de la ville proposée ?', 'Choisis la bonne fourchette. Correction automatique.', 'quiz', 'quiz_correct', 'facile', 'permanent', now(), null::timestamptz, 10, null from categories_defis where cle = 'connaissances'
union all
select id, 'Quiz de la ville', 'Un quiz express sur ta ville d''origine.', 'Réponds à la question. Correction automatique.', 'quiz', 'quiz_correct', 'facile', 'permanent', now(), null::timestamptz, 20, null from categories_defis where cle = 'connaissances'
on conflict do nothing;

-- Questions de quiz associées (une par défi quiz créé ci-dessus).
insert into defi_quiz (defi_id, question, choix, bonne_reponse)
select d.id, 'Lille se situe dans quelle région ?', array['Hauts-de-France', 'Normandie', 'Grand Est', 'Île-de-France'], 0
from defis d where d.titre = 'Quiz de la ville'
on conflict do nothing;

insert into defi_quiz (defi_id, question, choix, bonne_reponse)
select d.id, 'Population de Lille (ville-centre, hors métropole) ?', array['~ 40 000', '~ 235 000', '~ 900 000', '~ 2 millions'], 1
from defis d where d.titre = 'Devine la population'
on conflict do nothing;

-- ---------- 9. Voyage ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'Première ville étrangère', 'Note ta première ville visitée hors de France.', 'Ajoute un avis détaillé sur une ville étrangère.', 'action_simple', 'avis_detaille', 'facile', 'permanent', now(), null::timestamptz, null::integer, 10, null from categories_defis where cle = 'exploration_voyage'
union all
select id, '5 villes visitées', 'Note 5 villes différentes que tu as visitées.', 'Ajoute un avis détaillé sur 5 villes distinctes.', 'multi_etapes', 'defi_etape', 'moyen', 'permanent', now(), null::timestamptz, 5, 20, null from categories_defis where cle = 'exploration_voyage'
union all
select id, '10 villes visitées', 'Objectif long terme : 10 villes notées.', 'Ajoute un avis détaillé sur 10 villes distinctes.', 'multi_etapes', 'defi_global_palier', 'difficile', 'permanent', now(), null::timestamptz, 10, 30, null from categories_defis where cle = 'exploration_voyage'
union all
select id, 'Compare deux villes que tu connais', 'Rédige un avis mettant en perspective deux villes.', 'Choisis deux villes que tu as visitées et compare-les en quelques lignes dans deux avis.', 'action_simple', 'avis_detaille', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 40, null from categories_defis where cle = 'exploration_voyage'
on conflict do nothing;

-- ---------- 10. Communauté ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Corriger une information', 'Signale une erreur sur une fiche ville ou quartier.', 'Décris l''erreur et la correction proposée.', 'action_simple', 'defi_action_simple', 'facile', 'permanent', now(), null::timestamptz, 10, null from categories_defis where cle = 'communaute'
union all
select id, 'Ajouter un conseil', 'Un conseil utile pour visiter ou vivre dans ta ville.', 'Rédige un conseil en quelques lignes.', 'action_simple', 'defi_action_simple', 'facile', 'permanent', now(), null::timestamptz, 20, null from categories_defis where cle = 'communaute'
union all
select id, 'Donner son avis de touriste', 'Ton avis sur une ville visitée en tant que touriste.', 'Ajoute un avis détaillé, ce n''est pas ta ville d''origine.', 'action_simple', 'avis_detaille', 'facile', 'permanent', now(), null::timestamptz, 30, null from categories_defis where cle = 'communaute'
on conflict do nothing;

-- ---------- 11. Défis événementiels (portée temporelle) ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Défi du jour', 'Ajoute une photo aujourd''hui pour un bonus rapide.', 'Ajoute une photo avant minuit.', 'photo', 'defi_photo', 'facile', 'jour', now(), now() + interval '1 day', 5, null from categories_defis where cle = 'evenementiel'
union all
select id, 'Défi du week-end', 'Explore un quartier que tu ne connais pas ce week-end.', 'Ajoute un avis détaillé avant dimanche minuit.', 'action_simple', 'avis_detaille', 'facile', 'semaine', now(), now() + interval '2 days', 10, null from categories_defis where cle = 'evenementiel'
union all
select id, 'Défi de la semaine', 'Renseigne 3 prix du quotidien cette semaine.', 'Complète 3 défis "Vie quotidienne" avant dimanche.', 'multi_etapes', 'defi_etape', 'moyen', 'semaine', now(), now() + interval '7 days', 15, null from categories_defis where cle = 'evenementiel'
union all
select id, 'Défi du mois', 'Découvre 5 lieux ce mois-ci.', 'Ajoute 5 photos de lieux différents avant la fin du mois.', 'multi_etapes', 'defi_etape', 'moyen', 'mois', now(), now() + interval '30 days', 20, null from categories_defis where cle = 'evenementiel'
on conflict do nothing;

-- Étapes du défi multi-étapes "Grand Explorateur du patrimoine"
insert into defi_etapes (defi_id, ordre, titre, description)
select d.id, s.ordre, s.titre, ''
from defis d
cross join (values
  (1, 'Ajouter 1 photo de monument'),
  (2, 'Découvrir 1 lieu patrimonial méconnu'),
  (3, 'Répondre au quiz patrimoine'),
  (4, 'Ajouter 1 information historique')
) as s(ordre, titre)
where d.titre = 'Grand Explorateur du patrimoine'
on conflict (defi_id, ordre) do nothing;

-- Défi mondial / long terme (section 4 du cahier des charges), sans
-- ville associée (valable partout), sans date de fin.
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'Tour du monde', 'Objectif long terme, sans date limite : documente 10 villes différentes.', 'Publie un avis détaillé sur 10 villes distinctes, où que ce soit dans le monde.', 'multi_etapes', 'defi_global_palier', 'difficile', 'permanent', now(), null::timestamptz, 10, 5, null from categories_defis where cle = 'exploration_voyage'
union all
select id, 'Photographe du monde', 'Ajoute 100 photos à Notaville, dans n''importe quelle ville.', 'Chaque photo validée dans un défi photo compte pour ce palier.', 'multi_etapes', 'defi_global_palier', 'difficile', 'permanent', now(), null::timestamptz, 100, 10, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Expert du coût de la vie', 'Contribue à 50 données de prix (courses, loyer, transport, énergie...).', 'Chaque contribution "Vie quotidienne" validée compte pour ce palier.', 'multi_etapes', 'defi_global_palier', 'difficile', 'permanent', now(), null::timestamptz, 50, 10, null from categories_defis where cle = 'donnees_utiles'
on conflict do nothing;

-- ---------- 12. Badges — liste exacte du cahier des charges ----------
-- icone : clé sobre résolue par components/Icone.js (voir 04_defis_schema.sql).
insert into badges (cle, nom, description, icone) values
  ('citadin', 'Citadin', 'Contribue régulièrement à sa ville d''origine', 'batiment'),
  ('voyageur', 'Voyageur', 'Note des villes visitées', 'valise'),
  ('explorateur', 'Explorateur', 'Découvre des quartiers et lieux peu connus', 'compass'),
  ('photographe', 'Photographe', 'Ajoute des photos validées', 'camera'),
  ('historien', 'Historien', 'Contribue au patrimoine', 'landmark'),
  ('gourmet', 'Gourmet', 'Partage de bonnes adresses gourmandes', 'restaurant'),
  ('expert_cout_vie', 'Expert du coût de la vie', 'Renseigne des prix et données du quotidien', 'wallet'),
  ('contributeur_communaute', 'Contributeur', 'Améliore les fiches de Notaville', 'utilisateurs'),
  ('ambassadeur', 'Ambassadeur', 'Complète des défis multi-étapes d''une ville', 'recompense'),
  ('globe_trotter', 'Globe-trotter', 'Contribue dans plusieurs pays', 'carte')
on conflict (cle) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values ('bronze', 5, 1), ('argent', 20, 2), ('or', 50, 3), ('platine', 150, 4), ('legendaire', 500, 5)) as s(niveau, seuil, ordre)
where b.cle in ('citadin', 'photographe', 'contributeur_communaute')
on conflict (badge_id, niveau) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values ('bronze', 1, 1), ('argent', 5, 2), ('or', 15, 3), ('platine', 40, 4), ('legendaire', 100, 5)) as s(niveau, seuil, ordre)
where b.cle in ('voyageur', 'explorateur', 'ambassadeur', 'globe_trotter')
on conflict (badge_id, niveau) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values ('bronze', 3, 1), ('argent', 10, 2), ('or', 30, 3), ('platine', 100, 4), ('legendaire', 300, 5)) as s(niveau, seuil, ordre)
where b.cle in ('historien', 'gourmet', 'expert_cout_vie')
on conflict (badge_id, niveau) do nothing;

-- Note : ces nouveaux badges ne sont pas encore reliés à
-- recalculer_badges() (migration 04), qui ne connaît que
-- contributeur/chroniqueur/explorateur_defis. Voir
-- 08_defis_recalcul_badges.sql pour la version étendue.
