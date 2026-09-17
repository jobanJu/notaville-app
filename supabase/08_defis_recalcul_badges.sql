-- ============================================================
-- NOTAVILLE — Migration 08 : recalcul de badges étendu
-- À exécuter après 07_defis_catalogue.sql
--
-- Remplace recalculer_badges() (migration 04) pour couvrir les 10
-- badges du cahier des charges, en plus des 3 déjà en place.
-- ============================================================

create or replace function public.recalculer_badges(p_user_id uuid)
returns void as $$
declare
  v_ville_origine text;
  v_nb_contributions integer;
  v_nb_avis integer;
  v_nb_defis_completes integer;
  v_nb_contributions_ville_origine integer;
  v_nb_villes_voyageur integer;
  v_nb_lieux_explores integer;
  v_nb_photos_validees integer;
  v_nb_patrimoine integer;
  v_nb_gastronomie integer;
  v_nb_vie_quotidienne integer;
  v_nb_communaute integer;
  v_nb_multi_etapes_termines integer;
begin
  select ville_origine_code into v_ville_origine from profiles where id = p_user_id;

  select count(*) into v_nb_contributions from contributions where user_id = p_user_id and statut = 'validee';
  select count(*) into v_nb_avis from avis where user_id = p_user_id;
  select count(*) into v_nb_defis_completes from participations where user_id = p_user_id and statut = 'terminee';

  select count(*) into v_nb_contributions_ville_origine
  from contributions where user_id = p_user_id and statut = 'validee' and ville_code_insee = v_ville_origine;

  -- "Voyageur" : villes notées (avis) qui ne sont pas la ville d'origine.
  select count(distinct q.ville_code_insee) into v_nb_villes_voyageur
  from avis a join quartiers q on q.id = a.quartier_id
  where a.user_id = p_user_id and (v_ville_origine is null or q.ville_code_insee <> v_ville_origine);

  select count(distinct quartier_id) into v_nb_lieux_explores
  from (
    select quartier_id from notes where user_id = p_user_id
    union
    select quartier_id from avis where user_id = p_user_id
  ) t;

  select count(*) into v_nb_photos_validees
  from contributions where user_id = p_user_id and statut = 'validee' and type_contribution = 'photo';

  select count(*) into v_nb_patrimoine
  from contributions c join defis d on d.id = c.defi_id join categories_defis cat on cat.id = d.categorie_id
  where c.user_id = p_user_id and c.statut = 'validee' and cat.cle = 'patrimoine';

  select count(*) into v_nb_gastronomie
  from contributions c join defis d on d.id = c.defi_id join categories_defis cat on cat.id = d.categorie_id
  where c.user_id = p_user_id and c.statut = 'validee' and cat.cle = 'gastronomie';

  select count(*) into v_nb_vie_quotidienne
  from contributions c join defis d on d.id = c.defi_id join categories_defis cat on cat.id = d.categorie_id
  where c.user_id = p_user_id and c.statut = 'validee' and cat.cle = 'donnees_utiles';

  select count(*) into v_nb_communaute
  from contributions c join defis d on d.id = c.defi_id join categories_defis cat on cat.id = d.categorie_id
  where c.user_id = p_user_id and c.statut = 'validee' and cat.cle = 'communaute';

  select count(*) into v_nb_multi_etapes_termines
  from participations p join defis d on d.id = p.defi_id
  where p.user_id = p_user_id and p.statut = 'terminee' and d.type_participation = 'multi_etapes';

  insert into profil_badges (user_id, badge_id, niveau_id)
  select p_user_id, bn.badge_id, bn.id
  from badge_niveaux bn
  join badges b on b.id = bn.badge_id
  where
    (b.cle = 'contributeur' and v_nb_contributions >= bn.seuil)
    or (b.cle = 'chroniqueur' and v_nb_avis >= bn.seuil)
    or (b.cle = 'explorateur_defis' and v_nb_defis_completes >= bn.seuil)
    or (b.cle = 'citadin' and v_nb_contributions_ville_origine >= bn.seuil)
    or (b.cle = 'voyageur' and v_nb_villes_voyageur >= bn.seuil)
    or (b.cle = 'explorateur' and v_nb_lieux_explores >= bn.seuil)
    or (b.cle = 'photographe' and v_nb_photos_validees >= bn.seuil)
    or (b.cle = 'historien' and v_nb_patrimoine >= bn.seuil)
    or (b.cle = 'gourmet' and v_nb_gastronomie >= bn.seuil)
    or (b.cle = 'expert_cout_vie' and v_nb_vie_quotidienne >= bn.seuil)
    or (b.cle = 'contributeur_communaute' and v_nb_communaute >= bn.seuil)
    or (b.cle = 'ambassadeur' and v_nb_multi_etapes_termines >= bn.seuil)
    -- "Globe-trotter" : pas encore de données multi-pays réelles (voir
    -- README) — approximé pour l'instant par le nombre de villes
    -- notées en tant que voyageur, comme "Voyageur". À affiner quand
    -- des villes hors France seront couvertes.
    or (b.cle = 'globe_trotter' and v_nb_villes_voyageur >= bn.seuil)
  on conflict (user_id, badge_id, niveau_id) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.recalculer_badges(uuid) to authenticated;
