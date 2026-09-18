-- ============================================================
-- NOTAVILLE — Migration 30 : évènements locaux (onglet Évènements)
-- ============================================================
--
-- Décision produit : création réservée à l'admin/aux partenaires, pas
-- de soumission communautaire (contrairement aux avis/photos/mur) --
-- même logique que offres_partenaires (migration 15) : alimenté à la
-- main pour l'instant. Contrairement à offres_partenaires cependant, on
-- expose une vraie petite UI d'admin dans l'app (app/admin/evenements),
-- sur le même principe que /admin/defis (migration 06) : confort
-- d'usage en plus du Table editor Supabase, jamais à la place.
create table if not exists evenements (
  id bigint generated always as identity primary key,
  titre text not null,
  description text not null default '',
  ville_code_insee text not null references villes(code_insee),
  lieu text, -- nom/adresse du lieu, texte libre (ex. "Grand-Place", "Zénith de Lille")
  type_evenement text not null default 'autre' check (
    type_evenement in ('concert', 'marche', 'festival', 'sport', 'exposition', 'spectacle', 'autre')
  ),
  date_debut timestamptz not null,
  date_fin timestamptz,
  lien_externe text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_evenements_ville_date on evenements(ville_code_insee, date_debut);

alter table evenements enable row level security;

-- Page publique (section 14 : accessible sans compte), comme /reductions.
create policy "Les évènements actifs sont lisibles par tous"
  on evenements for select to anon, authenticated using (actif = true);

-- Écriture réservée aux comptes admin (profiles.est_admin, fonction
-- est_administrateur() définie en migration 06) -- même mécanisme que
-- categories_defis/defis/badges, pour permettre une vraie UI d'admin
-- dans l'app plutôt que de dépendre uniquement du Table editor Supabase.
create policy "Seuls les admins gèrent les évènements"
  on evenements for all to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

-- ---------- Exemples (à remplacer/compléter depuis /admin/evenements) ----------
insert into evenements (titre, description, ville_code_insee, lieu, type_evenement, date_debut, date_fin)
select
  'Braderie de Lille (exemple)',
  'Le plus grand marché aux puces d''Europe, dans tout le centre-ville.',
  '59350', 'Centre-ville de Lille', 'marche',
  (date_trunc('month', now()) + interval '1 month' + interval '4 days'),
  (date_trunc('month', now()) + interval '1 month' + interval '6 days')
where not exists (select 1 from evenements where titre = 'Braderie de Lille (exemple)');
