-- ============================================================
-- 39. Connexion par e-mail OU par pseudo (suppression du numéro de
-- téléphone comme identifiant).
--
-- Supabase Auth ne sait se connecter que par e-mail (ou téléphone,
-- qu'on abandonne ici). Pour permettre "se connecter avec son pseudo",
-- on ajoute une fonction qui retrouve l'e-mail associé à un pseudo ;
-- le client appelle ensuite signInWithPassword({ email, password })
-- avec cet e-mail retrouvé.
--
-- ⚠️ Cette fonction doit être appelable AVANT connexion (anon), donc
-- elle révèle mécaniquement si un pseudo donné existe (comme tout
-- système de connexion par pseudo). Elle ne révèle jamais le mot de
-- passe ni si l'e-mail lui-même existe par ailleurs.
-- ============================================================

-- Un pseudo doit être unique pour qu'on puisse retrouver un seul
-- compte à partir de lui (insensible à la casse : "Jo" et "jo" sont le
-- même pseudo). Si cette commande échoue avec une erreur de doublon,
-- c'est qu'il existe déjà deux comptes avec le même pseudo à
-- renommer manuellement avant de relancer cette ligne.
create unique index if not exists profiles_pseudo_unique_idx on profiles (lower(pseudo));

create or replace function public.email_depuis_pseudo(p_pseudo text)
returns text as $$
declare
  v_email text;
begin
  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.pseudo) = lower(p_pseudo)
  limit 1;

  return v_email;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.email_depuis_pseudo(text) from public;
grant execute on function public.email_depuis_pseudo(text) to anon, authenticated;
