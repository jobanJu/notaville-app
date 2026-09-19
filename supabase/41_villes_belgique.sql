-- ============================================================
-- NOTAVILLE — Migration 41 : premières villes belges (Wallonie picarde)
-- ============================================================
--
-- Décision produit : Notaville s'ouvre à la Belgique, en commençant
-- par un seul périmètre bien défini plutôt que les ~262 communes du
-- pays d'un coup -- la Wallonie picarde (arrondissements Ath et
-- Tournai-Mouscron), soit les 23 communes entre Comines-Warneton et
-- Tournai en passant par Ath. Choix cohérent avec le reste de
-- l'implantation transfrontalière de Notaville (Lille/Tourcoing).
--
-- `villes` stockait jusqu'ici uniquement les 34 969 communes
-- françaises (même jeu de données que public/data/villes-fr.json,
-- voir lib/demo/villesFr.js). Aucune colonne "pays" n'existe -- les
-- champs `departement`/`region` sont du texte libre affiché tel quel
-- (app/villes/[code_insee]/page.js), pas validés contre une liste
-- fixe de départements français : on y met donc directement
-- l'équivalent belge (departement = province, region = région belge).
--
-- Identifiant : `code_insee` est une colonne `text` sans contrainte de
-- format (vérifié dans toutes les migrations qui la référencent en
-- clé étrangère), donc pas besoin de la détourner -- on utilise le
-- vrai code INS belge (équivalent du code INSEE, source Statbel /
-- infobox Wikipédia, vérifié le 19/09/2026), préfixé "BE" pour
-- exclure toute collision avec un code INSEE français à 5 chiffres
-- (ex. Tournai = BE57081). C'est le même identifiant que celui ajouté
-- à public/data/villes-fr.json (recherche en mode démo) : les deux
-- doivent rester synchronisés pour toute ville ajoutée à l'avenir.
--
-- Tout le reste (avis, photos, mur de ville, évènements, comparateur,
-- classement, recherche) fonctionne sans aucune adaptation : ce sont
-- des fonctions génériques indexées sur `code_insee`, déjà conçues
-- pour gérer une ville sans aucune statistique "coût de la vie"
-- (l'immense majorité des 34 969 communes françaises n'en ont pas non
-- plus). Les jeux à pool restreint (quiz éclair, devine-la-ville,
-- lib/demo/jeuxVilles.js) ne sont volontairement pas concernés par
-- cette migration : ce pool est limité aux grandes villes avec photo
-- Wikipédia fiable, à élargir séparément si souhaité.
insert into villes (code_insee, nom, departement, region, population) values
  ('BE51004', 'Ath', 'Hainaut', 'Wallonie', 30123),
  ('BE57003', 'Antoing', 'Hainaut', 'Wallonie', 7760),
  ('BE51008', 'Belœil', 'Hainaut', 'Wallonie', 14244),
  ('BE51009', 'Bernissart', 'Hainaut', 'Wallonie', 11894),
  ('BE51012', 'Brugelette', 'Hainaut', 'Wallonie', 3658),
  ('BE57093', 'Brunehaut', 'Hainaut', 'Wallonie', 8105),
  ('BE57018', 'Celles', 'Hainaut', 'Wallonie', 5665),
  ('BE51014', 'Chièvres', 'Hainaut', 'Wallonie', 6899),
  ('BE57097', 'Comines-Warneton', 'Hainaut', 'Wallonie', 18063),
  ('BE51017', 'Ellezelles', 'Hainaut', 'Wallonie', 6001),
  ('BE51067', 'Enghien', 'Hainaut', 'Wallonie', 13734),
  ('BE57027', 'Estaimpuis', 'Hainaut', 'Wallonie', 10424),
  ('BE51019', 'Flobecq', 'Hainaut', 'Wallonie', 3441),
  ('BE51065', 'Frasnes-lez-Anvaing', 'Hainaut', 'Wallonie', 11740),
  ('BE51069', 'Lessines', 'Hainaut', 'Wallonie', 18552),
  ('BE57094', 'Leuze-en-Hainaut', 'Hainaut', 'Wallonie', 13886),
  ('BE57095', 'Mont-de-l''Enclus', 'Hainaut', 'Wallonie', 3720),
  ('BE57096', 'Mouscron', 'Hainaut', 'Wallonie', 58234),
  ('BE57062', 'Pecq', 'Hainaut', 'Wallonie', 5966),
  ('BE57064', 'Péruwelz', 'Hainaut', 'Wallonie', 17113),
  ('BE57072', 'Rumes', 'Hainaut', 'Wallonie', 5186),
  ('BE51068', 'Silly', 'Hainaut', 'Wallonie', 8407),
  ('BE57081', 'Tournai', 'Hainaut', 'Wallonie', 68518)
on conflict (code_insee) do update set
  nom = excluded.nom,
  departement = excluded.departement,
  region = excluded.region,
  population = excluded.population;
