-- ============================================================
-- NOTAVILLE — schéma applicatif
-- À exécuter APRÈS avoir importé villes/quartiers (02_seed_villes_quartiers.sql)
-- dans l'éditeur SQL de Supabase, ou via `psql`.
-- ============================================================

-- ---------- Sécurité sur les données de référence (villes/quartiers) ----------
-- Ces tables sont importées par 00_villes_quartiers.sql. On verrouille les
-- écritures (seul le SQL editor / service_role peut les modifier) et on
-- autorise la lecture à tout le monde, y compris avant connexion.
alter table villes enable row level security;
alter table quartiers enable row level security;

create policy "Les villes sont lisibles par tous"
  on villes for select to anon, authenticated using (true);

create policy "Les quartiers sont lisibles par tous"
  on quartiers for select to anon, authenticated using (true);

-- ---------- Profils utilisateurs ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null,
  ville_origine_code text references villes(code_insee),
  points integer not null default 0,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Les profils sont visibles par tous les connectés"
  on profiles for select
  to authenticated
  using (true);

create policy "Chacun modifie uniquement son propre profil"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Chacun crée uniquement son propre profil"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Crée automatiquement un profil vide à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, pseudo)
  values (new.id, coalesce(new.raw_user_meta_data->>'pseudo', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Notes rapides (swipe) ----------
create table if not exists notes (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  quartier_id integer not null references quartiers(id) on delete cascade,
  aime boolean not null,            -- true = swipe à droite ("j'aime"), false = passe
  created_at timestamptz not null default now(),
  unique (user_id, quartier_id)     -- un seul swipe par quartier et par personne
);

alter table notes enable row level security;

create policy "Tout le monde peut lire les notes (pour les moyennes)"
  on notes for select to authenticated using (true);

create policy "On ne peut noter qu'en son propre nom"
  on notes for insert to authenticated with check (auth.uid() = user_id);

-- ---------- Avis détaillés (points forts / points faibles) ----------
create table if not exists avis (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  quartier_id integer not null references quartiers(id) on delete cascade,
  note smallint not null check (note between 1 and 5),
  points_forts text[] not null default '{}',
  points_faibles text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table avis enable row level security;

create policy "Tout le monde peut lire les avis"
  on avis for select to authenticated using (true);

create policy "On ne peut publier un avis qu'en son propre nom"
  on avis for insert to authenticated with check (auth.uid() = user_id);

-- ---------- Défis de quartier (duels) ----------
create table if not exists defis (
  id bigint generated always as identity primary key,
  quartier_a_id integer not null references quartiers(id),
  quartier_b_id integer not null references quartiers(id),
  debute_le timestamptz not null default now(),
  termine_le timestamptz not null,
  resolu boolean not null default false,
  gagnant_id integer references quartiers(id)
);

alter table defis enable row level security;

create policy "Tout le monde peut lire les défis"
  on defis for select to authenticated using (true);

create table if not exists votes_defis (
  id bigint generated always as identity primary key,
  defi_id bigint not null references defis(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  quartier_choisi_id integer not null,
  created_at timestamptz not null default now(),
  unique (defi_id, user_id)   -- un seul vote par défi et par personne
);

alter table votes_defis enable row level security;

create policy "Tout le monde peut lire les votes (pour les pourcentages)"
  on votes_defis for select to authenticated using (true);

create policy "On ne peut voter qu'en son propre nom"
  on votes_defis for insert to authenticated with check (auth.uid() = user_id);

-- Résout un défi terminé : détermine le quartier gagnant et crédite
-- +15 points bonus aux votants qui avaient choisi ce camp.
-- À appeler manuellement ou via une tâche planifiée (pg_cron) une fois `termine_le` dépassé.
create or replace function public.resoudre_defi(p_defi_id bigint)
returns void as $$
declare
  v_gagnant integer;
begin
  select quartier_choisi_id into v_gagnant
  from votes_defis
  where defi_id = p_defi_id
  group by quartier_choisi_id
  order by count(*) desc
  limit 1;

  update defis set resolu = true, gagnant_id = v_gagnant where id = p_defi_id;

  update profiles set points = points + 15
  where id in (
    select user_id from votes_defis
    where defi_id = p_defi_id and quartier_choisi_id = v_gagnant
  );
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- Points automatiques ----------
create or replace function public.crediter_points_note()
returns trigger as $$
begin
  update profiles set points = points + 10 where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_note_created on notes;
create trigger on_note_created
  after insert on notes
  for each row execute procedure public.crediter_points_note();

create or replace function public.crediter_points_avis()
returns trigger as $$
begin
  update profiles set points = points + 25 where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_avis_created on avis;
create trigger on_avis_created
  after insert on avis
  for each row execute procedure public.crediter_points_avis();

create or replace function public.crediter_points_vote()
returns trigger as $$
begin
  update profiles set points = points + 5 where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_vote_defi_created on votes_defis;
create trigger on_vote_defi_created
  after insert on votes_defis
  for each row execute procedure public.crediter_points_vote();

-- ============================================================
-- Vues de classement : "vécu au quotidien" (habitants) vs
-- "impression de passage" (voyageurs), comme dans la maquette.
--
-- Règle : un avis compte comme "résident" quand la ville notée est
-- la ville d'origine déclarée par la personne qui note, sinon
-- comme "voyageur".
-- ============================================================
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
  q.ville_code_insee,
  a.note as note_equivalente,
  (p.ville_origine_code = q.ville_code_insee) as est_resident
from avis a
join quartiers q on q.id = a.quartier_id
join profiles p on p.id = a.user_id;

create or replace view v_classement_residents as
select
  v.code_insee,
  v.nom as ville,
  v.departement,
  v.region,
  round(avg(t.note_equivalente)::numeric, 2) as note_moyenne,
  count(*) as nb_avis
from v_avis_avec_type t
join villes v on v.code_insee = t.ville_code_insee
where t.est_resident
group by v.code_insee, v.nom, v.departement, v.region
order by note_moyenne desc;

create or replace view v_classement_voyageurs as
select
  v.code_insee,
  v.nom as ville,
  v.departement,
  v.region,
  round(avg(t.note_equivalente)::numeric, 2) as note_moyenne,
  count(*) as nb_avis
from v_avis_avec_type t
join villes v on v.code_insee = t.ville_code_insee
where not t.est_resident
group by v.code_insee, v.nom, v.departement, v.region
order by note_moyenne desc;
