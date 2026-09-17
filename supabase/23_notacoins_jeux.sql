-- ============================================================
-- NOTAVILLE — Migration 23 : Notacoins pour les jeux, tableau de
-- distribution public, et fermeture d'une faille sur le crédit direct.
-- À exécuter après 22_lieux_proches.sql.
-- ============================================================

-- ---------- 1. Nouvelles raisons de gain (jeux) ----------
-- Montants volontairement modestes comparés aux vraies contributions
-- (avis = 25, défi simple = 20) : les jeux sont un bonus ludique, pas le
-- moyen principal de gagner des Notacoins, pour ne pas dévaluer les
-- contributions réelles au site.
insert into parametres_recompenses (cle, valeur, description) values
  ('jeu_bonne_reponse',        2, 'Bonne réponse dans un jeu de culture générale (Devine la ville, Quiz éclair, Plus cher ou moins cher)'),
  ('jeu_capture_lieu',         3, 'Attraper un lieu en vrai dans la Chasse aux lieux'),
  ('jeu_ville_mystere_gagnee', 15, 'Deviner la Ville mystère du jour')
on conflict (cle) do update set valeur = excluded.valeur, description = excluded.description;

insert into limites_anti_abus (raison, max_par_jour) values
  ('jeu_bonne_reponse', 60),
  ('jeu_capture_lieu', 20),
  ('jeu_ville_mystere_gagnee', 1)
on conflict (raison) do update set max_par_jour = excluded.max_par_jour;

-- ---------- 2. Rééquilibrage de deux plafonds existants ----------
-- defi_action_simple (50/jour) : un "défi" est censé être une action
-- délibérée, pas une action répétable 50 fois par jour (1000 Notacoins/j
-- serait plus que n'importe quelle autre source) -- ramené à 8/jour.
-- swipe_note (200/jour) : action la plus rapide et la moins engageante
-- du site, plafond ramené à 100/jour pour rester généreux sans en faire
-- la source de revenu dominante face à un avis détaillé.
update limites_anti_abus set max_par_jour = 8 where raison = 'defi_action_simple';
update limites_anti_abus set max_par_jour = 100 where raison = 'swipe_note';

-- ---------- 3. Ferme l'accès direct à crediter_notacoins ----------
-- Jusqu'ici cette fonction était appelable telle quelle par n'importe
-- quel client connecté (privilège par défaut de Postgres sur une
-- fonction fraîchement créée), avec un user_id ET une raison libres --
-- une faille qui permettait à quiconque de se créditer n'importe quel
-- montant du barème en boucle (ex : defi_global_palier ou
-- duel_gagnant_bonus, qui n'ont pas de plafond anti-abus puisqu'ils ne
-- sont normalement JAMAIS appelés directement par un client). On revient
-- à l'usage prévu : seuls les triggers serveur (qui l'appellent en
-- interne, sans avoir besoin du privilège EXECUTE) et la fonction
-- ci-dessous peuvent créditer des Notacoins.
revoke execute on function public.crediter_notacoins(uuid, text, text, bigint) from public, anon, authenticated;

-- ---------- 4. Point d'entrée sûr pour les jeux ----------
-- Le user_id vient TOUJOURS de auth.uid() (jamais d'un paramètre client),
-- et seules ces trois raisons peuvent être créditées ici -- impossible
-- d'appeler cette fonction pour s'octroyer, par exemple, un
-- defi_global_palier ou de créditer le compte de quelqu'un d'autre.
create or replace function public.crediter_notacoins_jeu(p_raison text)
returns integer as $$
begin
  if p_raison not in ('jeu_bonne_reponse', 'jeu_capture_lieu', 'jeu_ville_mystere_gagnee') then
    raise exception 'raison de jeu invalide : %', p_raison;
  end if;
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  return public.crediter_notacoins(auth.uid(), p_raison, 'jeux', null);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.crediter_notacoins_jeu(text) to authenticated;

-- ---------- 5. Vue publique : tableau de distribution des Notacoins ----------
-- Sert la page /notacoins (à côté de /cgu, voir Footer.js) : la liste
-- des gains ET des plafonds anti-abus, dans une seule vue, lisible sans
-- jointure côté app. Triée par montant décroissant pour l'affichage.
create or replace view v_bareme_notacoins as
select
  r.cle,
  r.valeur,
  r.description,
  l.max_par_jour
from parametres_recompenses r
left join limites_anti_abus l on l.raison = r.cle
order by r.valeur desc;

grant select on v_bareme_notacoins to anon, authenticated;
