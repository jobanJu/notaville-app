-- Exemple de défi de quartier à créer une fois par semaine (à la main,
-- depuis l'éditeur SQL, ou via une tâche planifiée plus tard).
-- Celui-ci reprend l'exemple de la maquette : Wazemmes vs Lille-Moulins.

insert into defis (quartier_a_id, quartier_b_id, debute_le, termine_le)
select qa.id, qb.id, now(), now() + interval '7 days'
from quartiers qa, quartiers qb
where qa.nom = 'Wazemmes' and qa.ville_code_insee = '59350'
  and qb.nom = 'Lille-Moulins' and qb.ville_code_insee = '59350';
