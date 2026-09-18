-- ============================================================
-- NOTAVILLE — Migrations 32, 37, 38, 39 regroupées en un seul
-- fichier, à copier-coller EN UNE FOIS dans l'éditeur SQL
-- Supabase (méthode TextEdit habituelle : ouvre ce fichier avec
-- 'open -e', ⌘A, ⌘C, colle dans Supabase, exécute).
--
-- Ordre : 32 (complète la boutique -- profil_articles manquant)
-- -> 37 (boutique v2 + équipements multi-slots) -> 38 (pseudo +
-- avatar à l'inscription) -> 39 (connexion par pseudo).
--
-- Toutes les instructions ci-dessous sont rejouables sans erreur
-- (create table if not exists, create or replace function,
-- drop policy if exists avant chaque create policy) : si un
-- morceau a déjà été appliqué avec succès, le relancer ne casse
-- rien.
-- ============================================================

-- #################### 32_boutique_cosmetique.sql ####################
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

-- #################### 37_boutique_v2.sql ####################
-- ============================================================
-- NOTAVILLE — Migration 37 : boutique v2 (prix réajustés + nouveaux articles)
-- ============================================================
--
-- Les 4 articles de la migration 32 avaient des prix calibrés sur
-- l'ancien barème (avis = 25 NC). Avec le nouveau barème (migration 36,
-- avis = 500 NC), ils seraient devenus quasi gratuits -- réajustés ici
-- à la même échelle, et complétés par 6 nouveaux articles pour une
-- vraie progression (du premier achat accessible en quelques avis, au
-- badge légendaire qui demande un vrai investissement).
update boutique_articles set prix_notacoins = 2000  where nom = 'Étoile filante';
update boutique_articles set prix_notacoins = 8000  where nom = 'Couronne';
update boutique_articles set prix_notacoins = 5000  where nom = 'Pseudo doré';
update boutique_articles set prix_notacoins = 15000 where nom = 'Ambassadeur';

insert into boutique_articles (nom, description, type, valeur, prix_notacoins)
select * from (values
  ('Pseudo bleu nuit', 'Ton pseudo en bleu profond.', 'couleur_pseudo', 'text-[#3B5BA9] font-bold', 2000),
  ('Cadre bronze', 'Un liseré bronze autour de ton avatar.', 'cadre_pseudo', 'ring-2 ring-[#B08D57]', 3000),
  ('Habitué', 'Un titre affiché sous ton pseudo.', 'titre', 'Habitué de Notaville', 6000),
  ('Cadre argent', 'Un liseré argenté autour de ton avatar.', 'cadre_pseudo', 'ring-2 ring-[#9CA3AF]', 10000),
  ('Cadre or', 'Un liseré doré autour de ton avatar.', 'cadre_pseudo', 'ring-2 ring-[#D4AF37]', 30000),
  ('Pilier de Notaville', 'Le badge le plus rare -- pour les plus grands contributeurs.', 'badge_cosmetique', 'couronne', 50000)
) as v(nom, description, type, valeur, prix_notacoins)
where not exists (select 1 from boutique_articles where boutique_articles.nom = v.nom);

-- ---------- Correction : un emplacement équipé PAR TYPE, pas un seul ----------
-- Le premier jet (migration 32) n'avait qu'un seul `article_equipe_id`
-- sur le profil : impossible d'équiper à la fois une couleur de pseudo
-- ET un cadre ET un titre. Avec 4 types d'articles désormais en
-- boutique, ce n'était plus tenable. `profiles.article_equipe_id` reste
-- en base (inoffensif, non utilisé) mais n'est plus la source de
-- vérité -- remplacé par une table à un emplacement par type.
create table if not exists profil_equipements (
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  article_id bigint not null references boutique_articles(id) on delete cascade,
  primary key (user_id, type)
);

alter table profil_equipements enable row level security;

drop policy if exists "Chacun voit ses propres équipements" on profil_equipements;
create policy "Chacun voit ses propres équipements"
  on profil_equipements for select to authenticated using (auth.uid() = user_id);
-- Pas de policy insert/update/delete directe : uniquement via les
-- fonctions ci-dessous.

-- La version migration 32 avait `p_article_id bigint default null` ;
-- Postgres refuse un `create or replace` qui retire un défaut de
-- paramètre, il faut la supprimer explicitement avant de la recréer.
drop function if exists public.equiper_article_boutique(bigint);
create or replace function public.equiper_article_boutique(p_article_id bigint)
returns void as $$
declare
  v_type text;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  if p_article_id is null then
    raise exception 'article manquant -- utilise desequiper_article_boutique() pour retirer un article';
  end if;

  select type into v_type from boutique_articles where id = p_article_id;
  if v_type is null then
    raise exception 'article introuvable';
  end if;
  if not exists (select 1 from profil_articles where user_id = auth.uid() and article_id = p_article_id) then
    raise exception 'tu ne possèdes pas cet article';
  end if;

  insert into profil_equipements (user_id, type, article_id) values (auth.uid(), v_type, p_article_id)
  on conflict (user_id, type) do update set article_id = excluded.article_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.equiper_article_boutique(bigint) to authenticated;

create or replace function public.desequiper_article_boutique(p_type text)
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  delete from profil_equipements where user_id = auth.uid() and type = p_type;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.desequiper_article_boutique(text) to authenticated;

-- ma_boutique() : "équipé" se lit maintenant par type, pas par un seul id.
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
    (pe.article_id = a.id) as equipe
  from boutique_articles a
  left join profil_articles pa on pa.article_id = a.id and pa.user_id = auth.uid()
  left join profil_equipements pe on pe.type = a.type and pe.user_id = auth.uid()
  where a.actif = true
  order by a.prix_notacoins asc;
$$;

grant execute on function public.ma_boutique() to authenticated;

-- Pour afficher les articles équipés d'un utilisateur (ex. page profil).
create or replace function public.mes_equipements()
returns table (type text, nom text, valeur text)
language sql stable security definer set search_path = public
as $$
  select a.type, a.nom, a.valeur
  from profil_equipements pe
  join boutique_articles a on a.id = pe.article_id
  where pe.user_id = auth.uid();
$$;

grant execute on function public.mes_equipements() to authenticated;

-- #################### 38_auth_pseudo_avatar.sql ####################
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

-- #################### 39_login_par_pseudo.sql ####################
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
