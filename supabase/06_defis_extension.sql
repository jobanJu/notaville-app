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
