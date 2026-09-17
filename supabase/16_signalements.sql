-- ---------- 16. Signalements de contenu ----------
-- Bouton "Signaler" (components/BoutonSignaler.js), posé à côté de tout
-- contenu déposé par un utilisateur (pour l'instant : les lieux
-- recommandés dans /decouvrir, appelés depuis LieuxRecommandes.js --
-- d'autres surfaces pourront réutiliser le même composant plus tard).
-- cible_type/cible_id restent génériques (pas de foreign key stricte)
-- pour permettre de signaler n'importe quel type de contenu à l'avenir
-- (lieu, avis, contribution photo...) sans nouvelle migration.
create table if not exists signalements (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete set null,
  cible_type text not null,
  cible_id text not null,
  motif text not null check (
    motif in ('contenu_faux', 'contenu_inapproprie', 'spam', 'doublon', 'autre')
  ),
  detail text,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'traite', 'rejete')),
  created_at timestamptz not null default now()
);

alter table signalements enable row level security;

-- N'importe qui, connecté ou non, peut signaler un contenu.
create policy "Tout le monde peut signaler un contenu"
  on signalements for insert to anon, authenticated with check (true);

-- Pas de policy select : comme les demandes de partenariat, les
-- signalements ne sont lus que depuis la console Supabase
-- (service_role, hors RLS) -- c'est la modération de la Phase 1.
