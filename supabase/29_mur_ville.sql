-- ============================================================
-- NOTAVILLE — Migration 29 : mur de discussion par ville
-- ("groupe de Lillois" etc.)
-- ============================================================
--
-- Décision produit : un mur public ouvert par ville, pas un vrai
-- groupe avec adhésion -- comme les avis/photos (migration 27), tout
-- le monde peut lire, tout compte connecté peut poster, sans étape
-- "rejoindre". Plus simple, cohérent avec le reste du site, et ça
-- couvre déjà le besoin exprimé ("échanger entre eux").
create table if not exists messages_ville (
  id bigint generated always as identity primary key,
  ville_code_insee text not null references villes(code_insee),
  user_id uuid not null references profiles(id) on delete cascade,
  contenu text not null check (char_length(trim(contenu)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_ville on messages_ville(ville_code_insee, created_at desc);

alter table messages_ville enable row level security;

create policy "Tout le monde peut lire les messages de ville"
  on messages_ville for select to anon, authenticated using (true);

create policy "Chacun poste en son propre nom sur le mur"
  on messages_ville for insert to authenticated with check (auth.uid() = user_id);

create policy "Chacun supprime ses propres messages"
  on messages_ville for delete to authenticated using (auth.uid() = user_id);

-- Pas de récompense Notacoins sur un simple message (contrairement aux
-- avis) : un mur ouvert qui rapporterait des Notacoins deviendrait vite
-- une source de farming. La modération reste le bouton Signaler déjà
-- existant (components/BoutonSignaler.js) + suppression par l'auteur
-- lui-même (policy delete ci-dessus) + console Supabase pour l'admin.

-- Page publique (section 14 : accessible sans compte) -- comme
-- avis_ville()/photos_ville(), une fonction security definer est
-- nécessaire pour joindre le pseudo de l'auteur : la policy de lecture
-- sur `profiles` est réservée aux comptes connectés (RLS migration 01),
-- ce qui bloquerait un visiteur anonyme lisant le mur sinon.
create or replace function public.messages_ville(p_code_insee text, p_limite integer default 50)
returns table (
  id bigint,
  pseudo text,
  contenu text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, p.pseudo, m.contenu, m.created_at
  from messages_ville m
  join profiles p on p.id = m.user_id
  where m.ville_code_insee = p_code_insee
  order by m.created_at desc
  limit p_limite;
$$;

grant execute on function public.messages_ville(text, integer) to anon, authenticated;
