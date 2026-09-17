-- ---------- 13. Défis précis, propres à une ville ----------
-- Le catalogue de 07_defis_catalogue.sql est volontairement générique
-- ("ta ville") et valable partout (ville_code_insee nul). Ici on ajoute
-- une poignée de défis où le nom de la ville est écrit en toutes lettres
-- dans le titre, et où ville_code_insee est renseigné explicitement --
-- ils n'apparaissent donc que pour cette ville précise, et remontent
-- automatiquement dans la section "Près de chez toi" (DefisHub.js filtre
-- déjà sur `d.ville_code_insee === villeOrigineCode`, aucun changement de
-- code nécessaire). Les libellés restent volontairement factuels /
-- ouverts (on demande une photo ou un avis de l'utilisateur, on n'affirme
-- rien sur un lieu précis) pour ne rien avancer qu'on ne puisse garantir.

-- ---------- Lille (59350) ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, ville_code_insee, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'La plus belle vue en hauteur de Lille', 'Beffroi, toit-terrasse, étage élevé... montre-nous Lille vue de haut.', 'Ajoute une photo prise en hauteur, avec le point de vue en légende. La communauté vote, le top est mis en avant.', 'photo', 'defi_photo', '59350', 'facile', 'permanent', now(), null::timestamptz, null::integer, 60, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Sur les traces du Vieux-Lille', 'Une façade, une rue pavée, un détail d''architecture du Vieux-Lille qui mérite d''être vu.', 'Photo + un mot sur l''endroit exact.', 'photo', 'photo_monument', '59350', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 60, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Ta meilleure adresse gourmande à Lille', 'Un estaminet, une pâtisserie, une spécialité du Nord... ton coup de cœur lillois.', 'Photo du plat ou du lieu + le nom de l''adresse.', 'photo', 'defi_photo', '59350', 'facile', 'permanent', now(), null::timestamptz, null::integer, 60, null from categories_defis where cle = 'gastronomie'
union all
select id, 'Une sortie culturelle à Lille', 'Musée, expo, concert, marché... partage une sortie que tu recommandes à Lille.', 'Rédige un avis détaillé sur cette sortie.', 'action_simple', 'avis_detaille', '59350', 'facile', 'permanent', now(), null::timestamptz, null::integer, 40, null from categories_defis where cle = 'communaute'
on conflict do nothing;

-- ---------- Tourcoing (59599) ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, ville_code_insee, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'La plus belle vue en hauteur de Tourcoing', 'Un point haut, un toit, une terrasse... montre-nous Tourcoing vue de haut.', 'Ajoute une photo prise en hauteur, avec le point de vue en légende. La communauté vote, le top est mis en avant.', 'photo', 'defi_photo', '59599', 'facile', 'permanent', now(), null::timestamptz, null::integer, 70, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Sur les traces du patrimoine textile de Tourcoing', 'Une ancienne filature, une façade industrielle, une trace du passé textile de la ville.', 'Photo + un mot d''histoire si tu la connais.', 'photo', 'photo_monument', '59599', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 70, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Ta meilleure adresse gourmande à Tourcoing', 'Un resto, une friterie, une boulangerie... ton coup de cœur tourquennois.', 'Photo du plat ou du lieu + le nom de l''adresse.', 'photo', 'defi_photo', '59599', 'facile', 'permanent', now(), null::timestamptz, null::integer, 70, null from categories_defis where cle = 'gastronomie'
union all
select id, 'Une sortie culturelle à Tourcoing', 'Expo, spectacle, événement local... partage une sortie que tu recommandes à Tourcoing.', 'Rédige un avis détaillé sur cette sortie.', 'action_simple', 'avis_detaille', '59599', 'facile', 'permanent', now(), null::timestamptz, null::integer, 50, null from categories_defis where cle = 'communaute'
on conflict do nothing;
