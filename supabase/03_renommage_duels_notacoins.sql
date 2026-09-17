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
