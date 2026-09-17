-- ============================================================
-- NOTAVILLE — Migration 25 : Historique des villes visitées
-- (façon "vos lieux" de Google Maps), construit automatiquement à
-- partir de la position GPS, avec un petit gain de Notacoins pour
-- chaque nouvelle ville découverte. À exécuter après 24_lieux_prix.sql.
--
-- Changement de philosophie à noter : jusqu'ici la position ne servait
-- qu'à un calcul de distance en local, "jamais stockée" (voir les
-- commentaires de lib/geoloc.js, LieuxProchesRecherche.js...). Ici, on
-- stocke pour la première fois une trace -- mais seulement la ville
-- (code INSEE), jamais la position GPS exacte ni l'historique des
-- déplacements minute par minute, et uniquement après consentement
-- explicite côté client (voir components/VillesVisiteesTracker.js).
-- ============================================================

-- ---------- 1. Table : une ligne par (utilisateur, ville) ----------
create table if not exists public.villes_visitees (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_insee text not null,
  ville_nom text,
  premiere_visite timestamptz not null default now(),
  derniere_visite timestamptz not null default now(),
  nb_visites integer not null default 1,
  unique (user_id, code_insee)
);

alter table public.villes_visitees enable row level security;

-- Lecture : chacun ne voit que son propre historique. Pas de policy
-- insert/update pour les clients -- tout passe par enregistrer_visite()
-- ci-dessous (security definer), pour qu'il soit impossible de se
-- fabriquer un historique bidon ou de toucher celui de quelqu'un
-- d'autre.
create policy "villes_visitees_select_own" on public.villes_visitees
  for select using (auth.uid() = user_id);

create index if not exists villes_visitees_user_idx on public.villes_visitees (user_id, derniere_visite desc);

-- ---------- 2. Nouvelle raison de gain : première visite d'une ville ----------
-- Montant modeste (comparable aux jeux, voir 23_notacoins_jeux.sql) :
-- ça reste une détection automatique, pas une vraie contribution.
insert into parametres_recompenses (cle, valeur, description) values
  ('ville_visitee_premiere', 5, 'Première fois que ta position est repérée dans une nouvelle ville')
on conflict (cle) do update set valeur = excluded.valeur, description = excluded.description;

insert into limites_anti_abus (raison, max_par_jour) values
  ('ville_visitee_premiere', 5)
on conflict (raison) do update set max_par_jour = excluded.max_par_jour;

-- ---------- 3. Point d'entrée : enregistrer une visite ----------
-- Appelée automatiquement à l'ouverture de l'appli, une fois par
-- session, après géocodage inverse de la position GPS vers un code
-- INSEE (lib/adresse.js, inverserAdresse) -- voir
-- components/VillesVisiteesTracker.js. Le user_id vient toujours de
-- auth.uid(), jamais d'un paramètre : personne ne peut remplir
-- l'historique de quelqu'un d'autre. Ne plante jamais et ne fait rien
-- silencieusement si personne n'est connecté -- le tracking ne
-- concerne que les comptes, jamais les visiteurs anonymes.
create or replace function public.enregistrer_visite(p_code_insee text, p_ville_nom text default null)
returns void as $$
declare
  v_deja_visitee boolean;
begin
  if auth.uid() is null then
    return;
  end if;
  if p_code_insee is null or length(trim(p_code_insee)) = 0 then
    return;
  end if;

  select exists(
    select 1 from public.villes_visitees
    where user_id = auth.uid() and code_insee = p_code_insee
  ) into v_deja_visitee;

  insert into public.villes_visitees (user_id, code_insee, ville_nom)
  values (auth.uid(), p_code_insee, p_ville_nom)
  on conflict (user_id, code_insee)
  do update set
    derniere_visite = now(),
    nb_visites = public.villes_visitees.nb_visites + 1,
    ville_nom = coalesce(excluded.ville_nom, public.villes_visitees.ville_nom);

  if not v_deja_visitee then
    perform public.crediter_notacoins(auth.uid(), 'ville_visitee_premiere', 'geoloc', null);
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.enregistrer_visite(text, text) to authenticated;
