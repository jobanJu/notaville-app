-- ---------- 15. Réductions chez les commerçants partenaires ----------
-- Distinct de demandes_partenariat (14_demandes_partenariat.sql) : cette
-- table-là, c'est le formulaire de contact d'un commerçant qui VEUT
-- devenir partenaire. Celle-ci, ce sont les offres réellement actives,
-- affichées publiquement sur /reductions -- ce que le catalogue de
-- défis appelait déjà "Offres partenaires" (categories_defis, cle
-- 'offres_partenaires') sans jamais avoir de vraies données derrière.
-- Alimentée à la main depuis la console Supabase (service_role) une
-- fois qu'une demande de demandes_partenariat est validée -- pas
-- d'espace partenaire self-service pour l'instant, comme pour le reste
-- du projet en V1.
create table if not exists offres_partenaires (
  id bigint generated always as identity primary key,
  nom_commerce text not null,
  type_commerce text not null default 'autre',
  ville_code_insee text not null references villes(code_insee),
  reduction text not null, -- court label affiché en avant, ex. "-10 %", "1 acheté = 1 offert"
  description text not null default '',
  conditions text, -- ex. "hors happy hour", "sur présentation de l'appli"
  date_debut timestamptz not null default now(),
  date_fin timestamptz, -- null = pas de date de fin connue
  actif boolean not null default true,
  ordre integer not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists idx_offres_partenaires_ville on offres_partenaires(ville_code_insee);

alter table offres_partenaires enable row level security;

-- Page publique, comme /villes et /comparer : tout le monde peut lire
-- les offres actives, avec ou sans compte. Écriture réservée à la
-- console Supabase (service_role, qui contourne RLS).
create policy "Les offres actives sont lisibles par tous"
  on offres_partenaires for select to anon, authenticated using (actif = true);

-- ---------- Exemples (à remplacer par de vraies offres quand des
-- commerçants seront réellement démarchés -- noms génériques,
-- explicitement des exemples, pas de vrais commerces) ----------
insert into offres_partenaires (nom_commerce, type_commerce, ville_code_insee, reduction, description, conditions, ordre)
values
  ('Café du Beffroi (exemple)', 'cafe', '59350', '-10 %', 'Sur l''addition, tous les jours avant 11h.', 'Présente l''appli Notaville en caisse.', 10),
  ('Table Vieux-Lille (exemple)', 'restaurant', '59350', '1 dessert offert', 'Pour toute formule midi du lundi au vendredi.', 'Non cumulable avec une autre offre.', 20),
  ('Atelier Nord Style (exemple)', 'boutique', '59350', '-15 %', 'Sur une sélection d''articles en boutique.', 'Dans la limite des stocks disponibles.', 30),
  ('Friterie du Broutteux (exemple)', 'restaurant', '59599', '-10 %', 'Sur toute commande à emporter.', 'Présente l''appli Notaville en caisse.', 10),
  ('Le Repaire Textile (exemple)', 'bar', '59599', '2ème boisson à -50 %', 'Du jeudi au samedi, à partir de 18h.', 'Une offre par personne et par soirée.', 20)
on conflict do nothing;
