-- ---------- 20. Vie quotidienne : plus de données (loyer T2, prix des activités) ----------
-- Le comparateur (/comparer) n'avait que salaire, loyer au m², bière,
-- café, essence, courses et transport -- pas de vrai loyer de T2 (le
-- "reste à vivre" ne faisait qu'estimer loyer_m2 × 45 m²), et rien sur
-- le prix des loisirs. Ajoute 4 nouvelles donnee_cle, chacune avec son
-- défi de contribution dans "Vie quotidienne", suivant exactement le
-- même schéma que 07_defis_catalogue.sql.

-- 1) Nouveaux défis de contribution.
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Quel est le loyer de ton T2 ?', 'Loyer mensuel réel d''un T2 (donnée anonyme, jamais montrée individuellement).', 'Indique le loyer total en euros pour un T2 (environ 45 m²). Affiché uniquement en moyenne, à partir de 5 contributions.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 15, 'loyer_t2'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte un repas au restaurant ?', 'Prix moyen payé pour un repas complet au restaurant.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 45, 'prix_resto'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte une place de cinéma ?', 'Prix plein tarif d''une place de cinéma dans ta ville.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 55, 'prix_cinema'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte ton abonnement salle de sport ?', 'Abonnement salle de sport mensuel.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 60, 'abonnement_sport'
from categories_defis where cle = 'donnees_utiles'
on conflict do nothing;

-- 2) Bornes de plausibilité (complète la contrainte de 18_bornes_contributions.sql
-- avec les 4 nouvelles donnee_cle -- mêmes valeurs que lib/donnees.js).
alter table contributions drop constraint if exists contributions_donnee_valeur_bornes;

alter table contributions add constraint contributions_donnee_valeur_bornes check (
  donnee_cle is null or donnee_valeur is null or (
    case donnee_cle
      when 'salaire_net_mensuel'  then donnee_valeur between 200 and 15000
      when 'loyer_m2'             then donnee_valeur between 2 and 60
      when 'loyer_t2'             then donnee_valeur between 200 and 3000
      when 'prix_biere'           then donnee_valeur between 0.5 and 15
      when 'prix_cafe'            then donnee_valeur between 0.5 and 8
      when 'prix_plein'           then donnee_valeur between 15 and 150
      when 'prix_resto'           then donnee_valeur between 5 and 100
      when 'prix_cinema'          then donnee_valeur between 3 and 25
      when 'panier_courses'       then donnee_valeur between 5 and 300
      when 'abonnement_transport' then donnee_valeur between 3 and 150
      when 'abonnement_sport'     then donnee_valeur between 5 and 200
      else true -- une future donnee_cle sans borne définie n'est jamais bloquée ici
    end
  )
);
