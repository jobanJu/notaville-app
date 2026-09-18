-- ============================================================
-- 38. Inscription/connexion "classique" (pseudo + email OU téléphone +
-- mot de passe) et avatar choisi parmi une galerie de propositions.
--
-- Remplace le flux "lien magique par e-mail" (OTP) : l'inscription se
-- fait maintenant via supabase.auth.signUp({ email | phone, password,
-- options: { data: { pseudo, avatar_emoji, avatar_couleur } } }), et
-- handle_new_user() reprend ces informations pour créer le profil.
--
-- ⚠️ Deux réglages à faire toi-même dans le dashboard Supabase (Claude
-- ne peut pas les changer par SQL, ce sont des réglages de projet) :
--   1. Authentication → Providers → Email → désactiver "Confirm email"
--      (sinon les comptes créés par e-mail restent bloqués tant que le
--      lien de confirmation n'est pas cliqué).
--   2. Authentication → Providers → Phone → activer le provider (et
--      désactiver "Confirm phone" si l'option existe dans ta version).
--      Sans ça, l'inscription par numéro de téléphone échouera.
-- ============================================================

alter table profiles add column if not exists avatar_emoji text;
alter table profiles add column if not exists avatar_couleur text;

-- Reprend pseudo + avatar depuis les métadonnées passées à signUp().
-- Fallback robuste si jamais pseudo/e-mail sont vides (ex. inscription
-- par téléphone sans pseudo saisi, cas normalement empêché côté UI).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, pseudo, avatar_emoji, avatar_couleur)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'pseudo', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Notavillois'
    ),
    coalesce(nullif(new.raw_user_meta_data->>'avatar_emoji', ''), '🙂'),
    coalesce(nullif(new.raw_user_meta_data->>'avatar_couleur', ''), '#FDBA74')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
