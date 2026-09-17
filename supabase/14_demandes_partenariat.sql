-- ---------- 14. Demandes de partenariat commerçant ----------
-- Page publique /partenaires : un commerçant remplit un formulaire de
-- contact, sans compte Notaville. Pas d'espace partenaire pour
-- l'instant (cahier des charges : on commence simple) -- juste une
-- table de demandes, lue à la main depuis la console Supabase
-- (service_role), comme les autres tâches d'administration du projet.
create table if not exists demandes_partenariat (
  id bigint generated always as identity primary key,
  nom_contact text not null,
  nom_commerce text not null,
  type_commerce text not null default 'autre',
  ville_code_insee text references villes(code_insee),
  ville_nom text,
  email text not null,
  telephone text,
  message text not null default '',
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'contactee', 'partenaire', 'sans_suite')),
  created_at timestamptz not null default now()
);

alter table demandes_partenariat enable row level security;

-- N'importe qui (visiteur non connecté inclus, c'est tout le principe
-- d'un formulaire de contact commerçant) peut déposer une demande.
-- Aucune policy de lecture : ni anon ni authenticated ne peuvent
-- relire les demandes (les leurs ou celles des autres) -- seule la
-- console Supabase (service_role, qui contourne RLS) y a accès.
create policy "Tout le monde peut déposer une demande de partenariat"
  on demandes_partenariat for insert to anon, authenticated with check (true);
