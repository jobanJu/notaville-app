-- ---------- 18. Bornes de plausibilité sur les contributions "Vie quotidienne" ----------
-- Garde-fou anti-abus, en complément des limites journalières de
-- 03_renommage_duels_notacoins.sql (limites_anti_abus) : celles-ci
-- limitent le NOMBRE de contributions par jour, mais rien n'empêchait
-- jusqu'ici une valeur absurde (0€ de loyer, 999999€ de salaire) de
-- fausser une moyenne de ville. Les mêmes bornes sont déjà appliquées
-- côté interface (lib/donnees.js) -- cette contrainte est la version
-- appliquée en base, pour qu'un appel direct à l'API ne puisse pas les
-- contourner.
alter table contributions drop constraint if exists contributions_donnee_valeur_bornes;

alter table contributions add constraint contributions_donnee_valeur_bornes check (
  donnee_cle is null or donnee_valeur is null or (
    case donnee_cle
      when 'salaire_net_mensuel' then donnee_valeur between 200 and 15000
      when 'loyer_m2'            then donnee_valeur between 2 and 60
      when 'prix_biere'          then donnee_valeur between 0.5 and 15
      when 'prix_cafe'           then donnee_valeur between 0.5 and 8
      when 'prix_plein'          then donnee_valeur between 15 and 150
      when 'panier_courses'      then donnee_valeur between 5 and 300
      when 'abonnement_transport' then donnee_valeur between 3 and 150
      else true -- une future donnee_cle sans borne définie n'est jamais bloquée ici
    end
  )
);
