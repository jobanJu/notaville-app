-- ============================================================
-- NOTAVILLE — Migration 26 : lieux rattachés directement à une commune
-- (sans passer par un quartier), pour permettre un import national
-- massif (restaurants, musées, attractions, lieux de culte, loisirs...
-- voir scripts/import-lieux-osm.js).
--
-- Jusqu'ici `lieux.quartier_id` était obligatoire (11_lieux.sql) : un
-- lieu appartenait toujours à un quartier. Mais les quartiers ne sont
-- définis que pour une partie des 34 969 communes (00_villes_quartiers.sql) --
-- la plupart des communes n'en ont aucun. Pour couvrir toute la France,
-- un lieu doit pouvoir se rattacher directement à sa commune
-- (ville_code_insee), avec ses propres coordonnées (déjà supportées :
-- lieux.latitude/longitude). Les lieux existants, liés à un quartier,
-- continuent de fonctionner à l'identique -- quartier_id devient
-- optionnel, pas supprimé.
-- ============================================================

alter table lieux alter column quartier_id drop not null;
alter table lieux add column if not exists ville_code_insee text references villes(code_insee);
create index if not exists idx_lieux_ville on lieux(ville_code_insee);

alter table lieux drop constraint if exists lieux_rattachement_check;
alter table lieux add constraint lieux_rattachement_check
  check (quartier_id is not null or ville_code_insee is not null);

-- Nouvelles catégories demandées (attraction, lieu de culte, loisir),
-- en plus des catégories existantes.
alter table lieux drop constraint if exists lieux_type_check;
alter table lieux add constraint lieux_type_check
  check (type in ('restaurant', 'bar', 'cafe', 'monument', 'musee', 'parc', 'boutique', 'hotel', 'attraction', 'lieu_culte', 'loisir', 'autre'));

-- Nouvelle source 'osm' (import automatisé OpenStreetMap), distincte de
-- 'officiel' (saisi à la main par nous) et 'communaute' (contribution
-- utilisateur) -- plus honnête sur la provenance réelle de la donnée.
alter table lieux drop constraint if exists lieux_source_check;
alter table lieux add constraint lieux_source_check
  check (source in ('officiel', 'communaute', 'osm'));

-- Identifiant OpenStreetMap ("n123", "w456", "r789") pour les lieux
-- importés automatiquement (scripts/import-lieux-osm.js) : permet de
-- relancer l'import sans dupliquer (upsert sur ce champ) si on étend la
-- couverture plus tard. Nul pour tout le reste (lieux officiels saisis
-- à la main, contributions communauté).
-- Contrainte unique NON partielle exprès : Postgres autorise plusieurs
-- lignes à NULL sous une contrainte unique classique (NULL n'est jamais
-- égal à NULL), donc les lieux "officiels"/"communauté" sans osm_id ne
-- sont pas gênés -- et ça permet à l'upsert du script d'import
-- (`on_conflict=osm_id`) de fonctionner : PostgREST/Postgres ne sait
-- pas cibler un index unique PARTIEL via ON CONFLICT (osm_id) sans
-- warning/erreur, alors qu'une contrainte unique classique s'infère
-- sans ambiguïté.
alter table lieux drop constraint if exists lieux_osm_id_key;
alter table lieux add column if not exists osm_id text;
alter table lieux add constraint lieux_osm_id_key unique (osm_id);

-- ---------- Fonctions de lecture : quartier optionnel désormais ----------
-- Même signature de retour qu'avant (24_lieux_prix.sql), donc un simple
-- CREATE OR REPLACE suffit (pas de DROP nécessaire) -- seul le corps
-- change : LEFT JOIN quartiers au lieu de JOIN, et la ville vient soit
-- du quartier, soit directement de lieux.ville_code_insee.
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
    l.latitude,
    l.longitude,
    q.nom as quartier_nom,
    v.nom as ville_nom,
    coalesce(n.note_moyenne, 0) as note_moyenne,
    coalesce(n.nb_avis, 0) as nb_avis,
    l.niveau_prix
  from lieux l
  left join quartiers q on q.id = l.quartier_id
  left join villes v on v.code_insee = coalesce(q.ville_code_insee, l.ville_code_insee)
  left join v_lieux_notes n on n.lieu_id = l.id
  where l.actif = true
    and (p_code_insee is null or coalesce(q.ville_code_insee, l.ville_code_insee) = p_code_insee)
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
      l.latitude,
      l.longitude,
      q.nom as quartier_nom,
      v.nom as ville_nom,
      coalesce(n.note_moyenne, 0) as note_moyenne,
      coalesce(n.nb_avis, 0) as nb_avis,
      l.niveau_prix
    from lieux l
    left join quartiers q on q.id = l.quartier_id
    left join villes v on v.code_insee = coalesce(q.ville_code_insee, l.ville_code_insee)
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
      l.latitude,
      l.longitude,
      q.nom as quartier_nom,
      v.nom as ville_nom,
      coalesce(n.note_moyenne, 0) as note_moyenne,
      coalesce(n.nb_avis, 0) as nb_avis,
      l.niveau_prix
    from lieux l
    left join quartiers q on q.id = l.quartier_id
    left join villes v on v.code_insee = coalesce(q.ville_code_insee, l.ville_code_insee)
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

-- recommander_lieux : reste basé sur les quartiers "aimés" / la ville
-- d'origine -- logique inchangée, mais le LEFT JOIN quartiers évite
-- qu'un lieu sans quartier (import national) ne soit silencieusement
-- exclu de tout calcul qui parcourrait `lieux` plus largement ailleurs.
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
    left join quartiers ql on ql.id = l.quartier_id
    where l.actif = true
      and (
        (exists (select 1 from quartiers_aimes) and l.quartier_id in (select quartier_id from quartiers_aimes))
        or (
          not exists (select 1 from quartiers_aimes)
          and coalesce(ql.ville_code_insee, l.ville_code_insee) in (select ville_origine_code from ville_origine)
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
  left join quartiers q on q.id = l.quartier_id
  left join villes v on v.code_insee = coalesce(q.ville_code_insee, l.ville_code_insee)
  left join v_lieux_notes n on n.lieu_id = l.id
  order by n.nb_avis desc nulls last, n.note_moyenne desc nulls last, l.created_at desc
  limit p_limite;
$$;
