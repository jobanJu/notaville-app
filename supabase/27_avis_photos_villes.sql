-- ============================================================
-- NOTAVILLE — Migration 27 : page ville façon TripAdvisor
-- (avis individuels avec texte libre + photos postées librement)
-- ============================================================
--
-- Jusqu'ici la page /villes/[code] n'affichait que des MOYENNES
-- (note_habitants, note_touristes) via fiche_ville() -- jamais un avis
-- individuel avec son auteur. Et les avis (`avis`) comme les photos
-- (`contributions`) étaient rattachés à un `quartier_id` obligatoire ou
-- à un défi -- deux limites qui empêchaient de couvrir les 34 969
-- communes (la plupart n'ont pas de quartiers référencés, cf. migration
-- 26 qui a fait le même découplage pour `lieux`).
--
-- Cette migration :
--   1. Rend `avis.quartier_id` optionnel et ajoute `avis.ville_code_insee`
--      (rattachement direct à une commune) + `avis.commentaire` (texte
--      libre, en plus des tags points forts/faibles déjà existants).
--   2. Rend `contributions.defi_id` optionnel, pour permettre de poster
--      une photo d'une ville sans passer par un défi.
--   3. Ajoute deux fonctions publiques (security definer, comme
--      fiche_ville) : `avis_ville()` et `photos_ville()`, qui renvoient
--      la LISTE des avis/photos individuels (avec pseudo de l'auteur),
--      pas juste une moyenne -- décision produit : chaque avis/photo est
--      public dès sa publication, pas de seuil d'anonymat ici (à la
--      différence de v_stats_ville_anonymisees, qui reste inchangée et
--      continue de protéger les données sensibles comme le salaire).
-- ============================================================

-- ---------- 1. Avis : quartier optionnel + rattachement direct à une ville ----------
alter table avis alter column quartier_id drop not null;
alter table avis add column if not exists ville_code_insee text references villes(code_insee);
alter table avis add column if not exists commentaire text;

alter table avis drop constraint if exists avis_rattachement_check;
alter table avis add constraint avis_rattachement_check
  check (quartier_id is not null or ville_code_insee is not null);

create index if not exists idx_avis_ville on avis(ville_code_insee);

-- v_avis_avec_type : même liste de colonnes qu'avant (CREATE OR REPLACE
-- suffit), mais la branche `avis` doit maintenant accepter un quartier
-- absent (LEFT JOIN) et retomber sur avis.ville_code_insee le cas échéant.
create or replace view v_avis_avec_type as
select
  n.id,
  n.user_id,
  q.ville_code_insee,
  case when n.aime then 5 else 1 end as note_equivalente,
  (p.ville_origine_code = q.ville_code_insee) as est_resident
from notes n
join quartiers q on q.id = n.quartier_id
join profiles p on p.id = n.user_id
union all
select
  a.id,
  a.user_id,
  coalesce(q.ville_code_insee, a.ville_code_insee),
  a.note as note_equivalente,
  (p.ville_origine_code = coalesce(q.ville_code_insee, a.ville_code_insee)) as est_resident
from avis a
left join quartiers q on q.id = a.quartier_id
join profiles p on p.id = a.user_id;

-- Liste des avis d'une ville (texte inclus), auteur visible dès le 1er
-- avis publié -- pas d'agrégation, contrairement à fiche_ville().
create or replace function public.avis_ville(p_code_insee text, p_limite integer default 30)
returns table (
  id bigint,
  pseudo text,
  note smallint,
  points_forts text[],
  points_faibles text[],
  commentaire text,
  est_resident boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    pr.pseudo,
    a.note,
    a.points_forts,
    a.points_faibles,
    a.commentaire,
    (pr.ville_origine_code = coalesce(q.ville_code_insee, a.ville_code_insee)) as est_resident,
    a.created_at
  from avis a
  left join quartiers q on q.id = a.quartier_id
  join profiles pr on pr.id = a.user_id
  where coalesce(q.ville_code_insee, a.ville_code_insee) = p_code_insee
  order by a.created_at desc
  limit p_limite;
$$;

grant execute on function public.avis_ville(text, integer) to anon, authenticated;

-- ---------- 2. Photos : défi optionnel (poster librement une photo d'une ville) ----------
alter table contributions alter column defi_id drop not null;

-- Récompense dédiée à une photo postée hors défi (distincte de
-- 'defi_photo', qui reste pour les défis photo classiques).
insert into parametres_recompenses (cle, valeur, description) values
  ('photo_ville_libre', 10, 'Poster librement une photo d''une ville (hors défi), une fois validée')
on conflict (cle) do nothing;

insert into limites_anti_abus (raison, max_par_jour) values
  ('photo_ville_libre', 10)
on conflict (raison) do nothing;

-- Liste des photos validées d'une ville, auteur inclus.
create or replace function public.photos_ville(p_code_insee text, p_limite integer default 30)
returns table (
  id bigint,
  pseudo text,
  photo_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, p.pseudo, c.photo_url, c.created_at
  from contributions c
  join profiles p on p.id = c.user_id
  where c.ville_code_insee = p_code_insee
    and c.type_contribution = 'photo'
    and c.statut = 'validee'
  order by c.created_at desc
  limit p_limite;
$$;

grant execute on function public.photos_ville(text, integer) to anon, authenticated;
