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
