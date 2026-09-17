-- ---------- 21. Établissements publics notés (hôpitaux, gares, services publics...) ----------
-- Classements nationaux par type d'établissement (ex. "meilleurs
-- hôpitaux de France", affichés sur /classement), sur le même principe
-- que les lieux (11_lieux.sql) mais rattachés à une ville entière
-- plutôt qu'à un quartier -- un hôpital ou une gare dessert toute une
-- ville, pas un seul quartier. Même choix de portée que les lieux :
-- ajout/notation en direct, sans workflow de validation admin (voir
-- 11_lieux.sql pour la même remarque).

create table if not exists etablissements (
  id serial primary key,
  ville_code_insee text not null references villes(code_insee),
  nom text not null,
  type text not null check (type in ('hopital', 'gare', 'service_public', 'ecole', 'autre')),
  description text,
  adresse text,
  source text not null default 'communaute' check (source in ('officiel', 'communaute')),
  cree_par uuid references auth.users(id),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_etablissements_ville on etablissements(ville_code_insee);
create index if not exists idx_etablissements_type on etablissements(type);

create table if not exists avis_etablissements (
  id serial primary key,
  etablissement_id integer not null references etablissements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note integer not null check (note between 1 and 5),
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (etablissement_id, user_id)
);

create index if not exists idx_avis_etablissements_etablissement on avis_etablissements(etablissement_id);

alter table etablissements enable row level security;
alter table avis_etablissements enable row level security;

-- Établissements actifs : lecture publique (comme les lieux et les
-- fiches ville), le classement doit rester consultable sans compte.
create policy "Les établissements actifs sont visibles par tous" on etablissements
  for select to anon, authenticated using (actif = true);

create policy "Un utilisateur connecté peut ajouter un établissement" on etablissements
  for insert to authenticated with check (cree_par = auth.uid());

-- Les avis individuels restent réservés aux comptes connectés -- seule
-- l'agrégation (v_etablissements_notes, ci-dessous) est publique, même
-- principe que pour avis_lieux.
create policy "Les avis d'établissements sont visibles par les connectés" on avis_etablissements
  for select to authenticated using (true);

create policy "On note un établissement avec son propre compte" on avis_etablissements
  for insert to authenticated with check (user_id = auth.uid());

create policy "On modifie son propre avis d'établissement" on avis_etablissements
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Agrégat public (note moyenne + nombre d'avis), jamais de ligne
-- individuelle exposée hors connexion.
create or replace view v_etablissements_notes as
select
  etablissement_id,
  round(avg(note)::numeric, 2) as note_moyenne,
  count(*) as nb_avis
from avis_etablissements
group by etablissement_id;

grant select on v_etablissements_notes to anon, authenticated;

-- Classement national par type : les mieux notés dans toute la France,
-- avec un minimum de 3 avis pour éviter qu'un seul avis à 5/5 ne
-- ressorte premier -- même logique que le seuil de "5 contributions
-- minimum" utilisé ailleurs sur les données Vie quotidienne.
create or replace function classement_etablissements(p_type text, p_limite integer default 20)
returns table (
  id integer,
  nom text,
  type text,
  ville_nom text,
  departement text,
  note_moyenne numeric,
  nb_avis bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id, e.nom, e.type, v.nom as ville_nom, v.departement,
    n.note_moyenne, n.nb_avis
  from etablissements e
  join villes v on v.code_insee = e.ville_code_insee
  join v_etablissements_notes n on n.etablissement_id = e.id
  where e.actif = true
    and (p_type is null or e.type = p_type)
    and n.nb_avis >= 3
  order by n.note_moyenne desc, n.nb_avis desc
  limit p_limite;
$$;

grant execute on function classement_etablissements(text, integer) to anon, authenticated;

-- Une poignée d'établissements de départ (source officielle), pour que
-- le classement ait déjà de quoi afficher avant les premières
-- contributions -- même logique que le seed initial de 11_lieux.sql.
insert into etablissements (ville_code_insee, nom, type, source)
select v.code_insee, e.nom, e.type, 'officiel'
from (values
  ('59350', 'CHU de Lille', 'hopital'),
  ('59350', 'Gare de Lille Flandres', 'gare'),
  ('59350', 'Mairie de Lille', 'service_public'),
  ('59350', 'Université de Lille', 'ecole'),
  ('75056', 'Hôpital Saint-Louis', 'hopital'),
  ('75056', 'Gare de Paris Nord', 'gare'),
  ('69123', 'CHU Lyon Sud', 'hopital'),
  ('69123', 'Gare de Lyon Part-Dieu', 'gare')
) as e(code_insee, nom, type)
join villes v on v.code_insee = e.code_insee
on conflict do nothing;
