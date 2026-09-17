-- ---------- 24. Niveau de prix des lieux (€ / €€ / €€€) ----------
-- Ajouté pour la nouvelle page /decouvrir : recherche d'un lieu par
-- mot-clé + proximité, avec une fourchette de prix affichée. Optionnel
-- et déclaratif (comme le reste des infos de `lieux`) -- pas de calcul
-- automatique à partir des avis, ça vit sa vie comme `type` ou
-- `description`.
alter table lieux add column if not exists niveau_prix smallint check (niveau_prix between 1 and 3);

-- `rechercher_lieux` (19_recherche_lieux.sql) et `lieux_proches`
-- (22_lieux_proches.sql) remplacées pour renvoyer aussi niveau_prix --
-- signatures inchangées, donc rien à changer côté RLS/grants déjà en
-- place, seul le corps des fonctions change.
create or replace function rechercher_lieux(p_terme text, p_limite integer default 30, p_code_insee text default null)
returns table (
  id integer,
  nom text,
  type text,
  description text,
  latitude double precision,
  longitude double precision,
  quartier_nom text,
  ville_nom text,
  note_moyenne numeric,
  nb_avis bigint,
  niveau_prix smallint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id, l.nom, l.type, l.description,
    coalesce(l.latitude, q.latitude) as latitude,
    coalesce(l.longitude, q.longitude) as longitude,
    q.nom as quartier_nom,
    v.nom as ville_nom,
    coalesce(n.note_moyenne, 0) as note_moyenne,
    coalesce(n.nb_avis, 0) as nb_avis,
    l.niveau_prix
  from lieux l
  join quartiers q on q.id = l.quartier_id
  join villes v on v.code_insee = q.ville_code_insee
  left join v_lieux_notes n on n.lieu_id = l.id
  where l.actif = true
    and (p_code_insee is null or v.code_insee = p_code_insee)
    and (
      unaccent(l.nom) ilike unaccent('%' || p_terme || '%')
      or unaccent(coalesce(l.description, '')) ilike unaccent('%' || p_terme || '%')
      or unaccent(l.type) ilike unaccent('%' || p_terme || '%')
    )
  order by n.nb_avis desc nulls last, n.note_moyenne desc nulls last, l.created_at desc
  limit p_limite;
$$;

create or replace function lieux_proches(p_lat double precision, p_lon double precision, p_rayon_km double precision default 5, p_limite integer default 30)
returns table (
  id integer,
  nom text,
  type text,
  description text,
  latitude double precision,
  longitude double precision,
  quartier_nom text,
  ville_nom text,
  note_moyenne numeric,
  nb_avis bigint,
  distance double precision,
  niveau_prix smallint
)
language sql
stable
security definer
set search_path = public
as $$
  with lieux_coords as (
    select
      l.id, l.nom, l.type, l.description,
      coalesce(l.latitude, q.latitude) as latitude,
      coalesce(l.longitude, q.longitude) as longitude,
      q.nom as quartier_nom,
      v.nom as ville_nom,
      coalesce(n.note_moyenne, 0) as note_moyenne,
      coalesce(n.nb_avis, 0) as nb_avis,
      l.niveau_prix
    from lieux l
    join quartiers q on q.id = l.quartier_id
    join villes v on v.code_insee = q.ville_code_insee
    left join v_lieux_notes n on n.lieu_id = l.id
    where l.actif = true
  ),
  avec_distance as (
    select
      *,
      6371 * 2 * asin(
        sqrt(
          sin(radians(latitude - p_lat) / 2) ^ 2
          + cos(radians(p_lat)) * cos(radians(latitude))
            * sin(radians(longitude - p_lon) / 2) ^ 2
        )
      ) as distance
    from lieux_coords
    where latitude is not null and longitude is not null
  )
  select id, nom, type, description, latitude, longitude, quartier_nom, ville_nom, note_moyenne, nb_avis, distance, niveau_prix
  from avec_distance
  where distance <= p_rayon_km
  order by distance asc
  limit p_limite;
$$;

-- Nouvelle fonction : mot-clé ET proximité en un seul appel -- utilisée
-- par /decouvrir (recherche géolocalisée d'entrée de page, plutôt que
-- de rapatrier tous les résultats nationaux puis trier côté client
-- comme fait /recherche). Sans position (p_lat/p_lon nuls), se comporte
-- comme rechercher_lieux (recherche nationale, triée par popularité).
create or replace function rechercher_lieux_proches(
  p_terme text,
  p_lat double precision default null,
  p_lon double precision default null,
  p_rayon_km double precision default 15,
  p_limite integer default 30
)
returns table (
  id integer,
  nom text,
  type text,
  description text,
  latitude double precision,
  longitude double precision,
  quartier_nom text,
  ville_nom text,
  note_moyenne numeric,
  nb_avis bigint,
  distance double precision,
  niveau_prix smallint
)
language sql
stable
security definer
set search_path = public
as $$
  with trouves as (
    select
      l.id, l.nom, l.type, l.description,
      coalesce(l.latitude, q.latitude) as latitude,
      coalesce(l.longitude, q.longitude) as longitude,
      q.nom as quartier_nom,
      v.nom as ville_nom,
      coalesce(n.note_moyenne, 0) as note_moyenne,
      coalesce(n.nb_avis, 0) as nb_avis,
      l.niveau_prix
    from lieux l
    join quartiers q on q.id = l.quartier_id
    join villes v on v.code_insee = q.ville_code_insee
    left join v_lieux_notes n on n.lieu_id = l.id
    where l.actif = true
      and (
        unaccent(l.nom) ilike unaccent('%' || p_terme || '%')
        or unaccent(coalesce(l.description, '')) ilike unaccent('%' || p_terme || '%')
        or unaccent(l.type) ilike unaccent('%' || p_terme || '%')
      )
  ),
  avec_distance as (
    select
      *,
      case
        when p_lat is null or p_lon is null or latitude is null or longitude is null then null
        else 6371 * 2 * asin(
          sqrt(
            sin(radians(latitude - p_lat) / 2) ^ 2
            + cos(radians(p_lat)) * cos(radians(latitude))
              * sin(radians(longitude - p_lon) / 2) ^ 2
          )
        )
      end as distance
    from trouves
  )
  select id, nom, type, description, latitude, longitude, quartier_nom, ville_nom, note_moyenne, nb_avis, distance, niveau_prix
  from avec_distance
  where p_lat is null or p_lon is null or distance is null or distance <= p_rayon_km
  order by
    case when p_lat is not null and p_lon is not null then distance end asc nulls last,
    nb_avis desc nulls last,
    note_moyenne desc nulls last
  limit p_limite;
$$;

grant execute on function rechercher_lieux_proches(text, double precision, double precision, double precision, integer) to anon, authenticated;

-- `recommander_lieux` (11_lieux.sql) reprise à l'identique, renvoie
-- aussi niveau_prix désormais (utilisé par LieuxRecommandes.js).
create or replace function recommander_lieux(p_user_id uuid, p_limite integer default 6)
returns table (
  id integer,
  nom text,
  type text,
  description text,
  quartier_id integer,
  quartier_nom text,
  ville_nom text,
  note_moyenne numeric,
  nb_avis bigint,
  niveau_prix smallint
)
language sql
security definer
set search_path = public
as $$
  with quartiers_aimes as (
    select quartier_id from notes where user_id = p_user_id and aime = true
  ),
  ville_origine as (
    select ville_origine_code from profiles where id = p_user_id
  ),
  candidats as (
    select l.*
    from lieux l
    where l.actif = true
      and (
        (exists (select 1 from quartiers_aimes) and l.quartier_id in (select quartier_id from quartiers_aimes))
        or (
          not exists (select 1 from quartiers_aimes)
          and l.quartier_id in (
            select q.id from quartiers q, ville_origine v
            where q.ville_code_insee = v.ville_origine_code
          )
        )
      )
      and not exists (
        select 1 from avis_lieux av where av.lieu_id = l.id and av.user_id = p_user_id
      )
  )
  select
    l.id, l.nom, l.type, l.description, l.quartier_id, q.nom as quartier_nom, v.nom as ville_nom,
    coalesce(n.note_moyenne, 0) as note_moyenne, coalesce(n.nb_avis, 0) as nb_avis, l.niveau_prix
  from candidats l
  join quartiers q on q.id = l.quartier_id
  join villes v on v.code_insee = q.ville_code_insee
  left join v_lieux_notes n on n.lieu_id = l.id
  order by n.nb_avis desc nulls last, n.note_moyenne desc nulls last, l.created_at desc
  limit p_limite;
$$;

-- Reprend le déclencheur de validation de contribution (migration 12) à
-- l'identique, en lisant en plus `niveau_prix` (1 à 3) depuis le
-- contenu soumis -- le formulaire "Ajoute un lieu manquant"
-- (components/DefiActions.js) l'envoie désormais optionnellement.
create or replace function public.traiter_contribution()
returns trigger as $$
declare
  v_type_participation text;
  v_bonne_reponse smallint;
  v_reponse_donnee integer;
begin
  if tg_op = 'INSERT' and new.type_contribution = 'quiz' then
    select d.type_participation into v_type_participation from defis d where d.id = new.defi_id;
    if v_type_participation = 'quiz' then
      select bonne_reponse into v_bonne_reponse from defi_quiz where defi_id = new.defi_id limit 1;
      v_reponse_donnee := nullif(new.contenu->>'reponse_choisie', '')::integer;
      if v_bonne_reponse is not null and v_reponse_donnee = v_bonne_reponse then
        new.statut := 'validee';
      else
        new.statut := 'rejetee';
        new.motif_rejet := 'Mauvaise réponse.';
      end if;
    end if;
  end if;

  if new.statut = 'validee'
     and (tg_op = 'INSERT' or old.statut is distinct from 'validee')
     and not new.notacoins_credites then

    if new.type_contribution = 'lieu' then
      insert into lieux (quartier_id, nom, type, description, adresse, niveau_prix, source, cree_par, actif)
      values (
        nullif(new.contenu->>'quartier_id', '')::integer,
        new.contenu->>'nom',
        coalesce(nullif(new.contenu->>'type', ''), 'autre'),
        new.contenu->>'description',
        nullif(new.contenu->>'adresse', ''),
        nullif(new.contenu->>'niveau_prix', '')::smallint,
        'communaute',
        new.user_id,
        true
      );
    end if;

    perform public.crediter_notacoins(
      new.user_id,
      coalesce(new.cle_recompense, 'defi_action_simple'),
      'contributions',
      new.id
    );
    new.notacoins_credites := true;
    new.traitee_le := now();
  elsif new.statut = 'rejetee' and (tg_op = 'INSERT' or old.statut is distinct from 'rejetee') then
    new.traitee_le := now();
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
