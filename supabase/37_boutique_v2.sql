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
