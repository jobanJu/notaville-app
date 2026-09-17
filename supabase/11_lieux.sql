-- Lieux précis (restaurant, bar, monument...) à l'intérieur d'un
-- quartier, notés par les utilisateurs, et une fonction de
-- recommandation basée sur les quartiers que la personne a déjà aimés
-- (table `notes`, alimentée par la carte de /decouvrir).
--
-- Portée volontairement resserrée pour cette livraison : ajout/notation
-- d'un lieu se fait en direct (comme `avis`), sans repasser par le
-- workflow de validation admin des `contributions`. Rattacher la
-- création de lieu au défi communauté "Ajoute un lieu manquant"
-- (workflow PENDING/VALIDATED/REJECTED + Notacoins) est un travail de
-- Phase 2 -- voir README.

create table if not exists lieux (
  id serial primary key,
  quartier_id integer not null references quartiers(id) on delete cascade,
  nom text not null,
  type text not null check (type in ('restaurant', 'bar', 'cafe', 'monument', 'musee', 'parc', 'boutique', 'hotel', 'autre')),
  description text,
  adresse text,
  latitude double precision,
  longitude double precision,
  source text not null default 'communaute' check (source in ('officiel', 'communaute')),
  cree_par uuid references auth.users(id),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_lieux_quartier on lieux(quartier_id);
create index if not exists idx_lieux_type on lieux(type);

create table if not exists avis_lieux (
  id serial primary key,
  lieu_id integer not null references lieux(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note integer not null check (note between 1 and 5),
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lieu_id, user_id)
);

create index if not exists idx_avis_lieux_lieu on avis_lieux(lieu_id);

alter table lieux enable row level security;
alter table avis_lieux enable row level security;

-- Lieux actifs : lecture publique (comme villes/quartiers), comme les
-- fiches ville qui restent consultables sans compte.
create policy "Les lieux actifs sont visibles par tous" on lieux
  for select to anon, authenticated using (actif = true);

create policy "Un utilisateur connecté peut ajouter un lieu" on lieux
  for insert to authenticated with check (cree_par = auth.uid());

-- Les avis individuels (avec commentaire) restent réservés aux comptes
-- connectés -- seule l'agrégation (v_lieux_notes, ci-dessous) est
-- publique, même principe que pour les contributions des défis.
create policy "Les avis de lieux sont visibles par les connectés" on avis_lieux
  for select to authenticated using (true);

create policy "On note un lieu avec son propre compte" on avis_lieux
  for insert to authenticated with check (user_id = auth.uid());

create policy "On modifie son propre avis de lieu" on avis_lieux
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Agrégat public (note moyenne + nombre d'avis), jamais de ligne
-- individuelle exposée hors connexion.
create or replace view v_lieux_notes as
select
  lieu_id,
  round(avg(note)::numeric, 2) as note_moyenne,
  count(*) as nb_avis
from avis_lieux
group by lieu_id;

grant select on v_lieux_notes to anon, authenticated;

-- Recommandation : les mieux notés dans les quartiers que l'utilisateur
-- a déjà "aimés" en swipant/cliquant sur la carte (table notes,
-- aime = true). À défaut de quartier aimé, on retombe sur sa ville
-- d'origine, puis sur le classement global.
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
  nb_avis bigint
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
    coalesce(n.note_moyenne, 0) as note_moyenne, coalesce(n.nb_avis, 0) as nb_avis
  from candidats l
  join quartiers q on q.id = l.quartier_id
  join villes v on v.code_insee = q.ville_code_insee
  left join v_lieux_notes n on n.lieu_id = l.id
  order by n.nb_avis desc nulls last, n.note_moyenne desc nulls last, l.created_at desc
  limit p_limite;
$$;

grant execute on function recommander_lieux(uuid, integer) to authenticated;

-- Une quinzaine de lieux de départ pour Lille (source officielle), pour
-- que la recommandation ait déjà de quoi proposer avant les premières
-- contributions. Les notes viendront des utilisateurs réels.
insert into lieux (quartier_id, nom, type, description, source)
select q.id, l.nom, l.type, l.description, 'officiel'
from (values
  ('Vieux-Lille', 'La Chicorée', 'restaurant', 'Brasserie historique, spécialités du Nord.'),
  ('Vieux-Lille', 'Cathédrale Notre-Dame-de-la-Treille', 'monument', 'Façade contemporaine translucide, contraste avec le Vieux-Lille.'),
  ('Vieux-Lille', 'Meert', 'boutique', 'Pâtisserie historique, célèbre pour ses gaufres fourrées à la vanille.'),
  ('Lille-Centre', 'Grand-Place (Place du Général-de-Gaulle)', 'monument', 'Cœur historique de Lille, colonne de la Déesse.'),
  ('Lille-Centre', 'Palais des Beaux-Arts', 'musee', 'Un des plus grands musées de France hors Paris.'),
  ('Lille-Centre', 'Opéra de Lille', 'monument', 'Salle à l''italienne du début du XXe siècle.'),
  ('Wazemmes', 'Marché de Wazemmes', 'autre', 'Marché couvert et de plein air, tous les matins.'),
  ('Wazemmes', 'Le Vivat', 'bar', 'Bar de quartier convivial près de la place.'),
  ('Vauban-Esquermes', 'Parc Jean-Baptiste Lebas', 'parc', 'Grand parc paysager près de la citadelle.'),
  ('Vauban-Esquermes', 'Citadelle de Lille', 'monument', 'Fortification Vauban du XVIIe siècle, en partie boisée et ouverte au public.'),
  ('Fives', 'Fives Cail', 'monument', 'Ancien site industriel réhabilité.'),
  ('Lille-Sud', 'Stade Pierre-Mauroy', 'monument', 'Grande salle modulable, sport et concerts.'),
  ('Bois-Blancs', 'Parc de la Citadelle (rive gauche)', 'parc', 'Bords de Deûle, promenade et sport en plein air.'),
  ('Lomme', 'Le Bois de Boulogne (Lomme)', 'parc', 'Espace vert familial à l''ouest de la métropole.'),
  ('Hellemmes', 'Théâtre Sébastopol', 'monument', 'Salle de spectacle de style Belle Époque.')
) as l(quartier_nom, nom, type, description)
join quartiers q on q.nom = l.quartier_nom and q.ville_code_insee = '59350'
on conflict do nothing;
