-- ============================================================
-- NOTAVILLE -- Fichier combiné : migrations 01 à 22, dans l'ordre.
-- Généré en concaténant les fichiers numérotés individuels --
-- eux restent la source de référence, celui-ci n'est qu'un
-- raccourci pratique pour ne coller qu'une seule fois dans le
-- SQL Editor de Supabase, après avoir joué 00_villes_quartiers.sql
-- séparément (trop volumineux pour être combiné ici).
-- ============================================================

-- ======================================================
-- ==== 01_schema.sql
-- ======================================================
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

-- ======================================================
-- ==== 02_exemple_defi.sql
-- ======================================================
-- Exemple de défi de quartier à créer une fois par semaine (à la main,
-- depuis l'éditeur SQL, ou via une tâche planifiée plus tard).
-- Celui-ci reprend l'exemple de la maquette : Wazemmes vs Lille-Moulins.

insert into defis (quartier_a_id, quartier_b_id, debute_le, termine_le)
select qa.id, qb.id, now(), now() + interval '7 days'
from quartiers qa, quartiers qb
where qa.nom = 'Wazemmes' and qa.ville_code_insee = '59350'
  and qb.nom = 'Lille-Moulins' and qb.ville_code_insee = '59350';

-- ======================================================
-- ==== 03_renommage_duels_notacoins.sql
-- ======================================================
-- ============================================================
-- NOTAVILLE — Migration 03 : libère le nom "défis" et unifie la monnaie
-- À exécuter APRÈS 01_schema.sql (et 02_exemple_defi.sql si déjà joué).
--
-- Pourquoi cette migration :
-- La v1 appelait "défis" les duels de quartier (Wazemmes vs Moulins).
-- Le nouveau système de gamification demandé est beaucoup plus large
-- (le vrai sens de "défi" dans Notaville). On renomme donc l'ancien
-- système en "duels de quartier" pour libérer le nom, SANS rien casser :
-- les données existantes sont conservées, seuls les noms changent.
-- ============================================================

-- ---------- 1. Renommage des duels de quartier ----------
alter table if exists defis rename to duels_quartier;
alter table if exists votes_defis rename to votes_duels;
alter table votes_duels rename column defi_id to duel_id;

alter table duels_quartier drop constraint if exists defis_pkey cascade;
alter table duels_quartier add primary key (id);

-- Renomme les policies pour rester cohérent (optionnel mais plus lisible
-- dans le dashboard Supabase).
drop policy if exists "Tout le monde peut lire les défis" on duels_quartier;
create policy "Tout le monde peut lire les duels de quartier"
  on duels_quartier for select to authenticated using (true);

drop policy if exists "Tout le monde peut lire les votes (pour les pourcentages)" on votes_duels;
create policy "Tout le monde peut lire les votes de duel"
  on votes_duels for select to authenticated using (true);

drop policy if exists "On ne peut voter qu'en son propre nom" on votes_duels;
create policy "On ne peut voter à un duel qu'en son propre nom"
  on votes_duels for insert to authenticated with check (auth.uid() = user_id);

-- ---------- 2. Renomme la monnaie : points -> notacoins ----------
alter table profiles rename column points to notacoins;

-- ---------- 3. Table de configuration des récompenses ----------
-- Les montants de Notacoins ne sont JAMAIS codés en dur : ils vivent ici
-- et sont modifiables depuis le dashboard Supabase (Table editor), sans
-- toucher au code. C'est la solution d'admin de la Phase 1 (voir README).
create table if not exists parametres_recompenses (
  cle text primary key,
  valeur integer not null,
  description text not null,
  modifie_le timestamptz not null default now()
);

alter table parametres_recompenses enable row level security;

create policy "Les montants de récompense sont lisibles par tous"
  on parametres_recompenses for select to anon, authenticated using (true);
-- Pas de policy insert/update pour les utilisateurs : seule la console
-- Supabase (service_role, hors RLS) peut modifier ces valeurs.

insert into parametres_recompenses (cle, valeur, description) values
  ('swipe_note',         10, 'Noter un quartier en swipant (j''aime ou passe)'),
  ('avis_detaille',      25, 'Publier un avis détaillé avec points forts/faibles'),
  ('vote_duel',           5, 'Voter à un duel de quartier'),
  ('duel_gagnant_bonus', 15, 'Bonus si le camp voté remporte le duel'),
  ('defi_action_simple', 20, 'Compléter un défi à action simple'),
  ('defi_etape',         10, 'Valider une étape d''un défi multi-étapes'),
  ('defi_photo',         15, 'Soumettre une photo pour un défi photo, une fois validée'),
  ('vote_photo',          2, 'Voter pour une photo d''un défi photo'),
  ('defi_global_palier', 30, 'Atteindre un palier d''un défi global/long terme')
on conflict (cle) do nothing;

create or replace function public.montant_recompense(p_cle text)
returns integer as $$
  select coalesce((select valeur from parametres_recompenses where cle = p_cle), 0);
$$ language sql stable;

-- ---------- 4. Anti-abus : limites journalières par type de gain ----------
-- Empêche de gonfler artificiellement un classement à coup de spam
-- (ex: revoter, republier en boucle). Ne bloque jamais l'action elle-même
-- (l'utilisateur peut continuer à contribuer), seul le gain de Notacoins
-- est plafonné au-delà de la limite.
create table if not exists limites_anti_abus (
  raison text primary key,
  max_par_jour integer not null
);

alter table limites_anti_abus enable row level security;
create policy "Les limites anti-abus sont lisibles par tous"
  on limites_anti_abus for select to anon, authenticated using (true);

insert into limites_anti_abus (raison, max_par_jour) values
  ('swipe_note', 200),
  ('avis_detaille', 20),
  ('vote_duel', 30),
  ('defi_action_simple', 50),
  ('defi_etape', 100),
  ('defi_photo', 20),
  ('vote_photo', 100)
on conflict (raison) do nothing;

-- ---------- 5. Grand livre unique des Notacoins ----------
-- Toute variation de solde passe par cette table : traçabilité complète
-- pour l'admin ("voir les récompenses distribuées") et un seul point
-- d'entrée pour créditer, qui applique automatiquement les limites
-- anti-abus ci-dessus.
create table if not exists notacoins_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  montant integer not null,
  raison text not null,
  ref_table text,
  ref_id bigint,
  plafond_atteint boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notacoins_transactions enable row level security;

create policy "Chacun voit uniquement ses propres transactions"
  on notacoins_transactions for select to authenticated using (auth.uid() = user_id);

create index if not exists idx_notacoins_tx_user_jour
  on notacoins_transactions (user_id, raison, created_at);

create or replace function public.crediter_notacoins(
  p_user_id uuid,
  p_raison text,
  p_ref_table text default null,
  p_ref_id bigint default null
)
returns integer as $$
declare
  v_montant integer := public.montant_recompense(p_raison);
  v_max integer;
  v_deja_aujourdhui integer;
  v_plafonne boolean := false;
begin
  select max_par_jour into v_max from limites_anti_abus where raison = p_raison;

  if v_max is not null then
    select count(*) into v_deja_aujourdhui
    from notacoins_transactions
    where user_id = p_user_id and raison = p_raison
      and created_at >= date_trunc('day', now());

    if v_deja_aujourdhui >= v_max then
      v_montant := 0;
      v_plafonne := true;
    end if;
  end if;

  insert into notacoins_transactions (user_id, montant, raison, ref_table, ref_id, plafond_atteint)
  values (p_user_id, v_montant, p_raison, p_ref_table, p_ref_id, v_plafonne);

  if v_montant <> 0 then
    update profiles set notacoins = notacoins + v_montant where id = p_user_id;
  end if;

  return v_montant;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- 6. Remplace les 3 triggers "en dur" par le grand livre ----------
drop trigger if exists on_note_created on notes;
drop function if exists public.crediter_points_note();
create or replace function public.on_note_created_credit()
returns trigger as $$
begin
  perform public.crediter_notacoins(new.user_id, 'swipe_note', 'notes', new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger on_note_created
  after insert on notes
  for each row execute procedure public.on_note_created_credit();

drop trigger if exists on_avis_created on avis;
drop function if exists public.crediter_points_avis();
create or replace function public.on_avis_created_credit()
returns trigger as $$
begin
  perform public.crediter_notacoins(new.user_id, 'avis_detaille', 'avis', new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger on_avis_created
  after insert on avis
  for each row execute procedure public.on_avis_created_credit();

drop trigger if exists on_vote_defi_created on votes_duels;
drop function if exists public.crediter_points_vote();
create or replace function public.on_vote_duel_created_credit()
returns trigger as $$
begin
  perform public.crediter_notacoins(new.user_id, 'vote_duel', 'votes_duels', new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger on_vote_duel_created
  after insert on votes_duels
  for each row execute procedure public.on_vote_duel_created_credit();

-- ---------- 7. resoudre_duel (ex-resoudre_defi) utilise le grand livre ----------
drop function if exists public.resoudre_defi(bigint);
create or replace function public.resoudre_duel(p_duel_id bigint)
returns void as $$
declare
  v_gagnant integer;
  v_votant record;
begin
  select quartier_choisi_id into v_gagnant
  from votes_duels
  where duel_id = p_duel_id
  group by quartier_choisi_id
  order by count(*) desc
  limit 1;

  update duels_quartier set resolu = true, gagnant_id = v_gagnant where id = p_duel_id;

  for v_votant in
    select user_id from votes_duels
    where duel_id = p_duel_id and quartier_choisi_id = v_gagnant
  loop
    perform public.crediter_notacoins(v_votant.user_id, 'duel_gagnant_bonus', 'duels_quartier', p_duel_id);
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- 8. Vues de classement : recalées sur notacoins ----------
-- (les vues v_classement_residents / v_classement_voyageurs sont sur les
-- villes, pas sur les personnes : elles ne référençaient pas "points" et
-- n'ont donc pas besoin d'être touchées.)

-- ======================================================
-- ==== 04_defis_schema.sql
-- ======================================================
-- ============================================================
-- NOTAVILLE — Migration 04 : système de Défis / gamification (Phase 1)
-- À exécuter après 03_renommage_duels_notacoins.sql
--
-- Portée de cette Phase 1 (le reste est documenté en Phase 2 dans le
-- README) : catégories de défis, défis à action simple et multi-étapes,
-- défis globaux/longue durée, participations, contributions avec
-- workflow de validation, défis photo avec vote communautaire et
-- anti-abus, badges à paliers, alimentation des statistiques de ville
-- avec anonymisation obligatoire des données sensibles (ex: salaires).
--
-- Règle produit non négociable : aucun défi n'est jamais obligatoire
-- pour utiliser Notaville. Les pages villes, comparateurs, guides,
-- cartes et conseils restent 100% accessibles sans faire de défi ni
-- regarder de pub. Cette règle est appliquée au niveau de l'application
-- (aucune page "coeur" ne doit vérifier une participation à un défi),
-- pas au niveau du schéma.
-- ============================================================

-- ---------- 1. Catégories de défis ----------
-- `type` distingue les défis "coeur de Notaville" (ville, voyage,
-- contribution) des défis secondaires (partenaire, jeu). C'est ce champ
-- qui permet à la page /defis de toujours mettre les premiers en avant,
-- conformément à l'exigence : "Notaville ne doit PAS devenir un clone
-- de JustPlay. Les défis liés aux villes, aux voyages et aux
-- contributions doivent être au coeur de la gamification."
create table if not exists categories_defis (
  id bigint generated always as identity primary key,
  cle text not null unique,
  nom text not null,
  description text not null default '',
  -- clé sobre résolue par components/Icone.js côté app (ex: 'trophee',
  -- 'compass') -- plus d'émoji stocké en base, voir la note dans app/page.js.
  icone text not null default 'trophee',
  type text not null check (type in ('ville', 'voyage', 'contribution', 'partenaire', 'jeu')),
  ordre integer not null default 100,
  actif boolean not null default true
);

alter table categories_defis enable row level security;
create policy "Les catégories de défis sont lisibles par tous"
  on categories_defis for select to anon, authenticated using (true);

-- ---------- 2. Défis ----------
-- `date_fin` nul = défi global / longue durée (pas de date de fin).
-- `ville_code_insee` / `quartier_id` nuls = défi valable partout.
-- Les montants de récompense pointent vers parametres_recompenses
-- (jamais de valeur en dur ici non plus) via `cle_recompense`.
create table if not exists defis (
  id bigint generated always as identity primary key,
  categorie_id bigint not null references categories_defis(id),
  titre text not null,
  description text not null,
  instructions text not null default '',
  type_participation text not null check (
    type_participation in ('action_simple', 'multi_etapes', 'photo', 'contribution_donnee', 'externe')
  ),
  cle_recompense text not null references parametres_recompenses(cle),
  ville_code_insee text references villes(code_insee),
  quartier_id integer references quartiers(id),
  donnee_cle text, -- utilisé uniquement quand type_participation = 'contribution_donnee' (doit correspondre à une ligne de parametres_anonymat)
  lien_externe text,
  date_debut timestamptz not null default now(),
  date_fin timestamptz,
  palier_cible integer,
  actif boolean not null default true,
  ordre integer not null default 100,
  created_at timestamptz not null default now()
);

alter table defis enable row level security;
create policy "Les défis actifs sont lisibles par tous"
  on defis for select to anon, authenticated using (true);
-- Création/édition réservée à la console Supabase (service_role) en
-- Phase 1 : "Les défis doivent être entièrement configurables sans
-- modifier le code" est satisfait par le Table editor Supabase, sans
-- qu'il soit nécessaire de livrer une UI d'admin custom dès la V1.

-- ---------- 3. Étapes des défis multi-étapes ----------
create table if not exists defi_etapes (
  id bigint generated always as identity primary key,
  defi_id bigint not null references defis(id) on delete cascade,
  ordre integer not null,
  titre text not null,
  description text not null default '',
  unique (defi_id, ordre)
);

alter table defi_etapes enable row level security;
create policy "Les étapes de défis sont lisibles par tous"
  on defi_etapes for select to anon, authenticated using (true);

-- ---------- 4. Participations ----------
create table if not exists participations (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  defi_id bigint not null references defis(id) on delete cascade,
  etape_courante integer not null default 0,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'terminee', 'abandonnee')),
  commencee_le timestamptz not null default now(),
  terminee_le timestamptz,
  unique (user_id, defi_id)
);

alter table participations enable row level security;
create policy "Chacun voit ses propres participations"
  on participations for select to authenticated using (auth.uid() = user_id);
create policy "Chacun démarre ses propres participations"
  on participations for insert to authenticated with check (auth.uid() = user_id);
create policy "Chacun met à jour ses propres participations"
  on participations for update to authenticated using (auth.uid() = user_id);

-- ---------- 5. Contributions ----------
-- Une contribution est ce que la personne soumet pour valider une étape,
-- un défi photo, ou une donnée de statistique de ville. Workflow :
-- en_attente -> validee (crédite les Notacoins) ou rejetee.
create table if not exists contributions (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  defi_id bigint not null references defis(id) on delete cascade,
  participation_id bigint references participations(id) on delete cascade,
  type_contribution text not null check (
    type_contribution in ('texte', 'photo', 'donnee_statistique')
  ),
  contenu jsonb not null default '{}',
  photo_url text,
  donnee_cle text,
  donnee_valeur numeric,
  ville_code_insee text references villes(code_insee),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'validee', 'rejetee')),
  motif_rejet text,
  cle_recompense text references parametres_recompenses(cle),
  notacoins_credites boolean not null default false,
  created_at timestamptz not null default now(),
  traitee_le timestamptz
);

alter table contributions enable row level security;
create policy "Chacun voit ses propres contributions"
  on contributions for select to authenticated using (auth.uid() = user_id);
create policy "Les contributions validées sont visibles par tous (pour les défis photo)"
  on contributions for select to authenticated using (statut = 'validee');
create policy "Chacun crée ses propres contributions"
  on contributions for insert to authenticated with check (auth.uid() = user_id);
-- Pas de policy update pour les utilisateurs : le passage
-- en_attente -> validee/rejetee se fait uniquement via la console
-- Supabase (service_role) en Phase 1, ce qui empêche toute personne de
-- s'auto-valider. Message exact à afficher côté app quand
-- statut = 'rejetee' (texte imposé, ne pas reformuler) :
--   "Les contributions manifestement fausses, incohérentes ou
--    frauduleuses peuvent entraîner l'annulation des Notacoins associés."

-- Crédite automatiquement les Notacoins quand une contribution passe à
-- "validee" (et seulement à ce moment, jamais à la simple soumission).
create or replace function public.on_contribution_validee()
returns trigger as $$
begin
  if new.statut = 'validee' and old.statut is distinct from 'validee' and not new.notacoins_credites then
    perform public.crediter_notacoins(
      new.user_id,
      coalesce(new.cle_recompense, 'defi_action_simple'),
      'contributions',
      new.id
    );
    new.notacoins_credites := true;
    new.traitee_le := now();
  elsif new.statut = 'rejetee' and old.statut is distinct from 'rejetee' then
    new.traitee_le := now();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_contribution_update on contributions;
create trigger before_contribution_update
  before update on contributions
  for each row execute procedure public.on_contribution_validee();

-- ---------- 6. Vote communautaire sur les contributions photo ----------
-- Anti-abus : contrainte unique (un vote par personne et par photo),
-- interdiction de voter pour sa propre contribution (trigger), et
-- limite anti-spam déjà gérée par crediter_notacoins pour la raison
-- 'vote_photo'.
create table if not exists votes_contributions (
  id bigint generated always as identity primary key,
  contribution_id bigint not null references contributions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  valeur smallint not null check (valeur in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (contribution_id, user_id)
);

alter table votes_contributions enable row level security;
create policy "Les votes sur les contributions sont lisibles par tous"
  on votes_contributions for select to authenticated using (true);
create policy "Chacun vote en son propre nom"
  on votes_contributions for insert to authenticated with check (auth.uid() = user_id);

create or replace function public.interdire_autovote()
returns trigger as $$
declare
  v_auteur uuid;
begin
  select user_id into v_auteur from contributions where id = new.contribution_id;
  if v_auteur = new.user_id then
    raise exception 'Impossible de voter pour sa propre contribution.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_vote_contribution on votes_contributions;
create trigger before_vote_contribution
  before insert on votes_contributions
  for each row execute procedure public.interdire_autovote();

create or replace function public.on_vote_contribution_created_credit()
returns trigger as $$
begin
  perform public.crediter_notacoins(new.user_id, 'vote_photo', 'votes_contributions', new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists after_vote_contribution on votes_contributions;
create trigger after_vote_contribution
  after insert on votes_contributions
  for each row execute procedure public.on_vote_contribution_created_credit();

-- ---------- 7. Badges à paliers ----------
create table if not exists badges (
  id bigint generated always as identity primary key,
  cle text not null unique,
  nom text not null,
  description text not null default '',
  icone text not null default 'recompense' -- clé sobre, voir la note ligne 32
);

alter table badges enable row level security;
create policy "Les badges sont lisibles par tous"
  on badges for select to anon, authenticated using (true);

create table if not exists badge_niveaux (
  id bigint generated always as identity primary key,
  badge_id bigint not null references badges(id) on delete cascade,
  niveau text not null check (niveau in ('bronze', 'argent', 'or', 'platine', 'legendaire')),
  seuil integer not null,
  ordre integer not null,
  unique (badge_id, niveau)
);

alter table badge_niveaux enable row level security;
create policy "Les niveaux de badges sont lisibles par tous"
  on badge_niveaux for select to anon, authenticated using (true);

create table if not exists profil_badges (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  badge_id bigint not null references badges(id) on delete cascade,
  niveau_id bigint not null references badge_niveaux(id) on delete cascade,
  obtenu_le timestamptz not null default now(),
  unique (user_id, badge_id, niveau_id)
);

alter table profil_badges enable row level security;
create policy "Les badges obtenus sont visibles par tous"
  on profil_badges for select to authenticated using (true);

-- Attribution des badges : en Phase 1, un job planifié (pg_cron ou
-- appel manuel périodique) appelle cette fonction, qui compare les
-- compteurs de chacun aux seuils et insère les badges nouvellement
-- atteints. Pas de trigger temps réel pour rester simple et éviter les
-- calculs coûteux à chaque insertion (voir README pour l'automatisation).
create or replace function public.recalculer_badges(p_user_id uuid)
returns void as $$
declare
  v_nb_contributions integer;
  v_nb_avis integer;
  v_nb_defis_completes integer;
begin
  select count(*) into v_nb_contributions from contributions where user_id = p_user_id and statut = 'validee';
  select count(*) into v_nb_avis from avis where user_id = p_user_id;
  select count(*) into v_nb_defis_completes from participations where user_id = p_user_id and statut = 'terminee';

  insert into profil_badges (user_id, badge_id, niveau_id)
  select p_user_id, bn.badge_id, bn.id
  from badge_niveaux bn
  join badges b on b.id = bn.badge_id
  where
    (b.cle = 'contributeur' and v_nb_contributions >= bn.seuil)
    or (b.cle = 'chroniqueur' and v_nb_avis >= bn.seuil)
    or (b.cle = 'explorateur_defis' and v_nb_defis_completes >= bn.seuil)
  on conflict (user_id, badge_id, niveau_id) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- 8. Statistiques de ville : anonymisation obligatoire ----------
-- Règle non négociable : "Ne jamais afficher le salaire individuel d'un
-- utilisateur. Les données doivent être anonymisées et agrégées." Le
-- seuil minimum de contributions avant affichage est lui-même
-- configurable (pas codé en dur).
create table if not exists parametres_anonymat (
  donnee_cle text primary key,
  seuil_minimum integer not null,
  description text not null default ''
);

alter table parametres_anonymat enable row level security;
create policy "Les seuils d'anonymisation sont lisibles par tous"
  on parametres_anonymat for select to anon, authenticated using (true);

insert into parametres_anonymat (donnee_cle, seuil_minimum, description) values
  ('salaire_net_mensuel', 5, 'Nombre minimum de contributions salariales avant affichage agrégé par ville'),
  ('loyer_m2', 5, 'Nombre minimum de contributions loyer avant affichage agrégé par ville')
on conflict (donnee_cle) do nothing;

-- Cette vue est LA SEULE façon d'exposer les données de contribution :
-- elle ne renvoie jamais une ligne par utilisateur, uniquement des
-- agrégats par ville, et seulement quand le nombre de contributions
-- valides atteint le seuil configuré. Aucune page de l'application ne
-- doit interroger `contributions` directement pour afficher des
-- statistiques : toujours passer par cette vue.
create or replace view v_stats_ville_anonymisees as
select
  c.ville_code_insee,
  v.nom as ville,
  c.donnee_cle,
  count(*) as nb_contributions,
  round(avg(c.donnee_valeur)::numeric, 2) as moyenne,
  round(percentile_cont(0.5) within group (order by c.donnee_valeur)::numeric, 2) as mediane,
  round(min(c.donnee_valeur)::numeric, 2) as minimum,
  round(max(c.donnee_valeur)::numeric, 2) as maximum
from contributions c
join villes v on v.code_insee = c.ville_code_insee
join parametres_anonymat pa on pa.donnee_cle = c.donnee_cle
where c.statut = 'validee' and c.type_contribution = 'donnee_statistique'
group by c.ville_code_insee, v.nom, c.donnee_cle, pa.seuil_minimum
having count(*) >= pa.seuil_minimum;

-- ---------- 9. Classements liés aux défis (protégés contre le spam) ----------
-- S'appuie sur le grand livre notacoins_transactions (traçable, et déjà
-- plafonné par limites_anti_abus), jamais sur un compteur brut
-- manipulable.
create or replace view v_classement_notacoins as
select
  p.id as user_id,
  p.pseudo,
  p.notacoins,
  v.nom as ville_origine
from profiles p
left join villes v on v.code_insee = p.ville_origine_code
order by p.notacoins desc;

-- Le recalcul de badges est déclenché depuis le client après qu'une
-- personne termine une participation : il faut donc l'exposer en RPC.
grant execute on function public.recalculer_badges(uuid) to authenticated;

create or replace view v_classement_contributeurs as
select
  p.id as user_id,
  p.pseudo,
  count(*) filter (where c.statut = 'validee') as contributions_validees
from profiles p
join contributions c on c.user_id = p.id
group by p.id, p.pseudo
having count(*) filter (where c.statut = 'validee') > 0
order by contributions_validees desc;

-- ======================================================
-- ==== 05_defis_seed.sql
-- ======================================================
-- ============================================================
-- NOTAVILLE — Migration 05 : contenu d'exemple pour les défis
-- À exécuter après 04_defis_schema.sql
--
-- Ces lignes sont un point de départ éditable depuis le Table editor
-- Supabase (aucune n'a besoin d'être modifiée en code). L'ordre des
-- catégories met volontairement en avant ville/voyage/contribution
-- avant partenaire/jeu.
-- ============================================================

-- icone : clé sobre résolue par components/Icone.js côté app (voir la
-- note dans 04_defis_schema.sql) -- plus d'émoji stocké en base.
insert into categories_defis (cle, nom, description, icone, type, ordre) values
  ('vie_de_quartier', 'Vie de quartier', 'Contribue à la connaissance de ton quartier au quotidien', 'batiment', 'ville', 10),
  ('exploration_voyage', 'Exploration & voyage', 'Note et raconte les villes que tu traverses', 'compass', 'voyage', 20),
  ('donnees_utiles', 'Données utiles', 'Coût de la vie, loyers, salaires anonymisés : aide la communauté', 'wallet', 'contribution', 30),
  ('photo_du_mois', 'Photo du mois', 'Partage le meilleur cliché de ta ville, la communauté vote', 'camera', 'contribution', 40),
  ('offres_partenaires', 'Offres partenaires', 'Bons plans ponctuels de partenaires de Notaville', 'cadeau', 'partenaire', 90),
  ('mini_jeux', 'Mini-jeux', 'Quiz et jeux légers sur les villes de France', 'jeu', 'jeu', 100)
on conflict (cle) do nothing;

insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'Note 5 quartiers de ta ville', 'Swipe sur 5 quartiers de ta ville d''origine pour affiner sa fiche.', 'Va dans Découvrir et swipe j''aime/passe sur 5 quartiers de ta ville.', 'multi_etapes', 'defi_etape', now(), null::timestamptz, 5, 10, null
from categories_defis where cle = 'vie_de_quartier'
union all
select id, 'Rédige ton premier avis détaillé', 'Un avis détaillé vaut plus qu''un swipe : partage ce qui est bien et ce qui l''est moins.', 'Rends-toi sur Avis, choisis un quartier et publie ta note avec au moins un point fort et un point faible.', 'action_simple', 'avis_detaille', now(), null::timestamptz, null, 20, null
from categories_defis where cle = 'vie_de_quartier'
union all
select id, 'Note une ville visitée cette année', 'Même à l''étranger : partage ton impression de voyageur sur une ville où tu es passé.', 'Recherche la ville, ajoute un avis détaillé en tant que voyageur (elle ne doit pas être ta ville d''origine).', 'action_simple', 'avis_detaille', now(), null::timestamptz, null, 10, null
from categories_defis where cle = 'exploration_voyage'
union all
select id, 'Défi voyage : 3 villes, 3 pays', 'Objectif long terme, sans date limite : note des villes dans 3 pays différents.', 'Publie un avis détaillé sur au moins une ville dans chacun de 3 pays différents.', 'multi_etapes', 'defi_global_palier', now(), null::timestamptz, 3, 20, null
from categories_defis where cle = 'exploration_voyage'
union all
select id, 'Partage le loyer moyen de ton quartier', 'Donnée 100% anonyme : jamais affichée individuellement, seulement en moyenne à partir de 5 contributions.', 'Indique le loyer au m² que tu payes. Cette donnée n''est jamais montrée à ton nom.', 'contribution_donnee', 'defi_action_simple', now(), null::timestamptz, null, 10, 'loyer_m2'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Photo du mois : ta ville sous son meilleur jour', 'Une photo, votée par la communauté. Les mieux notées sont mises en avant sur la fiche ville.', 'Ajoute une photo avec le nom de la ville. Les autres membres votent, tu ne peux pas voter pour ta propre photo.', 'photo', 'defi_photo', now(), null::timestamptz, null, 10, null
from categories_defis where cle = 'photo_du_mois'
on conflict do nothing;

-- Étapes du défi multi-étapes "Note 5 quartiers de ta ville"
insert into defi_etapes (defi_id, ordre, titre, description)
select d.id, s.ordre, s.titre, ''
from defis d
cross join (values (1, 'Quartier 1'), (2, 'Quartier 2'), (3, 'Quartier 3'), (4, 'Quartier 4'), (5, 'Quartier 5')) as s(ordre, titre)
where d.titre = 'Note 5 quartiers de ta ville'
on conflict (defi_id, ordre) do nothing;

-- ---------- Badges ----------
insert into badges (cle, nom, description, icone) values
  ('contributeur', 'Contributeur', 'Contributions validées (avis, données, photos)', 'recompense'),
  ('chroniqueur', 'Chroniqueur', 'Avis détaillés publiés', 'plume'),
  ('explorateur_defis', 'Explorateur', 'Défis menés jusqu''au bout', 'compass')
on conflict (cle) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values
  ('bronze', 5, 1), ('argent', 20, 2), ('or', 50, 3), ('platine', 150, 4), ('legendaire', 500, 5)
) as s(niveau, seuil, ordre)
where b.cle = 'contributeur'
on conflict (badge_id, niveau) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values
  ('bronze', 3, 1), ('argent', 10, 2), ('or', 30, 3), ('platine', 100, 4), ('legendaire', 300, 5)
) as s(niveau, seuil, ordre)
where b.cle = 'chroniqueur'
on conflict (badge_id, niveau) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values
  ('bronze', 1, 1), ('argent', 5, 2), ('or', 15, 3), ('platine', 40, 4), ('legendaire', 100, 5)
) as s(niveau, seuil, ordre)
where b.cle = 'explorateur_defis'
on conflict (badge_id, niveau) do nothing;

-- ======================================================
-- ==== 06_defis_extension.sql
-- ======================================================
-- ============================================================
-- NOTAVILLE — Migration 06 : extension du système de Défis
-- À exécuter après 05_defis_seed.sql
--
-- Comble les manques de la Phase 1 par rapport au cahier des charges
-- complet : difficulté/image/quota sur les défis, quiz auto-corrigés,
-- classements hebdo/mensuel/par ville, données OFFICIELLES vs
-- COMMUNAUTAIRES vs ESTIMATION avec provenance affichée, et une vraie
-- administration (pas seulement le Table editor Supabase) pilotable
-- depuis l'app par les comptes marqués administrateurs.
-- ============================================================

-- ---------- 1. Comptes administrateurs ----------
alter table profiles add column if not exists est_admin boolean not null default false;

create or replace function public.est_administrateur()
returns boolean as $$
  select coalesce((select est_admin from profiles where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

-- Pour te nommer administrateur toi-même : lance ceci une fois dans le
-- SQL editor Supabase, avec ton propre e-mail :
--   update profiles set est_admin = true
--   where id = (select id from auth.users where email = 'ton-email@exemple.com');

-- ---------- 1bis. Catégories : élargir le type aux 9 familles du cahier des charges ----------
alter table categories_defis drop constraint if exists categories_defis_type_check;
alter table categories_defis add constraint categories_defis_type_check check (
  type in ('ville', 'voyage', 'contribution', 'patrimoine', 'gastronomie', 'connaissance', 'communaute', 'evenementiel', 'partenaire', 'jeu')
);

-- ---------- 1ter. Défis : le quiz (catégorie Connaissances) est un type de participation à part entière ----------
alter table defis drop constraint if exists defis_type_participation_check;
alter table defis add constraint defis_type_participation_check check (
  type_participation in ('action_simple', 'multi_etapes', 'photo', 'contribution_donnee', 'quiz', 'externe')
);

alter table contributions drop constraint if exists contributions_type_contribution_check;
alter table contributions add constraint contributions_type_contribution_check check (
  type_contribution in ('texte', 'photo', 'donnee_statistique', 'quiz')
);

-- ---------- 2. Défis : champs manquants du cahier des charges ----------
alter table defis add column if not exists difficulte text check (difficulte in ('facile', 'moyen', 'difficile')) default 'facile';
alter table defis add column if not exists image_url text;
alter table defis add column if not exists max_participations integer; -- null = illimité
alter table defis add column if not exists pays text default 'France'; -- prêt pour l'international, non exploité tant que les données ne couvrent que la France
alter table defis add column if not exists portee_temporelle text
  check (portee_temporelle in ('permanent', 'jour', 'semaine', 'mois', 'saison', 'evenement'))
  default 'permanent';

-- ---------- 3. Droits d'administration DEPUIS L'APPLICATION ----------
-- En plus du Table editor Supabase (toujours utilisable), les comptes
-- est_admin=true peuvent maintenant créer/modifier/désactiver des
-- défis, catégories, étapes et badges, et valider/rejeter des
-- contributions directement depuis /admin/defis dans l'app.
create policy "Les admins gèrent les catégories" on categories_defis
  for all to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

create policy "Les admins gèrent les défis" on defis
  for all to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

create policy "Les admins gèrent les étapes" on defi_etapes
  for all to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

create policy "Les admins gèrent les badges" on badges
  for all to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

create policy "Les admins gèrent les niveaux de badges" on badge_niveaux
  for all to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

create policy "Les admins voient toutes les contributions" on contributions
  for select to authenticated using (public.est_administrateur());

create policy "Les admins valident ou rejettent les contributions" on contributions
  for update to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

create policy "Les admins voient toutes les participations" on participations
  for select to authenticated using (public.est_administrateur());

-- ---------- 4. Quiz auto-corrigés (catégorie Connaissances) ----------
create table if not exists defi_quiz (
  id bigint generated always as identity primary key,
  defi_id bigint not null references defis(id) on delete cascade,
  question text not null,
  choix text[] not null,
  bonne_reponse smallint not null
);

alter table defi_quiz enable row level security;
create policy "Les quiz sont lisibles par tous" on defi_quiz for select to authenticated using (true);
create policy "Les admins gèrent les quiz" on defi_quiz
  for all to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

-- ---------- 5. Un seul point d'entrée pour la validation + le crédit ----------
-- Remplace le trigger de la migration 04 : gère maintenant aussi la
-- correction automatique des quiz à l'insertion (validation
-- automatique explicitement prévue par le cahier des charges, section 6).
drop trigger if exists before_contribution_update on contributions;
drop function if exists public.on_contribution_validee();

create or replace function public.traiter_contribution()
returns trigger as $$
declare
  v_type_participation text;
  v_bonne_reponse smallint;
  v_reponse_donnee integer;
begin
  -- Auto-correction des quiz, uniquement à la création de la contribution.
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

  -- Crédit des Notacoins au moment (et seulement au moment) où le
  -- statut devient "validee", que ce soit à l'insertion (quiz) ou lors
  -- d'une validation manuelle ultérieure par un admin.
  if new.statut = 'validee'
     and (tg_op = 'INSERT' or old.statut is distinct from 'validee')
     and not new.notacoins_credites then
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

create trigger before_contribution_write
  before insert or update on contributions
  for each row execute procedure public.traiter_contribution();

-- ---------- 6. Quota de participants (max_participations) ----------
create or replace function public.verifier_quota_participation()
returns trigger as $$
declare
  v_max integer;
  v_nb integer;
begin
  select max_participations into v_max from defis where id = new.defi_id;
  if v_max is not null then
    select count(*) into v_nb from participations where defi_id = new.defi_id;
    if v_nb >= v_max then
      raise exception 'Ce défi a atteint son nombre maximum de participations.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_participation_quota on participations;
create trigger before_participation_quota
  before insert on participations
  for each row execute procedure public.verifier_quota_participation();

-- ---------- 7. Compteurs (participants, votes) pour "populaires" et le detail d'un défi ----------
create or replace view v_defis_compteurs as
select
  d.id as defi_id,
  count(distinct p.id) as nb_participants,
  count(distinct p.id) filter (where p.statut = 'terminee') as nb_termines
from defis d
left join participations p on p.defi_id = d.id
group by d.id;

-- Classement des photos d'un défi photo (pour la section "votes + top 10").
create or replace view v_classement_photos_defi as
select
  c.id as contribution_id,
  c.defi_id,
  c.user_id,
  c.photo_url,
  coalesce(sum(vc.valeur), 0) as score,
  count(vc.id) as nb_votes
from contributions c
left join votes_contributions vc on vc.contribution_id = c.id
where c.type_contribution = 'photo' and c.statut = 'validee'
group by c.id, c.defi_id, c.user_id, c.photo_url
order by score desc;

-- ---------- 8. Classements hebdo / mensuel / par ville ----------
-- Basés sur le grand livre notacoins_transactions (déjà plafonné
-- anti-spam), fenêtré par date plutôt que sur le solde total.
create or replace view v_classement_hebdomadaire as
select p.id as user_id, p.pseudo, v.nom as ville_origine, sum(t.montant) as notacoins_semaine
from notacoins_transactions t
join profiles p on p.id = t.user_id
left join villes v on v.code_insee = p.ville_origine_code
where t.created_at >= date_trunc('week', now())
group by p.id, p.pseudo, v.nom
having sum(t.montant) > 0
order by notacoins_semaine desc;

create or replace view v_classement_mensuel as
select p.id as user_id, p.pseudo, v.nom as ville_origine, sum(t.montant) as notacoins_mois
from notacoins_transactions t
join profiles p on p.id = t.user_id
left join villes v on v.code_insee = p.ville_origine_code
where t.created_at >= date_trunc('month', now())
group by p.id, p.pseudo, v.nom
having sum(t.montant) > 0
order by notacoins_mois desc;

create or replace view v_classement_par_ville as
select
  p.ville_origine_code as code_insee,
  v.nom as ville,
  p.id as user_id,
  p.pseudo,
  p.notacoins
from profiles p
join villes v on v.code_insee = p.ville_origine_code
order by v.nom, p.notacoins desc;

-- (Classement mondial = v_classement_notacoins, migration 04.
--  Classement "par pays" et "entre amis" : voir README, Phase 2 — la
--  base ne couvre que des villes françaises pour l'instant, et il n'y
--  a pas encore de relation d'amitié entre profils.)

-- ---------- 9. Statistiques de ville : OFFICIAL vs COMMUNITY vs ESTIMATE ----------
-- Saisies officielles (INSEE, Eurostat, sources publiques...), entrées
-- par un admin — jamais par un utilisateur normal (RLS ci-dessous).
create table if not exists donnees_officielles (
  id bigint generated always as identity primary key,
  ville_code_insee text not null references villes(code_insee),
  donnee_cle text not null,
  valeur numeric not null,
  source_url text,
  date_maj timestamptz not null default now(),
  unique (ville_code_insee, donnee_cle)
);

alter table donnees_officielles enable row level security;
create policy "Les données officielles sont lisibles par tous"
  on donnees_officielles for select to anon, authenticated using (true);
create policy "Seuls les admins saisissent les données officielles"
  on donnees_officielles for all to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

-- Vue unique consommée par la page ville : priorité aux données
-- officielles quand elles existent, sinon agrégat communautaire
-- anonymisé quand le seuil est atteint (jamais de ligne individuelle),
-- avec la provenance toujours indiquée pour l'affichage
-- ("Officiel" / "Communauté" / "Estimation Notaville").
create or replace view v_stats_ville_completes as
select
  coalesce(o.ville_code_insee, c.ville_code_insee) as ville_code_insee,
  coalesce(o.donnee_cle, c.donnee_cle) as donnee_cle,
  case when o.valeur is not null then o.valeur else c.moyenne end as valeur,
  case when o.valeur is not null then 'officiel' else 'communaute' end as provenance,
  o.source_url,
  coalesce(o.date_maj, null) as date_maj_officielle,
  c.nb_contributions
from donnees_officielles o
full outer join v_stats_ville_anonymisees c
  on c.ville_code_insee = o.ville_code_insee and c.donnee_cle = o.donnee_cle;

grant execute on function public.est_administrateur() to authenticated, anon;

-- ======================================================
-- ==== 07_defis_catalogue.sql
-- ======================================================
-- ============================================================
-- NOTAVILLE — Migration 07 : catalogue complet de défis
-- À exécuter après 06_defis_extension.sql
--
-- Reprend précisément la taxonomie demandée : Découverte, Photo,
-- Patrimoine, Gastronomie, Vie quotidienne, Connaissances, Voyage,
-- Communauté, Défis événementiels — plus les offres partenaires et
-- mini-jeux, volontairement secondaires. Tout ceci reste éditable
-- depuis le Table editor Supabase ou depuis /admin/defis (Phase 1
-- application) sans toucher au code.
-- ============================================================

-- ---------- 1. Réaligne les catégories de la migration 05 sur les noms du cahier des charges ----------
-- icone : clé sobre résolue par components/Icone.js (voir 04_defis_schema.sql).
update categories_defis set nom = 'Découverte', icone = 'compass', type = 'ville', description = 'Explore ta ville et ses quartiers sous un nouvel angle', ordre = 10 where cle = 'vie_de_quartier';
update categories_defis set nom = 'Voyage', icone = 'carte', type = 'voyage', description = 'Note et documente les villes que tu traverses', ordre = 70 where cle = 'exploration_voyage';
update categories_defis set nom = 'Vie quotidienne', icone = 'wallet', type = 'contribution', description = 'Prix, loyers, salaires anonymisés : la donnée la plus utile de Notaville', ordre = 50 where cle = 'donnees_utiles';
update categories_defis set nom = 'Photo', icone = 'camera', type = 'contribution', description = 'Immortalise ta ville, la communauté vote pour les meilleurs clichés', ordre = 20 where cle = 'photo_du_mois';
update categories_defis set nom = 'Offres partenaires', icone = 'cadeau', ordre = 200 where cle = 'offres_partenaires';
update categories_defis set nom = 'Mini-jeux', icone = 'jeu', ordre = 210 where cle = 'mini_jeux';

insert into categories_defis (cle, nom, description, icone, type, ordre) values
  ('patrimoine', 'Patrimoine', 'Monuments, lieux historiques et curiosités architecturales', 'landmark', 'patrimoine', 30),
  ('gastronomie', 'Gastronomie', 'Bonnes adresses et prix réels, du café au restaurant', 'restaurant', 'gastronomie', 40),
  ('connaissances', 'Connaissances', 'Quiz et devinettes sur les villes du monde', 'livre', 'connaissance', 60),
  ('communaute', 'Communauté', 'Complète et améliore les fiches de Notaville', 'utilisateurs', 'communaute', 80),
  ('evenementiel', 'Défis événementiels', 'Défis du moment : jour, semaine, mois et saisons', 'flamme', 'evenementiel', 90)
on conflict (cle) do nothing;

-- ---------- 2. Récompenses supplémentaires, alignées sur les exemples du cahier des charges ----------
insert into parametres_recompenses (cle, valeur, description) values
  ('photo_monument', 100, 'Ajouter une photo dans le défi patrimoine'),
  ('prix_quotidien', 50, 'Renseigner un prix du quotidien (café, bière, transport...)'),
  ('defi_multi_patrimoine', 250, 'Compléter un défi patrimoine multi-étapes'),
  ('salaire_mensuel', 100, 'Renseigner son salaire net mensuel (anonymisé, jamais montré individuellement)'),
  ('quiz_correct', 15, 'Bonne réponse à un quiz')
on conflict (cle) do nothing;

-- ---------- 3. Découverte ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'Découvre ta ville', 'Swipe sur 10 quartiers de ta ville d''origine.', 'Va dans Découvrir et note 10 quartiers.', 'multi_etapes', 'defi_etape', 'facile', 'permanent', now(), null::timestamptz, 10, 5, null from categories_defis where cle = 'vie_de_quartier'
union all
select id, 'Touriste dans ta propre ville', 'Visite et note un lieu de ta ville que tu n''avais jamais vu.', 'Rédige un avis détaillé sur un quartier que tu ne connais pas encore.', 'action_simple', 'avis_detaille', 'facile', 'permanent', now(), null::timestamptz, null::integer, 15, null from categories_defis where cle = 'vie_de_quartier'
union all
select id, 'Explore ta ville à pied', 'Documente une balade à pied dans un quartier peu visité.', 'Ajoute une photo et un avis sur un quartier que tu as exploré à pied.', 'photo', 'defi_photo', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 25, null from categories_defis where cle = 'vie_de_quartier'
union all
select id, 'Découvre un lieu caché', 'Partage un endroit peu connu de ta ville.', 'Ajoute une photo et une courte description du lieu.', 'photo', 'defi_photo', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 30, null from categories_defis where cle = 'vie_de_quartier'
on conflict do nothing;

-- ---------- 4. Photo ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Plus belle vue', 'Montre-nous ta plus belle vue sur ta ville.', 'Ajoute une photo. La communauté vote, le top 10 est mis en avant.', 'photo', 'defi_photo', 'facile', 'permanent', now(), null::timestamptz, 10, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Plus beau coucher de soleil', 'Le plus beau coucher de soleil vu depuis ta ville.', 'Ajoute ta photo, votée par la communauté.', 'photo', 'defi_photo', 'facile', 'permanent', now(), null::timestamptz, 20, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Street art', 'Repère la plus belle fresque ou œuvre de street art de ta ville.', 'Photo + localisation approximative.', 'photo', 'defi_photo', 'facile', 'permanent', now(), null::timestamptz, 30, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Architecture insolite', 'Un bâtiment qui sort de l''ordinaire.', 'Photo + un mot sur ce qui le rend insolite.', 'photo', 'defi_photo', 'moyen', 'permanent', now(), null::timestamptz, 40, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Avant / après d''un lieu', 'Montre l''évolution d''un lieu dans le temps.', 'Deux photos du même endroit, à des dates différentes.', 'photo', 'defi_photo', 'difficile', 'permanent', now(), null::timestamptz, 50, null from categories_defis where cle = 'photo_du_mois'
on conflict do nothing;

-- ---------- 5. Patrimoine ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'Découvrir un monument', 'Ajoute une photo d''un monument de ta ville.', 'Photo + nom du monument.', 'photo', 'photo_monument', 'facile', 'permanent', now(), null::timestamptz, null::integer, 10, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Découvrir un monument méconnu', 'Un monument que peu de gens connaissent.', 'Photo + pourquoi il mérite d''être connu.', 'photo', 'photo_monument', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 20, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Patrimoine industriel', 'Une ancienne usine, friche ou site industriel reconverti.', 'Photo + un mot d''histoire si tu la connais.', 'photo', 'photo_monument', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 30, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Quiz patrimoine', 'Teste tes connaissances sur le patrimoine de ta région.', 'Réponds à la question. Correction automatique.', 'quiz', 'quiz_correct', 'facile', 'permanent', now(), null::timestamptz, null::integer, 40, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Grand Explorateur du patrimoine', 'Défi complet : découvre le patrimoine de ta ville sous toutes ses formes.', 'Complète les étapes ci-dessous.', 'multi_etapes', 'defi_multi_patrimoine', 'difficile', 'permanent', now(), null::timestamptz, 4, 50, null from categories_defis where cle = 'patrimoine'
on conflict do nothing;

-- ---------- 6. Gastronomie ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Trouver le meilleur café', 'Ton café préféré dans ta ville.', 'Ajoute le nom du lieu et un avis rapide.', 'action_simple', 'defi_action_simple', 'facile', 'permanent', now(), null::timestamptz, 10, null from categories_defis where cle = 'gastronomie'
union all
select id, 'Trouver le meilleur restaurant', 'Ton restaurant préféré, avec le rapport qualité/prix.', 'Ajoute le nom du lieu et un avis rapide.', 'action_simple', 'defi_action_simple', 'facile', 'permanent', now(), null::timestamptz, 20, null from categories_defis where cle = 'gastronomie'
union all
select id, 'Renseigne le prix d''une bière', 'Combien coûte une bière pression dans ton bar habituel ?', 'Indique le prix en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 30, 'prix_biere'
from categories_defis where cle = 'gastronomie'
union all
select id, 'Renseigne le prix d''un café', 'Combien coûte un café au comptoir ?', 'Indique le prix en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 40, 'prix_cafe'
from categories_defis where cle = 'gastronomie'
union all
select id, 'Tester une spécialité locale', 'La spécialité culinaire de ta région.', 'Photo ou description + où la trouver.', 'photo', 'defi_photo', 'moyen', 'permanent', now(), null::timestamptz, 50, null from categories_defis where cle = 'gastronomie'
on conflict do nothing;

-- ---------- 7. Vie quotidienne (alimente directement les statistiques de ville) ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Quel est ton loyer ?', 'Loyer mensuel de ton logement actuel (donnée anonyme, jamais montrée individuellement).', 'Indique ton loyer en euros. Affiché uniquement en moyenne, à partir de 5 contributions.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 10, 'loyer_m2'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Quel est ton salaire net mensuel ?', 'Donnée strictement anonyme, jamais affichée à ton nom.', 'Indique ton salaire net mensuel. Seule une moyenne par ville est publiée, à partir de 5 contributions.', 'contribution_donnee', 'salaire_mensuel', 'facile', 'permanent', now(), null::timestamptz, 20, 'salaire_net_mensuel'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte un plein ?', 'Prix payé pour ton dernier plein d''essence.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 30, 'prix_plein'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte un panier de courses ?', 'Un panier de courses hebdomadaire type.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 40, 'panier_courses'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte ton abonnement transport ?', 'Abonnement transports en commun mensuel.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 50, 'abonnement_transport'
from categories_defis where cle = 'donnees_utiles'
on conflict do nothing;

-- ---------- 8. Connaissances (quiz auto-corrigés) ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Devine la population', 'Sauras-tu deviner la population de la ville proposée ?', 'Choisis la bonne fourchette. Correction automatique.', 'quiz', 'quiz_correct', 'facile', 'permanent', now(), null::timestamptz, 10, null from categories_defis where cle = 'connaissances'
union all
select id, 'Quiz de la ville', 'Un quiz express sur ta ville d''origine.', 'Réponds à la question. Correction automatique.', 'quiz', 'quiz_correct', 'facile', 'permanent', now(), null::timestamptz, 20, null from categories_defis where cle = 'connaissances'
on conflict do nothing;

-- Questions de quiz associées (une par défi quiz créé ci-dessus).
insert into defi_quiz (defi_id, question, choix, bonne_reponse)
select d.id, 'Lille se situe dans quelle région ?', array['Hauts-de-France', 'Normandie', 'Grand Est', 'Île-de-France'], 0
from defis d where d.titre = 'Quiz de la ville'
on conflict do nothing;

insert into defi_quiz (defi_id, question, choix, bonne_reponse)
select d.id, 'Population de Lille (ville-centre, hors métropole) ?', array['~ 40 000', '~ 235 000', '~ 900 000', '~ 2 millions'], 1
from defis d where d.titre = 'Devine la population'
on conflict do nothing;

-- ---------- 9. Voyage ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'Première ville étrangère', 'Note ta première ville visitée hors de France.', 'Ajoute un avis détaillé sur une ville étrangère.', 'action_simple', 'avis_detaille', 'facile', 'permanent', now(), null::timestamptz, null::integer, 10, null from categories_defis where cle = 'exploration_voyage'
union all
select id, '5 villes visitées', 'Note 5 villes différentes que tu as visitées.', 'Ajoute un avis détaillé sur 5 villes distinctes.', 'multi_etapes', 'defi_etape', 'moyen', 'permanent', now(), null::timestamptz, 5, 20, null from categories_defis where cle = 'exploration_voyage'
union all
select id, '10 villes visitées', 'Objectif long terme : 10 villes notées.', 'Ajoute un avis détaillé sur 10 villes distinctes.', 'multi_etapes', 'defi_global_palier', 'difficile', 'permanent', now(), null::timestamptz, 10, 30, null from categories_defis where cle = 'exploration_voyage'
union all
select id, 'Compare deux villes que tu connais', 'Rédige un avis mettant en perspective deux villes.', 'Choisis deux villes que tu as visitées et compare-les en quelques lignes dans deux avis.', 'action_simple', 'avis_detaille', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 40, null from categories_defis where cle = 'exploration_voyage'
on conflict do nothing;

-- ---------- 10. Communauté ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Corriger une information', 'Signale une erreur sur une fiche ville ou quartier.', 'Décris l''erreur et la correction proposée.', 'action_simple', 'defi_action_simple', 'facile', 'permanent', now(), null::timestamptz, 10, null from categories_defis where cle = 'communaute'
union all
select id, 'Ajouter un conseil', 'Un conseil utile pour visiter ou vivre dans ta ville.', 'Rédige un conseil en quelques lignes.', 'action_simple', 'defi_action_simple', 'facile', 'permanent', now(), null::timestamptz, 20, null from categories_defis where cle = 'communaute'
union all
select id, 'Donner son avis de touriste', 'Ton avis sur une ville visitée en tant que touriste.', 'Ajoute un avis détaillé, ce n''est pas ta ville d''origine.', 'action_simple', 'avis_detaille', 'facile', 'permanent', now(), null::timestamptz, 30, null from categories_defis where cle = 'communaute'
on conflict do nothing;

-- ---------- 11. Défis événementiels (portée temporelle) ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Défi du jour', 'Ajoute une photo aujourd''hui pour un bonus rapide.', 'Ajoute une photo avant minuit.', 'photo', 'defi_photo', 'facile', 'jour', now(), now() + interval '1 day', 5, null from categories_defis where cle = 'evenementiel'
union all
select id, 'Défi du week-end', 'Explore un quartier que tu ne connais pas ce week-end.', 'Ajoute un avis détaillé avant dimanche minuit.', 'action_simple', 'avis_detaille', 'facile', 'semaine', now(), now() + interval '2 days', 10, null from categories_defis where cle = 'evenementiel'
union all
select id, 'Défi de la semaine', 'Renseigne 3 prix du quotidien cette semaine.', 'Complète 3 défis "Vie quotidienne" avant dimanche.', 'multi_etapes', 'defi_etape', 'moyen', 'semaine', now(), now() + interval '7 days', 15, null from categories_defis where cle = 'evenementiel'
union all
select id, 'Défi du mois', 'Découvre 5 lieux ce mois-ci.', 'Ajoute 5 photos de lieux différents avant la fin du mois.', 'multi_etapes', 'defi_etape', 'moyen', 'mois', now(), now() + interval '30 days', 20, null from categories_defis where cle = 'evenementiel'
on conflict do nothing;

-- Étapes du défi multi-étapes "Grand Explorateur du patrimoine"
insert into defi_etapes (defi_id, ordre, titre, description)
select d.id, s.ordre, s.titre, ''
from defis d
cross join (values
  (1, 'Ajouter 1 photo de monument'),
  (2, 'Découvrir 1 lieu patrimonial méconnu'),
  (3, 'Répondre au quiz patrimoine'),
  (4, 'Ajouter 1 information historique')
) as s(ordre, titre)
where d.titre = 'Grand Explorateur du patrimoine'
on conflict (defi_id, ordre) do nothing;

-- Défi mondial / long terme (section 4 du cahier des charges), sans
-- ville associée (valable partout), sans date de fin.
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'Tour du monde', 'Objectif long terme, sans date limite : documente 10 villes différentes.', 'Publie un avis détaillé sur 10 villes distinctes, où que ce soit dans le monde.', 'multi_etapes', 'defi_global_palier', 'difficile', 'permanent', now(), null::timestamptz, 10, 5, null from categories_defis where cle = 'exploration_voyage'
union all
select id, 'Photographe du monde', 'Ajoute 100 photos à Notaville, dans n''importe quelle ville.', 'Chaque photo validée dans un défi photo compte pour ce palier.', 'multi_etapes', 'defi_global_palier', 'difficile', 'permanent', now(), null::timestamptz, 100, 10, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Expert du coût de la vie', 'Contribue à 50 données de prix (courses, loyer, transport, énergie...).', 'Chaque contribution "Vie quotidienne" validée compte pour ce palier.', 'multi_etapes', 'defi_global_palier', 'difficile', 'permanent', now(), null::timestamptz, 50, 10, null from categories_defis where cle = 'donnees_utiles'
on conflict do nothing;

-- ---------- 12. Badges — liste exacte du cahier des charges ----------
-- icone : clé sobre résolue par components/Icone.js (voir 04_defis_schema.sql).
insert into badges (cle, nom, description, icone) values
  ('citadin', 'Citadin', 'Contribue régulièrement à sa ville d''origine', 'batiment'),
  ('voyageur', 'Voyageur', 'Note des villes visitées', 'valise'),
  ('explorateur', 'Explorateur', 'Découvre des quartiers et lieux peu connus', 'compass'),
  ('photographe', 'Photographe', 'Ajoute des photos validées', 'camera'),
  ('historien', 'Historien', 'Contribue au patrimoine', 'landmark'),
  ('gourmet', 'Gourmet', 'Partage de bonnes adresses gourmandes', 'restaurant'),
  ('expert_cout_vie', 'Expert du coût de la vie', 'Renseigne des prix et données du quotidien', 'wallet'),
  ('contributeur_communaute', 'Contributeur', 'Améliore les fiches de Notaville', 'utilisateurs'),
  ('ambassadeur', 'Ambassadeur', 'Complète des défis multi-étapes d''une ville', 'recompense'),
  ('globe_trotter', 'Globe-trotter', 'Contribue dans plusieurs pays', 'carte')
on conflict (cle) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values ('bronze', 5, 1), ('argent', 20, 2), ('or', 50, 3), ('platine', 150, 4), ('legendaire', 500, 5)) as s(niveau, seuil, ordre)
where b.cle in ('citadin', 'photographe', 'contributeur_communaute')
on conflict (badge_id, niveau) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values ('bronze', 1, 1), ('argent', 5, 2), ('or', 15, 3), ('platine', 40, 4), ('legendaire', 100, 5)) as s(niveau, seuil, ordre)
where b.cle in ('voyageur', 'explorateur', 'ambassadeur', 'globe_trotter')
on conflict (badge_id, niveau) do nothing;

insert into badge_niveaux (badge_id, niveau, seuil, ordre)
select b.id, s.niveau, s.seuil, s.ordre
from badges b
cross join (values ('bronze', 3, 1), ('argent', 10, 2), ('or', 30, 3), ('platine', 100, 4), ('legendaire', 300, 5)) as s(niveau, seuil, ordre)
where b.cle in ('historien', 'gourmet', 'expert_cout_vie')
on conflict (badge_id, niveau) do nothing;

-- Note : ces nouveaux badges ne sont pas encore reliés à
-- recalculer_badges() (migration 04), qui ne connaît que
-- contributeur/chroniqueur/explorateur_defis. Voir
-- 08_defis_recalcul_badges.sql pour la version étendue.

-- ======================================================
-- ==== 08_defis_recalcul_badges.sql
-- ======================================================
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

-- ======================================================
-- ==== 09_pages_villes_publiques.sql
-- ======================================================
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

-- ======================================================
-- ==== 10_quartiers_coordonnees.sql
-- ======================================================
-- Remplacement du "swipe façon Tinder" par une carte interactive pour
-- /decouvrir (retour utilisateur : la mécanique de swipe ne plaisait
-- pas). Les quartiers ont donc besoin d'une position géographique.
--
-- Couverture actuelle : seuls les 12 quartiers officiels de Lille
-- (59350) reçoivent de vraies coordonnées ici, en repère approximatif
-- (précision "centre de quartier", pas un relevé GPS) -- suffisant pour
-- afficher des punaises cliquables à la bonne échelle visuelle, mais à
-- affiner plus tard. Les quartiers des 134 autres villes déjà seedées
-- (cf. 00_villes_quartiers.sql) restent sans coordonnées pour l'instant :
-- l'UI (/decouvrir) les propose alors sous forme de liste, sous la carte,
-- plutôt que de les faire disparaître. Étendre la couverture
-- géographique (import IGN/OSM, ou contribution communautaire type
-- "positionne ce quartier") est un travail de Phase 2.

alter table quartiers add column if not exists latitude double precision;
alter table quartiers add column if not exists longitude double precision;

update quartiers set latitude = 50.6407, longitude = 3.0603 where ville_code_insee = '59350' and nom = 'Vieux-Lille';
update quartiers set latitude = 50.6365, longitude = 3.0635 where ville_code_insee = '59350' and nom = 'Lille-Centre';
update quartiers set latitude = 50.6255, longitude = 3.0500 where ville_code_insee = '59350' and nom = 'Vauban-Esquermes';
update quartiers set latitude = 50.6229, longitude = 3.0454 where ville_code_insee = '59350' and nom = 'Wazemmes';
update quartiers set latitude = 50.6231, longitude = 3.0653 where ville_code_insee = '59350' and nom = 'Lille-Moulins';
update quartiers set latitude = 50.6420, longitude = 3.0295 where ville_code_insee = '59350' and nom = 'Bois-Blancs';
update quartiers set latitude = 50.6155, longitude = 3.0400 where ville_code_insee = '59350' and nom = 'Faubourg de Béthune';
update quartiers set latitude = 50.6091, longitude = 3.0503 where ville_code_insee = '59350' and nom = 'Lille-Sud';
update quartiers set latitude = 50.6339, longitude = 3.0827 where ville_code_insee = '59350' and nom = 'Fives';
update quartiers set latitude = 50.6420, longitude = 3.0750 where ville_code_insee = '59350' and nom = 'Saint-Maurice Pellevoisin';
update quartiers set latitude = 50.6280, longitude = 3.1000 where ville_code_insee = '59350' and nom = 'Hellemmes';
update quartiers set latitude = 50.6396, longitude = 3.0102 where ville_code_insee = '59350' and nom = 'Lomme';

-- ======================================================
-- ==== 11_lieux.sql
-- ======================================================
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

-- ======================================================
-- ==== 12_defi_ajout_lieu.sql
-- ======================================================
-- Câble l'ajout de lieu au défi communauté "Ajoute un lieu manquant" :
-- contribution -> file d'attente admin (comme les autres) -> validation
-- -> insertion dans `lieux` (supabase/11_lieux.sql) + crédit Notacoins.
-- Pas d'auto-validation (contrairement au quiz) : un lieu ajouté par
-- n'importe qui doit être vérifié avant d'apparaître aux autres.

alter table defis drop constraint if exists defis_type_participation_check;
alter table defis add constraint defis_type_participation_check check (
  type_participation in ('action_simple', 'multi_etapes', 'photo', 'contribution_donnee', 'quiz', 'lieu', 'externe')
);

alter table contributions drop constraint if exists contributions_type_contribution_check;
alter table contributions add constraint contributions_type_contribution_check check (
  type_contribution in ('texte', 'photo', 'donnee_statistique', 'quiz', 'lieu')
);

insert into parametres_recompenses (cle, valeur, description)
values ('ajout_lieu', 40, 'Ajouter un lieu (défi communauté), une fois validé par un admin')
on conflict (cle) do nothing;

insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Ajoute un lieu manquant', 'Un resto, un bar, un monument... qui n''est pas encore sur Notaville ?',
  'Indique son nom, son type, son quartier et une courte description. Vérifié par un admin avant de créditer les Notacoins.',
  'lieu', 'ajout_lieu', 'facile', 'permanent', now(), null::timestamptz, 40, null
from categories_defis where cle = 'communaute'
on conflict do nothing;

-- Remplace la fonction de la migration 06 : ajoute la création du lieu
-- au moment où sa contribution passe à "validee" (insertion ou
-- validation admin ultérieure), en plus de la logique déjà en place
-- (auto-correction quiz, crédit des Notacoins).
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
      insert into lieux (quartier_id, nom, type, description, adresse, source, cree_par, actif)
      values (
        nullif(new.contenu->>'quartier_id', '')::integer,
        new.contenu->>'nom',
        coalesce(nullif(new.contenu->>'type', ''), 'autre'),
        new.contenu->>'description',
        nullif(new.contenu->>'adresse', ''),
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

-- ======================================================
-- ==== 13_defis_villes_precises.sql
-- ======================================================
-- ---------- 13. Défis précis, propres à une ville ----------
-- Le catalogue de 07_defis_catalogue.sql est volontairement générique
-- ("ta ville") et valable partout (ville_code_insee nul). Ici on ajoute
-- une poignée de défis où le nom de la ville est écrit en toutes lettres
-- dans le titre, et où ville_code_insee est renseigné explicitement --
-- ils n'apparaissent donc que pour cette ville précise, et remontent
-- automatiquement dans la section "Près de chez toi" (DefisHub.js filtre
-- déjà sur `d.ville_code_insee === villeOrigineCode`, aucun changement de
-- code nécessaire). Les libellés restent volontairement factuels /
-- ouverts (on demande une photo ou un avis de l'utilisateur, on n'affirme
-- rien sur un lieu précis) pour ne rien avancer qu'on ne puisse garantir.

-- ---------- Lille (59350) ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, ville_code_insee, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'La plus belle vue en hauteur de Lille', 'Beffroi, toit-terrasse, étage élevé... montre-nous Lille vue de haut.', 'Ajoute une photo prise en hauteur, avec le point de vue en légende. La communauté vote, le top est mis en avant.', 'photo', 'defi_photo', '59350', 'facile', 'permanent', now(), null::timestamptz, null::integer, 60, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Sur les traces du Vieux-Lille', 'Une façade, une rue pavée, un détail d''architecture du Vieux-Lille qui mérite d''être vu.', 'Photo + un mot sur l''endroit exact.', 'photo', 'photo_monument', '59350', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 60, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Ta meilleure adresse gourmande à Lille', 'Un estaminet, une pâtisserie, une spécialité du Nord... ton coup de cœur lillois.', 'Photo du plat ou du lieu + le nom de l''adresse.', 'photo', 'defi_photo', '59350', 'facile', 'permanent', now(), null::timestamptz, null::integer, 60, null from categories_defis where cle = 'gastronomie'
union all
select id, 'Une sortie culturelle à Lille', 'Musée, expo, concert, marché... partage une sortie que tu recommandes à Lille.', 'Rédige un avis détaillé sur cette sortie.', 'action_simple', 'avis_detaille', '59350', 'facile', 'permanent', now(), null::timestamptz, null::integer, 40, null from categories_defis where cle = 'communaute'
on conflict do nothing;

-- ---------- Tourcoing (59599) ----------
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, ville_code_insee, difficulte, portee_temporelle, date_debut, date_fin, palier_cible, ordre, donnee_cle)
select id, 'La plus belle vue en hauteur de Tourcoing', 'Un point haut, un toit, une terrasse... montre-nous Tourcoing vue de haut.', 'Ajoute une photo prise en hauteur, avec le point de vue en légende. La communauté vote, le top est mis en avant.', 'photo', 'defi_photo', '59599', 'facile', 'permanent', now(), null::timestamptz, null::integer, 70, null from categories_defis where cle = 'photo_du_mois'
union all
select id, 'Sur les traces du patrimoine textile de Tourcoing', 'Une ancienne filature, une façade industrielle, une trace du passé textile de la ville.', 'Photo + un mot d''histoire si tu la connais.', 'photo', 'photo_monument', '59599', 'moyen', 'permanent', now(), null::timestamptz, null::integer, 70, null from categories_defis where cle = 'patrimoine'
union all
select id, 'Ta meilleure adresse gourmande à Tourcoing', 'Un resto, une friterie, une boulangerie... ton coup de cœur tourquennois.', 'Photo du plat ou du lieu + le nom de l''adresse.', 'photo', 'defi_photo', '59599', 'facile', 'permanent', now(), null::timestamptz, null::integer, 70, null from categories_defis where cle = 'gastronomie'
union all
select id, 'Une sortie culturelle à Tourcoing', 'Expo, spectacle, événement local... partage une sortie que tu recommandes à Tourcoing.', 'Rédige un avis détaillé sur cette sortie.', 'action_simple', 'avis_detaille', '59599', 'facile', 'permanent', now(), null::timestamptz, null::integer, 50, null from categories_defis where cle = 'communaute'
on conflict do nothing;

-- ======================================================
-- ==== 14_demandes_partenariat.sql
-- ======================================================
-- ---------- 14. Demandes de partenariat commerçant ----------
-- Page publique /partenaires : un commerçant remplit un formulaire de
-- contact, sans compte Notaville. Pas d'espace partenaire pour
-- l'instant (cahier des charges : on commence simple) -- juste une
-- table de demandes, lue à la main depuis la console Supabase
-- (service_role), comme les autres tâches d'administration du projet.
create table if not exists demandes_partenariat (
  id bigint generated always as identity primary key,
  nom_contact text not null,
  nom_commerce text not null,
  type_commerce text not null default 'autre',
  ville_code_insee text references villes(code_insee),
  ville_nom text,
  email text not null,
  telephone text,
  message text not null default '',
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'contactee', 'partenaire', 'sans_suite')),
  created_at timestamptz not null default now()
);

alter table demandes_partenariat enable row level security;

-- N'importe qui (visiteur non connecté inclus, c'est tout le principe
-- d'un formulaire de contact commerçant) peut déposer une demande.
-- Aucune policy de lecture : ni anon ni authenticated ne peuvent
-- relire les demandes (les leurs ou celles des autres) -- seule la
-- console Supabase (service_role, qui contourne RLS) y a accès.
create policy "Tout le monde peut déposer une demande de partenariat"
  on demandes_partenariat for insert to anon, authenticated with check (true);

-- ======================================================
-- ==== 15_offres_partenaires.sql
-- ======================================================
-- ---------- 15. Réductions chez les commerçants partenaires ----------
-- Distinct de demandes_partenariat (14_demandes_partenariat.sql) : cette
-- table-là, c'est le formulaire de contact d'un commerçant qui VEUT
-- devenir partenaire. Celle-ci, ce sont les offres réellement actives,
-- affichées publiquement sur /reductions -- ce que le catalogue de
-- défis appelait déjà "Offres partenaires" (categories_defis, cle
-- 'offres_partenaires') sans jamais avoir de vraies données derrière.
-- Alimentée à la main depuis la console Supabase (service_role) une
-- fois qu'une demande de demandes_partenariat est validée -- pas
-- d'espace partenaire self-service pour l'instant, comme pour le reste
-- du projet en V1.
create table if not exists offres_partenaires (
  id bigint generated always as identity primary key,
  nom_commerce text not null,
  type_commerce text not null default 'autre',
  ville_code_insee text not null references villes(code_insee),
  reduction text not null, -- court label affiché en avant, ex. "-10 %", "1 acheté = 1 offert"
  description text not null default '',
  conditions text, -- ex. "hors happy hour", "sur présentation de l'appli"
  date_debut timestamptz not null default now(),
  date_fin timestamptz, -- null = pas de date de fin connue
  actif boolean not null default true,
  ordre integer not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists idx_offres_partenaires_ville on offres_partenaires(ville_code_insee);

alter table offres_partenaires enable row level security;

-- Page publique, comme /villes et /comparer : tout le monde peut lire
-- les offres actives, avec ou sans compte. Écriture réservée à la
-- console Supabase (service_role, qui contourne RLS).
create policy "Les offres actives sont lisibles par tous"
  on offres_partenaires for select to anon, authenticated using (actif = true);

-- ---------- Exemples (à remplacer par de vraies offres quand des
-- commerçants seront réellement démarchés -- noms génériques,
-- explicitement des exemples, pas de vrais commerces) ----------
insert into offres_partenaires (nom_commerce, type_commerce, ville_code_insee, reduction, description, conditions, ordre)
values
  ('Café du Beffroi (exemple)', 'cafe', '59350', '-10 %', 'Sur l''addition, tous les jours avant 11h.', 'Présente l''appli Notaville en caisse.', 10),
  ('Table Vieux-Lille (exemple)', 'restaurant', '59350', '1 dessert offert', 'Pour toute formule midi du lundi au vendredi.', 'Non cumulable avec une autre offre.', 20),
  ('Atelier Nord Style (exemple)', 'boutique', '59350', '-15 %', 'Sur une sélection d''articles en boutique.', 'Dans la limite des stocks disponibles.', 30),
  ('Friterie du Broutteux (exemple)', 'restaurant', '59599', '-10 %', 'Sur toute commande à emporter.', 'Présente l''appli Notaville en caisse.', 10),
  ('Le Repaire Textile (exemple)', 'bar', '59599', '2ème boisson à -50 %', 'Du jeudi au samedi, à partir de 18h.', 'Une offre par personne et par soirée.', 20)
on conflict do nothing;

-- ======================================================
-- ==== 16_signalements.sql
-- ======================================================
-- ---------- 16. Signalements de contenu ----------
-- Bouton "Signaler" (components/BoutonSignaler.js), posé à côté de tout
-- contenu déposé par un utilisateur (pour l'instant : les lieux
-- recommandés dans /decouvrir, appelés depuis LieuxRecommandes.js --
-- d'autres surfaces pourront réutiliser le même composant plus tard).
-- cible_type/cible_id restent génériques (pas de foreign key stricte)
-- pour permettre de signaler n'importe quel type de contenu à l'avenir
-- (lieu, avis, contribution photo...) sans nouvelle migration.
create table if not exists signalements (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete set null,
  cible_type text not null,
  cible_id text not null,
  motif text not null check (
    motif in ('contenu_faux', 'contenu_inapproprie', 'spam', 'doublon', 'autre')
  ),
  detail text,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'traite', 'rejete')),
  created_at timestamptz not null default now()
);

alter table signalements enable row level security;

-- N'importe qui, connecté ou non, peut signaler un contenu.
create policy "Tout le monde peut signaler un contenu"
  on signalements for insert to anon, authenticated with check (true);

-- Pas de policy select : comme les demandes de partenariat, les
-- signalements ne sont lus que depuis la console Supabase
-- (service_role, hors RLS) -- c'est la modération de la Phase 1.

-- ======================================================
-- ==== 17_stockage_photos.sql
-- ======================================================
-- ---------- 17. Stockage des photos de défis ----------
-- Jusqu'ici, un défi photo demandait juste un lien vers une photo déjà
-- hébergée ailleurs (Phase "provisoire"). On passe à un vrai envoi
-- direct : bucket Supabase Storage dédié, chaque photo rangée sous
-- <user_id>/<horodatage>-<nom fichier> (voir components/DefiActions.js),
-- pour qu'un utilisateur ne puisse déposer que dans son propre dossier.
insert into storage.buckets (id, name, public)
values ('defis-photos', 'defis-photos', true)
on conflict (id) do nothing;

-- Public en lecture (les photos de défis, une fois validées, sont
-- montrées à tous -- cf. policy "contributions validées visibles par
-- tous" sur la table contributions).
create policy "Les photos de défis sont lisibles par tous"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'defis-photos');

-- Chacun ne peut déposer que dans son propre dossier (premier segment
-- du chemin = son user_id), ce qui empêche d'écraser ou de polluer le
-- dossier d'un autre utilisateur.
create policy "Chacun dépose ses photos dans son propre dossier"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'defis-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Chacun peut supprimer ses propres photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'defis-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ======================================================
-- ==== 18_bornes_contributions.sql
-- ======================================================
-- ---------- 18. Bornes de plausibilité sur les contributions "Vie quotidienne" ----------
-- Garde-fou anti-abus, en complément des limites journalières de
-- 03_renommage_duels_notacoins.sql (limites_anti_abus) : celles-ci
-- limitent le NOMBRE de contributions par jour, mais rien n'empêchait
-- jusqu'ici une valeur absurde (0€ de loyer, 999999€ de salaire) de
-- fausser une moyenne de ville. Les mêmes bornes sont déjà appliquées
-- côté interface (lib/donnees.js) -- cette contrainte est la version
-- appliquée en base, pour qu'un appel direct à l'API ne puisse pas les
-- contourner.
alter table contributions drop constraint if exists contributions_donnee_valeur_bornes;

alter table contributions add constraint contributions_donnee_valeur_bornes check (
  donnee_cle is null or donnee_valeur is null or (
    case donnee_cle
      when 'salaire_net_mensuel' then donnee_valeur between 200 and 15000
      when 'loyer_m2'            then donnee_valeur between 2 and 60
      when 'prix_biere'          then donnee_valeur between 0.5 and 15
      when 'prix_cafe'           then donnee_valeur between 0.5 and 8
      when 'prix_plein'          then donnee_valeur between 15 and 150
      when 'panier_courses'      then donnee_valeur between 5 and 300
      when 'abonnement_transport' then donnee_valeur between 3 and 150
      else true -- une future donnee_cle sans borne définie n'est jamais bloquée ici
    end
  )
);

-- ======================================================
-- ==== 19_recherche_lieux.sql
-- ======================================================
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

-- ======================================================
-- ==== 20_vie_quotidienne_plus.sql
-- ======================================================
-- ---------- 20. Vie quotidienne : plus de données (loyer T2, prix des activités) ----------
-- Le comparateur (/comparer) n'avait que salaire, loyer au m², bière,
-- café, essence, courses et transport -- pas de vrai loyer de T2 (le
-- "reste à vivre" ne faisait qu'estimer loyer_m2 × 45 m²), et rien sur
-- le prix des loisirs. Ajoute 4 nouvelles donnee_cle, chacune avec son
-- défi de contribution dans "Vie quotidienne", suivant exactement le
-- même schéma que 07_defis_catalogue.sql.

-- 1) Nouveaux défis de contribution.
insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Quel est le loyer de ton T2 ?', 'Loyer mensuel réel d''un T2 (donnée anonyme, jamais montrée individuellement).', 'Indique le loyer total en euros pour un T2 (environ 45 m²). Affiché uniquement en moyenne, à partir de 5 contributions.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 15, 'loyer_t2'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte un repas au restaurant ?', 'Prix moyen payé pour un repas complet au restaurant.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 45, 'prix_resto'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte une place de cinéma ?', 'Prix plein tarif d''une place de cinéma dans ta ville.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 55, 'prix_cinema'
from categories_defis where cle = 'donnees_utiles'
union all
select id, 'Combien coûte ton abonnement salle de sport ?', 'Abonnement salle de sport mensuel.', 'Indique le montant en euros.', 'contribution_donnee', 'prix_quotidien', 'facile', 'permanent', now(), null::timestamptz, 60, 'abonnement_sport'
from categories_defis where cle = 'donnees_utiles'
on conflict do nothing;

-- 2) Bornes de plausibilité (complète la contrainte de 18_bornes_contributions.sql
-- avec les 4 nouvelles donnee_cle -- mêmes valeurs que lib/donnees.js).
alter table contributions drop constraint if exists contributions_donnee_valeur_bornes;

alter table contributions add constraint contributions_donnee_valeur_bornes check (
  donnee_cle is null or donnee_valeur is null or (
    case donnee_cle
      when 'salaire_net_mensuel'  then donnee_valeur between 200 and 15000
      when 'loyer_m2'             then donnee_valeur between 2 and 60
      when 'loyer_t2'             then donnee_valeur between 200 and 3000
      when 'prix_biere'           then donnee_valeur between 0.5 and 15
      when 'prix_cafe'            then donnee_valeur between 0.5 and 8
      when 'prix_plein'           then donnee_valeur between 15 and 150
      when 'prix_resto'           then donnee_valeur between 5 and 100
      when 'prix_cinema'          then donnee_valeur between 3 and 25
      when 'panier_courses'       then donnee_valeur between 5 and 300
      when 'abonnement_transport' then donnee_valeur between 3 and 150
      when 'abonnement_sport'     then donnee_valeur between 5 and 200
      else true -- une future donnee_cle sans borne définie n'est jamais bloquée ici
    end
  )
);

-- ======================================================
-- ==== 21_etablissements.sql
-- ======================================================
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

-- ======================================================
-- ==== 22_lieux_proches.sql
-- ======================================================
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

