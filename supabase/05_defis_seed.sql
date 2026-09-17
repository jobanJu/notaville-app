-- ============================================================
-- NOTAVILLE — Migration 05 : contenu d'exemple pour les défis
-- À exécuter après 04_defis_schema.sql
--
-- Ces lignes sont un point de départ éditable depuis le Table editor
-- Supabase (aucune n'a besoin d'être modifiée en code). L'ordre des
-- catégories met volontairement en avant ville/voyage/contribution
-- avant partenaire/jeu.
-- ============================================================

-- icone : clé sobre résolue par components/Icone.js côté app (voir la
-- note dans 04_defis_schema.sql) -- plus d'émoji stocké en base.
insert into categories_defis (cle, nom, description, icone, type, ordre) values
  ('vie_de_quartier', 'Vie de quartier', 'Contribue à la connaissance de ton quartier au quotidien', 'batiment', 'ville', 10),
  ('exploration_voyage', 'Exploration & voyage', 'Note et raconte les villes que tu traverses', 'compass', 'voyage', 20),
  ('donnees_utiles', 'Données utiles', 'Coût de la vie, loyers, salaires anonymisés : aide la communauté', 'wallet', 'contribution', 30),
  ('photo_du_mois', 'Photo du mois', 'Partage le meilleur cliché de ta ville, la communauté vote', 'camera', 'contribution', 40),
  ('offres_partenaires', 'Offres partenaires', 'Bons plans ponctuels de partenaires de Notaville', 'cadeau', 'partenaire', 90),
  ('mini_jeux', 'Mini-jeux', 'Quiz et jeux légers sur les villes de France', 'jeu', 'jeu', 100)
on conflict (cle) do nothing;

insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'Note 5 quartiers de ta ville', 'Swipe sur 5 quartiers de ta ville d''origine pour affiner sa fiche.', 'Va dans Découvrir et swipe j''aime/passe sur 5 quartiers de ta ville.', 'multi_etapes', 'defi_etape', now(), null::timestamptz, 5, 10, null
from categories_defis where cle = 'vie_de_quartier'
union all
select id, 'Rédige ton premier avis détaillé', 'Un avis détaillé vaut plus qu''un swipe : partage ce qui est bien et ce qui l''est moins.', 'Rends-toi sur Avis, choisis un quartier et publie ta note avec au moins un point fort et un point faible.', 'action_simple', 'avis_detaille', now(), null::timestamptz, null, 20, null
from categories_defis where cle = 'vie_de_quartier'
union all
select id, 'Note une ville visitée cette année', 'Même à l''étranger : partage ton impression de voyageur sur une ville où tu es passé.', 'Recherche la ville, ajoute un avis détaillé en tant que voyageur (elle ne doit pas être ta ville d''origine).', 'action_simple', 'avis_detaille', now(), null::timestamptz, null, 10, null
from categories_defis where cle = 'exploration_voyage'
union all
select id, 'Défi voyage : 3 villes, 3 pays', 'Objectif long terme, sans date limite : note des villes dans 3 pays différents.', 'Publie un avis détaillé sur au moins une ville dans chacun de 3 pays différents.', 'multi_etapes', 'defi_global_palier', now(), null::timestamptz, 3, 20, null
from categories_defis where cle = 'exploration_voyage'
union all
select id, 'Partage le loyer moyen de ton quartier', 'Donnée 100% anonyme : jamais affichée individuellement, seulement en moyenne à partir de 5 contributions.', 'Indique le loyer au m² que tu payes. Cette donnée n''est jamais montrée à ton nom.', 'contribution_donnee', 'defi_action_simple', now(), null::timestamptz, null, 10, 'loyer_m2'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Photo du mois : ta ville sous son meilleur jour', 'Une photo, votée par la communauté. Les mieux notées sont mises en avant sur la fiche ville.', 'Ajoute une photo avec le nom de la ville. Les autres membres votent, tu ne peux pas voter pour ta propre photo.', 'photo', 'defi_photo', now(), null::timestamptz, null, 10, null
from categories_defis where cle = 'photo_du_mois'
on conflict do nothing;

-- Étapes du défi multi-étapes "Note 5 quartiers de ta ville"
insert into defi_etapes (defi_id, ordre, titre, description)
select d.id, s.ordre, s.titre, ''
from defis d
cross join (values (1, 'Quartier 1'), (2, 'Quartier 2'), (3, 'Quartier 3'), (4, 'Quartier 4'), (5, 'Quartier 5')) as s(ordre, titre)
where d.titre = 'Note 5 quartiers de ta ville'
on conflict (defi_id, ordre) do nothing;

-- ---------- Badges ----------
insert into badges (cle, nom, description, icone) values
  ('contributeur', 'Contributeur', 'Contributions validées (avis, données, photos)', 'recompense'),
  ('chroniqueur', 'Chroniqueur', 'Avis détaillés publiés', 'plume'),
  ('explorateur_defis', 'Explorateur', 'Défis menés jusqu''au bout', 'compass')
on conflict (cle) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values
  ('bronze', 5, 1), ('argent', 20, 2), ('or', 50, 3), ('platine', 150, 4), ('legendaire', 500, 5)
) as s(niveau, seuil, ordre)
where b.cle = 'contributeur'
on conflict (badge_id, niveau) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values
  ('bronze', 3, 1), ('argent', 10, 2), ('or', 30, 3), ('platine', 100, 4), ('legendaire', 300, 5)
) as s(niveau, seuil, ordre)
where b.cle = 'chroniqueur'
on conflict (badge_id, niveau) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values
  ('bronze', 1, 1), ('argent', 5, 2), ('or', 15, 3), ('platine', 40, 4), ('legendaire', 100, 5)
) as s(niveau, seuil, ordre)
where b.cle = 'explorateur_defis'
on conflict (badge_id, niveau) do nothing;
