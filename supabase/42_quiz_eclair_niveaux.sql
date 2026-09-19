-- ============================================================
-- NOTAVILLE — Migration 42 : Quiz éclair, 50 niveaux + quota quotidien
-- ============================================================
--
-- Refonte du Quiz éclair (jusqu'ici : questions à l'infini, sans fin
-- ni enjeu) en jeu à progression :
--   - 10 questions par partie (le tirage lui-même vit côté client,
--     lib/demo/quizEclairNiveaux.js, comme les autres jeux -- rien à
--     stocker en base pour ça).
--   - 50 niveaux de difficulté croissante (villes de moins en moins
--     connues), un seul débloqué au départ.
--   - Une partie par jour ET par niveau débloqué : la limite anti-abus
--     ci-dessous (max_par_jour = 50 = le nombre de niveaux) est le
--     garde-fou serveur ; comme pour /jeux/ville-mystere, le suivi
--     "déjà joué aujourd'hui" au jour le jour reste côté client
--     (localStorage) -- même principe déjà en place dans ce jeu-là,
--     pas besoin d'une table dédiée aux parties pour le reproduire ici.
--   - 10/10 pour gagner 10 Notacoins ce jour-là, à ce niveau.
--   - Le niveau supérieur se débloque avec 10 Notacoins, mais
--     seulement après avoir déjà réussi (10/10) le niveau actuel au
--     moins une fois -- d'où la colonne `niveau_quiz_eclair_reussi`
--     ci-dessous, seule trace nécessaire côté serveur (pas besoin
--     d'historiser chaque partie).

-- ---------- Colonnes de progression ----------
alter table profiles add column if not exists niveau_quiz_eclair integer not null default 1;
alter table profiles add column if not exists niveau_quiz_eclair_reussi integer not null default 0;

-- ALTER TABLE ... ADD CONSTRAINT n'a pas de "if not exists" natif en
-- PostgreSQL (contrairement à ADD COLUMN) -- on le simule pour que ce
-- fichier reste rejouable sans erreur, comme le reste des migrations.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quiz_eclair_niveau_borne') then
    alter table profiles add constraint quiz_eclair_niveau_borne check (niveau_quiz_eclair between 1 and 50);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quiz_eclair_niveau_reussi_borne') then
    alter table profiles add constraint quiz_eclair_niveau_reussi_borne check (niveau_quiz_eclair_reussi between 0 and 50);
  end if;
end $$;

-- Même faille que pour est_admin/est_moderateur (migration 40) et
-- notacoins (migration 31) : la policy "chacun modifie son propre
-- profil" (migration 01) n'exclut par défaut aucune colonne. Sans ce
-- verrou, un compte pourrait s'auto-attribuer le niveau 50 depuis la
-- console du navigateur. Seules les fonctions SECURITY DEFINER
-- ci-dessous peuvent désormais modifier ces deux colonnes.
revoke update (niveau_quiz_eclair, niveau_quiz_eclair_reussi) on profiles from authenticated;

-- ---------- Barème et anti-abus ----------
insert into parametres_recompenses (cle, valeur, description) values
  ('quiz_eclair_quotidien', 10, 'Quiz éclair du jour réussi (10/10) à un niveau débloqué')
on conflict (cle) do update set valeur = excluded.valeur, description = excluded.description;

insert into limites_anti_abus (raison, max_par_jour) values
  ('quiz_eclair_quotidien', 50)
on conflict (raison) do update set max_par_jour = excluded.max_par_jour;

-- ---------- Valider une partie ----------
-- Le niveau vient du client (quel palier vient d'être joué) mais reste
-- vérifié côté serveur contre le niveau réellement débloqué -- un
-- appel direct à cette fonction ne permet donc pas de se créditer pour
-- un niveau non débloqué. Le score, lui, ne sert qu'à décider du gain
-- (0 Notacoin si < 10/10) : le quota "une fois par jour et par niveau"
-- reste appliqué par crediter_notacoins() via la limite anti-abus
-- ci-dessus, pas ici.
create or replace function public.valider_quiz_eclair(p_niveau integer, p_score integer)
returns integer as $$
declare
  v_niveau_debloque integer;
  v_gain integer := 0;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  if p_score < 0 or p_score > 10 then
    raise exception 'score invalide';
  end if;

  select niveau_quiz_eclair into v_niveau_debloque from profiles where id = auth.uid();
  if p_niveau < 1 or p_niveau > coalesce(v_niveau_debloque, 1) then
    raise exception 'ce niveau n''est pas débloqué';
  end if;

  if p_score = 10 then
    update profiles
      set niveau_quiz_eclair_reussi = greatest(niveau_quiz_eclair_reussi, p_niveau)
      where id = auth.uid();
    v_gain := coalesce(public.crediter_notacoins(auth.uid(), 'quiz_eclair_quotidien', 'jeux', null), 0);
  end if;

  return v_gain;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.valider_quiz_eclair(integer, integer) to authenticated;

-- ---------- Débloquer le niveau supérieur ----------
create or replace function public.debloquer_niveau_quiz_eclair()
returns integer as $$
declare
  v_niveau integer;
  v_niveau_reussi integer;
  v_solde integer;
  v_cout constant integer := 10;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;

  select niveau_quiz_eclair, niveau_quiz_eclair_reussi, notacoins
    into v_niveau, v_niveau_reussi, v_solde
    from profiles where id = auth.uid();

  if v_niveau >= 50 then
    raise exception 'niveau maximum déjà atteint';
  end if;
  if v_niveau_reussi < v_niveau then
    raise exception 'termine d''abord le niveau actuel avec un score de 10/10';
  end if;
  if v_solde is null or v_solde < v_cout then
    raise exception 'solde de Notacoins insuffisant';
  end if;

  insert into notacoins_transactions (user_id, montant, raison, ref_table, ref_id)
    values (auth.uid(), -v_cout, 'deblocage_niveau_quiz_eclair', 'profiles', null);
  update profiles
    set notacoins = notacoins - v_cout, niveau_quiz_eclair = niveau_quiz_eclair + 1
    where id = auth.uid();

  return v_niveau + 1;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.debloquer_niveau_quiz_eclair() to authenticated;
