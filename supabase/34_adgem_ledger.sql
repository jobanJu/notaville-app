-- ============================================================
-- NOTAVILLE — Migration 34 : crédit Notacoins depuis le postback AdGem
-- ============================================================
--
-- AdGem (offerwall) envoie un postback serveur-à-serveur en POST, en
-- JSON, avec un identifiant `player_id` (= l'id utilisateur Notaville,
-- à transmettre dans l'URL de l'offerwall côté client comme subid) et
-- un montant. La route Next.js qui reçoit ce postback (voir
-- app/api/adgem/postback/route.js) vérifie une signature HMAC-SHA256
-- avant d'appeler la fonction ci-dessous avec la clé service_role
-- (jamais exposée au navigateur) -- cette fonction n'est donc
-- accessible ni à `anon` ni à `authenticated`, seulement à
-- `service_role`, qui contourne de toute façon RLS : la vérification
-- de sécurité réelle a lieu dans la route API, pas ici.
--
-- `adgem_conversions` sert d'abord à empêcher un double crédit : les
-- réseaux d'offerwall renvoient le même postback plusieurs fois tant
-- qu'ils ne reçoivent pas de 200 -- la contrainte unique sur
-- conversion_id garantit qu'un même conversion_id AdGem n'est jamais
-- crédité deux fois, même en cas de retry.
create table if not exists adgem_conversions (
  conversion_id text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  montant_notacoins integer not null,
  payout_usd numeric,
  offer_id text,
  campaign_id text,
  conversion_type text,
  created_at timestamptz not null default now()
);

alter table adgem_conversions enable row level security;
-- Aucune policy pour anon/authenticated : seule service_role (qui
-- contourne RLS) doit pouvoir lire/écrire cette table.

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
begin
  if p_montant <= 0 then
    raise exception 'montant invalide';
  end if;
  if not exists (select 1 from profiles where id = p_user_id) then
    raise exception 'utilisateur introuvable';
  end if;

  -- Déjà traité (retry AdGem) : ne recrédite pas, renvoie false sans erreur.
  if exists (select 1 from adgem_conversions where conversion_id = p_conversion_id) then
    return false;
  end if;

  insert into adgem_conversions (
    conversion_id, user_id, montant_notacoins, payout_usd, offer_id, campaign_id, conversion_type
  ) values (
    p_conversion_id, p_user_id, p_montant, p_payout_usd, p_offer_id, p_campaign_id, p_conversion_type
  );

  insert into notacoins_transactions (user_id, montant, raison, ref_table, ref_id)
    values (p_user_id, p_montant, 'adgem_offre', 'adgem_conversions', null);

  update profiles set notacoins = notacoins + p_montant where id = p_user_id;

  return true;
end;
$$ language plpgsql security definer set search_path = public;

-- Volontairement PAS de grant à anon/authenticated : seule
-- service_role peut appeler cette fonction (utilisée uniquement par la
-- route serveur app/api/adgem/postback).
revoke all on function public.crediter_notacoins_adgem(uuid, integer, text, text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.crediter_notacoins_adgem(uuid, integer, text, text, text, text, numeric) to service_role;

insert into parametres_recompenses (cle, valeur, description) values
  ('adgem_offre', 0, 'Offre AdGem complétée (montant réel variable, voir adgem_conversions -- cette ligne existe seulement pour lister la raison sur /notacoins)')
on conflict (cle) do nothing;
