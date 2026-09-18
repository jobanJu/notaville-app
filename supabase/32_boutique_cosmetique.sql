-- ============================================================
-- NOTAVILLE — Migration 32 : boutique cosmétique (badges/cadres/titres
-- achetables en Notacoins)
-- ============================================================
--
-- Décision produit (clarifiée avec l'utilisateur) : "badges + pseudo
-- NFT ou niveau achetable en notacoin" = des objets cosmétiques
-- achetables, pas de vraies NFT blockchain (pas de wallet, pas de
-- smart contract, pas de frais de gas -- juste une ligne en base,
-- comme le reste du site). À ne pas confondre avec la table `badges`
-- existante (migration 04) : celle-ci reste le système de badges
-- GAGNÉS automatiquement en contribuant (recalculer_badges). La
-- boutique ci-dessous est un système séparé d'objets ACHETÉS.
create table if not exists boutique_articles (
  id bigint generated always as identity primary key,
  nom text not null,
  description text not null default '',
  -- badge_cosmetique : icône affichée à côté du pseudo (valeur = clé
  -- d'icône, voir components/Icone.js). cadre_pseudo / couleur_pseudo :
  -- valeur = classe Tailwind à appliquer. titre : valeur = texte affiché
  -- sous le pseudo (ex. "Ambassadeur de Lille").
  type text not null check (type in ('badge_cosmetique', 'cadre_pseudo', 'couleur_pseudo', 'titre')),
  valeur text not null,
  prix_notacoins integer not null check (prix_notacoins > 0),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table boutique_articles enable row level security;

-- drop-if-exists avant chaque create policy : rend ce fichier rejouable
-- sans erreur même si une exécution précédente s'est arrêtée en cours
-- de route (ex. copier-coller corrompu par une traduction automatique).
drop policy if exists "La boutique est lisible par tous" on boutique_articles;
create policy "La boutique est lisible par tous"
  on boutique_articles for select to anon, authenticated using (actif = true);

drop policy if exists "Seuls les admins gèrent la boutique" on boutique_articles;
create policy "Seuls les admins gèrent la boutique"
  on boutique_articles for all to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

-- ---------- Objets possédés ----------
create table if not exists profil_articles (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  article_id bigint not null references boutique_articles(id) on delete cascade,
  achete_le timestamptz not null default now(),
  unique (user_id, article_id)
);

alter table profil_articles enable row level security;

drop policy if exists "Chacun voit ses propres articles achetés" on profil_articles;
create policy "Chacun voit ses propres articles achetés"
  on profil_articles for select to authenticated using (auth.uid() = user_id);
-- Pas de policy insert pour les utilisateurs : passe uniquement par
-- acheter_article_boutique() ci-dessous, pour que le débit de Notacoins
-- et l'attribution de l'objet restent atomiques et jamais contournables.

-- ---------- Objet actuellement affiché ----------
alter table profiles add column if not exists article_equipe_id bigint references boutique_articles(id);

-- ---------- Achat ----------
-- Vérifie possession préalable, solde suffisant, puis débite et
-- attribue en une seule transaction. `notacoins_transactions` reçoit un
-- montant négatif -- même grand livre que les gains (migration 03),
-- pour garder un historique unique et cohérent.
create or replace function public.acheter_article_boutique(p_article_id bigint)
returns void as $$
declare
  v_prix integer;
  v_actif boolean;
  v_solde integer;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;

  select prix_notacoins, actif into v_prix, v_actif
  from boutique_articles where id = p_article_id;

  if v_prix is null then
    raise exception 'article introuvable';
  end if;
  if not v_actif then
    raise exception 'cet article n''est plus disponible';
  end if;
  if exists (select 1 from profil_articles where user_id = auth.uid() and article_id = p_article_id) then
    raise exception 'tu possèdes déjà cet article';
  end if;

  select notacoins into v_solde from profiles where id = auth.uid();
  if v_solde is null or v_solde < v_prix then
    raise exception 'solde de Notacoins insuffisant';
  end if;

  insert into profil_articles (user_id, article_id) values (auth.uid(), p_article_id);
  insert into notacoins_transactions (user_id, montant, raison, ref_table, ref_id)
    values (auth.uid(), -v_prix, 'achat_boutique', 'boutique_articles', p_article_id);
  update profiles set notacoins = notacoins - v_prix where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.acheter_article_boutique(bigint) to authenticated;

-- ---------- Équiper / retirer (p_article_id = null pour retirer) ----------
create or replace function public.equiper_article_boutique(p_article_id bigint default null)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  if p_article_id is not null
     and not exists (select 1 from profil_articles where user_id = auth.uid() and article_id = p_article_id) then
    raise exception 'tu ne possèdes pas cet article';
  end if;
  update profiles set article_equipe_id = p_article_id where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.equiper_article_boutique(bigint) to authenticated;

-- ---------- Mes articles (catalogue + possédé + équipé, en un appel) ----------
create or replace function public.ma_boutique()
returns table (
  id bigint,
  nom text,
  description text,
  type text,
  valeur text,
  prix_notacoins integer,
  possede boolean,
  equipe boolean
)
language sql stable security definer set search_path = public
as $$
  select
    a.id, a.nom, a.description, a.type, a.valeur, a.prix_notacoins,
    (pa.id is not null) as possede,
    (p.article_equipe_id = a.id) as equipe
  from boutique_articles a
  left join profil_articles pa on pa.article_id = a.id and pa.user_id = auth.uid()
  left join profiles p on p.id = auth.uid()
  where a.actif = true
  order by a.prix_notacoins asc;
$$;

grant execute on function public.ma_boutique() to authenticated;

-- ---------- Exemples (à compléter/adapter depuis le Table editor Supabase) ----------
insert into boutique_articles (nom, description, type, valeur, prix_notacoins)
select * from (values
  ('Étoile filante', 'Un petit badge scintillant à côté de ton pseudo.', 'badge_cosmetique', 'etincelle', 150),
  ('Couronne', 'Pour les grands contributeurs.', 'badge_cosmetique', 'couronne', 500),
  ('Pseudo doré', 'Ton pseudo s''affiche en doré partout sur le site.', 'couleur_pseudo', 'text-amber-ink font-bold', 300),
  ('Ambassadeur', 'Un titre affiché sous ton pseudo.', 'titre', 'Ambassadeur Notaville', 1000)
) as v(nom, description, type, valeur, prix_notacoins)
where not exists (select 1 from boutique_articles where boutique_articles.nom = v.nom);
