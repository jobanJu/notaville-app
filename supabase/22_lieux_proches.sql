-- ---------- 22. Lieux à proximité (géolocalisation) ----------
-- Utilisé par /jeux/chasse ("Chasse aux lieux", inspiré de Pokémon Go) :
-- à partir de la position live du visiteur (lib/geoloc.js, jamais
-- stockée), renvoie les lieux contribués par la communauté dans un
-- rayon donné, avec leur distance en km, pour proposer de les
-- "attraper" une fois vraiment à proximité. Même table que
-- rechercher_lieux (19_recherche_lieux.sql), juste un calcul de
-- distance à un point au lieu d'une recherche par mot-clé.
--
-- Formule de haversine calculée côté SQL (équivalent de distanceKm()
-- dans lib/geoloc.js) : évite de rapatrier tous les lieux de France
-- côté client pour ne garder que les proches.
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
  distance double precision
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
      coalesce(n.nb_avis, 0) as nb_avis
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
  select id, nom, type, description, latitude, longitude, quartier_nom, ville_nom, note_moyenne, nb_avis, distance
  from avec_distance
  where distance <= p_rayon_km
  order by distance asc
  limit p_limite;
$$;

grant execute on function lieux_proches(double precision, double precision, double precision, integer) to anon, authenticated;
