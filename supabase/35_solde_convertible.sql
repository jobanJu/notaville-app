-- ============================================================
-- NOTAVILLE — Migration 35 : sépare les Notacoins "à risque zéro"
-- ============================================================
--
-- Correction importante suite à la mise en place des paliers de
-- redistribution (CGU art. 4 bis) : le premier jet liait le taux de
-- conversion à TOUS les Notacoins (avis, défis, jeux, mur...), qui ne
-- rapportent pourtant aucun revenu réel -- les rendre convertibles en
-- argent aurait créé une perte garantie sur toute activité qui n'est
-- pas une offre AdGem. Cette migration corrige ça : deux soldes
-- séparés, qui ne se mélangent jamais.
--
--   - `notacoins`              -- monnaie "pour s'amuser" : avis, photos,
--                                  défis, jeux, mur... Dépensable
--                                  uniquement dans la boutique. JAMAIS
--                                  convertible en argent. Aucun risque.
--   - `notacoins_convertibles` -- crédités UNIQUEMENT par une conversion
--                                  AdGem réelle (donc toujours adossés à
--                                  un revenu déjà encaissé). Seul ce
--                                  solde peut faire l'objet d'un
--                                  virement, via la modération.
--
-- Barème (fourni par l'utilisateur, marge de 40% garantie à chaque
-- conversion -- 10 000 Notacoins convertibles = 1 € pour l'utilisateur) :
--   Revenu AdGem | Notacoins convertibles | Valeur utilisateur | Marge
--        0,50 €  |         3 000          |       0,30 €       | 0,20 €
--        1 €     |         6 000          |       0,60 €       | 0,40 €
--        2 €     |        12 000          |       1,20 €       | 0,80 €
--        5 €     |        30 000          |       3 €          | 2 €
--       10 €     |        60 000          |       6 €          | 4 €
--       20 €     |       120 000          |      12 €          | 8 €
--       50 €     |       300 000          |      30 €          | 20 €
-- Formule : notacoins_convertibles = round(revenu_adgem_euros × 6000)
-- (= 60% du revenu réel, exprimé au taux 10 000 NC = 1 €). Cette formule
-- garantit mathématiquement 40% de marge sur CHAQUE conversion,
-- indépendamment du volume -- pas d'hypothèse globale qui pourrait se
-- révéler fausse, contrairement au premier brouillon.
alter table profiles add column if not exists notacoins_convertibles integer not null default 0;

-- Le verrou posé migration 31 sur `notacoins` doit s'appliquer pareil
-- à ce nouveau solde, pour la même raison (empêcher un client de se
-- créditer lui-même un solde retirable).
revoke update (notacoins_convertibles) on profiles from authenticated;

-- ---------- Remplace le crédit AdGem : calcule depuis le revenu réel ----------
-- Avant (migration 34) : créditait `notacoins` (le solde "pour s'amuser")
-- à partir du champ `amount` du postback -- changé ici pour créditer
-- `notacoins_convertibles`, calculé depuis `payout` (le revenu réel
-- reçu), seule donnée qui garantit qu'on ne paie jamais plus qu'on a
-- effectivement encaissé.
create or replace function public.crediter_notacoins_adgem(
  p_user_id uuid,
  p_montant integer,
  p_conversion_id text,
  p_offer_id text default null,
  p_campaign_id text default null,
  p_conversion_type text default null,
  p_payout_usd numeric default null
)
returns boolean as $$
declare
  v_convertibles integer;
begin
  if p_payout_usd is null or p_payout_usd <= 0 then
    raise exception 'payout manquant ou invalide -- impossible de calculer un montant garanti';
  end if;
  if not exists (select 1 from profiles where id = p_user_id) then
    raise exception 'utilisateur introuvable';
  end if;

  -- Déjà traité (retry AdGem) : ne recrédite pas.
  if exists (select 1 from adgem_conversions where conversion_id = p_conversion_id) then
    return false;
  end if;

  -- 60% du revenu réel, au taux 10 000 Notacoins convertibles = 1 €
  -- (voir barème en tête de fichier) -- 40% de marge garantie.
  v_convertibles := round(p_payout_usd * 6000);

  insert into adgem_conversions (
    conversion_id, user_id, montant_notacoins, payout_usd, offer_id, campaign_id, conversion_type
  ) values (
    p_conversion_id, p_user_id, v_convertibles, p_payout_usd, p_offer_id, p_campaign_id, p_conversion_type
  );

  update profiles set notacoins_convertibles = notacoins_convertibles + v_convertibles where id = p_user_id;

  return true;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.crediter_notacoins_adgem(uuid, integer, text, text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.crediter_notacoins_adgem(uuid, integer, text, text, text, text, numeric) to service_role;

-- ---------- Journal des retraits ----------
create table if not exists retraits (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  notacoins_convertis integer not null check (notacoins_convertis > 0),
  montant_eur numeric(10,2) not null check (montant_eur > 0),
  traite_par uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table retraits enable row level security;

drop policy if exists "Chacun voit ses propres retraits" on retraits;
create policy "Chacun voit ses propres retraits"
  on retraits for select to authenticated using (auth.uid() = user_id);

drop policy if exists "La modération voit tous les retraits" on retraits;
create policy "La modération voit tous les retraits"
  on retraits for select to authenticated using (public.est_moderateur_ou_admin());
-- Pas de policy insert directe : uniquement via traiter_retrait() ci-dessous.

-- ---------- Traitement d'un retrait par un modérateur ----------
-- Appelé après qu'un utilisateur a demandé un virement via Messages →
-- Contacter la modération (voir CGU art. 4 bis). Vérifie le solde,
-- décrémente, journalise -- le modérateur effectue ensuite le virement
-- réel lui-même (aucune intégration bancaire automatisée pour l'instant).
create or replace function public.traiter_retrait(p_user_id uuid, p_notacoins integer)
returns numeric as $$
declare
  v_solde integer;
  v_montant_eur numeric(10,2);
begin
  if not public.est_moderateur_ou_admin() then
    raise exception 'réservé à la modération';
  end if;
  if p_notacoins <= 0 then
    raise exception 'montant invalide';
  end if;

  v_montant_eur := round(p_notacoins / 10000.0, 2);
  if v_montant_eur < 10 then
    raise exception 'en dessous du seuil minimum de retrait (10 €)';
  end if;

  select notacoins_convertibles into v_solde from profiles where id = p_user_id;
  if v_solde is null or v_solde < p_notacoins then
    raise exception 'solde convertible insuffisant';
  end if;

  update profiles set notacoins_convertibles = notacoins_convertibles - p_notacoins where id = p_user_id;
  insert into retraits (user_id, notacoins_convertis, montant_eur, traite_par)
    values (p_user_id, p_notacoins, v_montant_eur, auth.uid());

  return v_montant_eur;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.traiter_retrait(uuid, integer) to authenticated;
