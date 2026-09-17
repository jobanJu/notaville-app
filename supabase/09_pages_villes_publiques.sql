-- ============================================================
-- NOTAVILLE — Migration 09 : fiches ville publiques + correctif de confidentialité
-- À exécuter après 08_defis_recalcul_badges.sql
--
-- Section 11 du cahier des charges : les défis "Vie quotidienne"
-- doivent alimenter une vraie page ville, accessible à tous (y compris
-- sans compte), avec la provenance de chaque donnée (Officiel /
-- Communauté / Estimation). Comme les pages villes, statistiques,
-- comparateurs, guides et conseils doivent rester utilisables SANS
-- compte (section 14), cette page ne doit dépendre d'aucune ligne RLS
-- réservée aux comptes connectés : on l'expose via une fonction
-- security definer, qui ne renvoie jamais que des agrégats.
-- ============================================================

-- ---------- 0. Correctif de confidentialité (important) ----------
-- La policy de la migration 04 ("Les contributions validées sont
-- visibles par tous") ouvrait par erreur la lecture de TOUTES les
-- contributions validées à tout compte connecté, salaires et loyers
-- inclus (donnee_valeur + user_id lisibles directement, en contournant
-- la vue d'agrégation). On la restreint aux seules contributions
-- photo, qui sont les seules à devoir être visibles publiquement pour
-- les votes de défi photo.
drop policy if exists "Les contributions validées sont visibles par tous (pour les défis photo)" on contributions;
create policy "Les contributions photo validées sont visibles par tous"
  on contributions for select to authenticated
  using (statut = 'validee' and type_contribution = 'photo');

-- ---------- 1. Fiche ville complète, en un seul appel, sans exiger de compte ----------
create or replace function public.fiche_ville(p_code_insee text)
returns jsonb as $$
declare
  v_ville record;
  v_note_habitants numeric;
  v_nb_avis_habitants integer;
  v_note_touristes numeric;
  v_nb_avis_touristes integer;
  v_stats jsonb;
begin
  select nom, departement, region, population into v_ville from villes where code_insee = p_code_insee;
  if v_ville is null then
    return null;
  end if;

  select round(avg(note_equivalente)::numeric, 2), count(*)
    into v_note_habitants, v_nb_avis_habitants
  from v_avis_avec_type where ville_code_insee = p_code_insee and est_resident;

  select round(avg(note_equivalente)::numeric, 2), count(*)
    into v_note_touristes, v_nb_avis_touristes
  from v_avis_avec_type where ville_code_insee = p_code_insee and not est_resident;

  select coalesce(jsonb_agg(jsonb_build_object(
      'donnee_cle', s.donnee_cle,
      'valeur', s.valeur,
      'provenance', s.provenance,
      'source_url', s.source_url,
      'date_maj_officielle', s.date_maj_officielle,
      'nb_contributions', s.nb_contributions
    )), '[]'::jsonb)
    into v_stats
  from v_stats_ville_completes s
  where s.ville_code_insee = p_code_insee;

  return jsonb_build_object(
    'code_insee', p_code_insee,
    'nom', v_ville.nom,
    'departement', v_ville.departement,
    'region', v_ville.region,
    'population', v_ville.population,
    'note_habitants', v_note_habitants,
    'nb_avis_habitants', coalesce(v_nb_avis_habitants, 0),
    'note_touristes', v_note_touristes,
    'nb_avis_touristes', coalesce(v_nb_avis_touristes, 0),
    'stats', v_stats,
    'derniere_maj', now()
  );
end;
$$ language plpgsql security definer stable set search_path = public;

grant execute on function public.fiche_ville(text) to anon, authenticated;

-- Recherche de ville pour la page /villes (public, sans compte).
create or replace function public.rechercher_villes(p_terme text, p_limite integer default 10)
returns table (code_insee text, nom text, departement text, region text, population integer) as $$
  select code_insee, nom, departement, region, population
  from villes
  where nom ilike p_terme || '%'
  order by population desc nulls last
  limit p_limite;
$$ language sql stable security definer set search_path = public;

grant execute on function public.rechercher_villes(text, integer) to anon, authenticated;
