-- ============================================================
-- NOTAVILLE — Migration 40 : gestion des rôles admin / modérateur
-- ============================================================
--
-- Contexte : `profiles.est_admin` (migration 06) et
-- `profiles.est_moderateur` (migration 33) existent déjà et pilotent
-- déjà toutes les permissions (pages /admin/*, tickets de modération
-- dans la messagerie). Jusqu'ici, la seule façon de les activer était
-- une commande manuelle dans le SQL editor Supabase
-- (`update profiles set est_admin = true where pseudo = '...'`).
--
-- Faille corrigée au passage (même famille que la migration 31 pour
-- `notacoins`, et la 35 pour `notacoins_convertibles`) : la policy
-- "chacun modifie son propre profil" (migration 01) n'a jamais exclu
-- ces deux colonnes. Un compte authentifié pouvait donc, depuis la
-- console du navigateur, faire lui-même :
--   supabase.from('profiles').update({ est_admin: true }).eq('id', moi)
-- et s'auto-promouvoir admin. On ferme ça en retirant le droit UPDATE
-- sur ces deux colonnes pour le rôle `authenticated` ; les fonctions
-- SECURITY DEFINER ci-dessous (exécutées avec les droits du
-- propriétaire de la fonction, pas de l'appelant) restent le seul
-- chemin pour les modifier.
revoke update (est_admin, est_moderateur) on profiles from authenticated;

-- ---------- Chercher un compte par pseudo (réservé aux admins) ----------
create or replace function public.admin_chercher_profils(p_recherche text)
returns table (
  id uuid,
  pseudo text,
  est_admin boolean,
  est_moderateur boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_administrateur() then
    raise exception 'réservé aux administrateurs';
  end if;

  return query
    select p.id, p.pseudo, p.est_admin, p.est_moderateur
    from profiles p
    where p.pseudo ilike '%' || trim(p_recherche) || '%'
    order by p.pseudo
    limit 20;
end;
$$;

grant execute on function public.admin_chercher_profils(text) to authenticated;

-- ---------- Donner / retirer les rôles modérateur et admin (réservé aux admins) ----------
create or replace function public.admin_definir_role(p_user_id uuid, p_est_admin boolean, p_est_moderateur boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_administrateur() then
    raise exception 'réservé aux administrateurs';
  end if;

  update profiles
  set est_admin = p_est_admin, est_moderateur = p_est_moderateur
  where id = p_user_id;
end;
$$;

grant execute on function public.admin_definir_role(uuid, boolean, boolean) to authenticated;

-- ---------- Pour activer le tout premier compte admin ----------
-- Les deux fonctions ci-dessus exigent déjà d'être admin pour agir --
-- il faut donc un premier admin créé "à la main", une seule fois,
-- depuis le SQL editor Supabase (qui agit avec des droits complets,
-- indépendants du `revoke` ci-dessus) :
--   update profiles set est_admin = true where pseudo = '...';
-- Une fois ce premier compte admin actif, tout le reste (donner le
-- rôle modérateur ou admin à d'autres comptes) se fait depuis la page
-- /admin/utilisateurs de l'app, sans repasser par le SQL editor.
