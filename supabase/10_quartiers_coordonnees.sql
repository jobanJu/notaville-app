-- Remplacement du "swipe façon Tinder" par une carte interactive pour
-- /decouvrir (retour utilisateur : la mécanique de swipe ne plaisait
-- pas). Les quartiers ont donc besoin d'une position géographique.
--
-- Couverture actuelle : seuls les 12 quartiers officiels de Lille
-- (59350) reçoivent de vraies coordonnées ici, en repère approximatif
-- (précision "centre de quartier", pas un relevé GPS) -- suffisant pour
-- afficher des punaises cliquables à la bonne échelle visuelle, mais à
-- affiner plus tard. Les quartiers des 134 autres villes déjà seedées
-- (cf. 00_villes_quartiers.sql) restent sans coordonnées pour l'instant :
-- l'UI (/decouvrir) les propose alors sous forme de liste, sous la carte,
-- plutôt que de les faire disparaître. Étendre la couverture
-- géographique (import IGN/OSM, ou contribution communautaire type
-- "positionne ce quartier") est un travail de Phase 2.

alter table quartiers add column if not exists latitude double precision;
alter table quartiers add column if not exists longitude double precision;

update quartiers set latitude = 50.6407, longitude = 3.0603 where ville_code_insee = '59350' and nom = 'Vieux-Lille';
update quartiers set latitude = 50.6365, longitude = 3.0635 where ville_code_insee = '59350' and nom = 'Lille-Centre';
update quartiers set latitude = 50.6255, longitude = 3.0500 where ville_code_insee = '59350' and nom = 'Vauban-Esquermes';
update quartiers set latitude = 50.6229, longitude = 3.0454 where ville_code_insee = '59350' and nom = 'Wazemmes';
update quartiers set latitude = 50.6231, longitude = 3.0653 where ville_code_insee = '59350' and nom = 'Lille-Moulins';
update quartiers set latitude = 50.6420, longitude = 3.0295 where ville_code_insee = '59350' and nom = 'Bois-Blancs';
update quartiers set latitude = 50.6155, longitude = 3.0400 where ville_code_insee = '59350' and nom = 'Faubourg de Béthune';
update quartiers set latitude = 50.6091, longitude = 3.0503 where ville_code_insee = '59350' and nom = 'Lille-Sud';
update quartiers set latitude = 50.6339, longitude = 3.0827 where ville_code_insee = '59350' and nom = 'Fives';
update quartiers set latitude = 50.6420, longitude = 3.0750 where ville_code_insee = '59350' and nom = 'Saint-Maurice Pellevoisin';
update quartiers set latitude = 50.6280, longitude = 3.1000 where ville_code_insee = '59350' and nom = 'Hellemmes';
update quartiers set latitude = 50.6396, longitude = 3.0102 where ville_code_insee = '59350' and nom = 'Lomme';
