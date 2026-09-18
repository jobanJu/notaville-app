-- ============================================================
-- NOTAVILLE — Migration 36 : rééquilibrage des récompenses gratuites
-- ============================================================
--
-- Barème fourni par l'utilisateur pour les actions gratuites (avis,
-- notation, défis, photos...). Contrairement aux Notacoins convertibles
-- (migration 35, adossés à un revenu réel AdGem transaction par
-- transaction), ceux-ci restent la monnaie "pour s'amuser" -- non
-- convertibles, dépensables uniquement en boutique (migration 32/37).
-- Comme ils ne coûtent jamais d'argent réel, il n'y a pas de calcul de
-- marge à faire ici : le seul garde-fou reste les plafonds journaliers
-- déjà en place (limites_anti_abus, inchangés par cette migration), qui
-- limitent le rythme d'obtention plutôt qu'un coût en euros.
--
-- Correspondance entre le barème fourni et les raisons déjà codées :
--   Noter un quartier      → swipe_note            (300, était 10)
--   Noter une ville (avis) → avis_detaille          (500, était 25)
--   Duel (vote)            → vote_duel              (300, était 5)
--   Victoire duel          → duel_gagnant_bonus     (1000, était 15)
--   Photo validée          → defi_photo             (1000, était 15)
--                             photo_monument         (1000, était 100)
--                             photo_ville_libre      (300, était 10 --
--                                                     plus bas : pas de
--                                                     validation par un
--                                                     défi, moins d'effort)
--   Défi patrimoine        → defi_multi_patrimoine  (1000, était 250)
--   Défi quotidien         → prix_quotidien         (500, était 50)
--
-- Volontairement laissés inchangés (hors du barème fourni, ou trop
-- génériques pour un mapping direct) : defi_action_simple, defi_etape,
-- vote_photo, defi_global_palier, les récompenses jeux
-- (jeu_bonne_reponse/jeu_capture_lieu/jeu_ville_mystere_gagnee),
-- ville_visitee_premiere.
--
-- PAS ENCORE IMPLÉMENTÉS (dans le barème fourni mais sans mécanique
-- correspondante dans le code -- nécessitent un vrai développement, pas
-- juste une ligne SQL) : "noter un lieu" (250 NC -- aucune mécanique de
-- notation dédiée aux lieux aujourd'hui), "série 7 jours" (5000 NC),
-- "challenge hebdo" (5000 NC), "gros challenge mensuel" (25000 NC) --
-- ces trois derniers demandent un suivi de séries/périodes qui n'existe
-- pas encore (aucune table de suivi de streak ni de challenge
-- hebdomadaire/mensuel). À construire séparément si voulu.
update parametres_recompenses set valeur = 300,  modifie_le = now() where cle = 'swipe_note';
update parametres_recompenses set valeur = 500,  modifie_le = now() where cle = 'avis_detaille';
update parametres_recompenses set valeur = 300,  modifie_le = now() where cle = 'vote_duel';
update parametres_recompenses set valeur = 1000, modifie_le = now() where cle = 'duel_gagnant_bonus';
update parametres_recompenses set valeur = 1000, modifie_le = now() where cle = 'defi_photo';
update parametres_recompenses set valeur = 1000, modifie_le = now() where cle = 'photo_monument';
update parametres_recompenses set valeur = 300,  modifie_le = now() where cle = 'photo_ville_libre';
update parametres_recompenses set valeur = 1000, modifie_le = now() where cle = 'defi_multi_patrimoine';
update parametres_recompenses set valeur = 500,  modifie_le = now() where cle = 'prix_quotidien';
