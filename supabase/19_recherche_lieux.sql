-- ---------- 19. Recherche de lieux par mot-clé + géolocalisation ----------
-- Ex : taper "bière" pour trouver les bars les mieux notés qui en
-- proposent (page /recherche) ; côté app, les résultats sont ensuite
-- triables par distance à la position live du visiteur (lib/geoloc.js),
-- jamais stockée. Public, sans compte requis -- même logique que
-- rechercher_villes.
--
-- Cherche dans le nom, la description ET le type du lieu (taper "bar"
-- doit aussi remonter tous les bars). unaccent() permet de taper
-- "biere" et de trouver "bière".
--
-- p_code_insee (optionnel) restreint la recherche à une seule ville --
-- utilisé par le comparateur (/comparer) pour trouver, pour un même
-- mot-clé, le meilleur lieu dans chaque ville comparée. Laissé à null,
-- la recherche reste nationale comme sur /recherche.
create extension if not exists unaccent;

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
  nb_avis bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id, l.nom, l.type, l.description,
    -- Un lieu peut avoir ses propres coordonnées (latitude/longitude,
    -- voir 11_lieux.sql) ; à défaut, on retombe sur celles de son
    -- quartier -- suffisant pour calculer une distance approximative.
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
    and (p_code_insee is null or v.code_insee = p_code_insee)
    and (
      unaccent(l.nom) ilike unaccent('%' || p_terme || '%')
      or unaccent(coalesce(l.description, '')) ilike unaccent('%' || p_terme || '%')
      or unaccent(l.type) ilike unaccent('%' || p_terme || '%')
    )
  order by n.nb_avis desc nulls last, n.note_moyenne desc nulls last, l.created_at desc
  limit p_limite;
$$;

grant execute on function rechercher_lieux(text, integer, text) to anon, authenticated;
