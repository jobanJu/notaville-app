-- Câble l'ajout de lieu au défi communauté "Ajoute un lieu manquant" :
-- contribution -> file d'attente admin (comme les autres) -> validation
-- -> insertion dans `lieux` (supabase/11_lieux.sql) + crédit Notacoins.
-- Pas d'auto-validation (contrairement au quiz) : un lieu ajouté par
-- n'importe qui doit être vérifié avant d'apparaître aux autres.

alter table defis drop constraint if exists defis_type_participation_check;
alter table defis add constraint defis_type_participation_check check (
  type_participation in ('action_simple', 'multi_etapes', 'photo', 'contribution_donnee', 'quiz', 'lieu', 'externe')
);

alter table contributions drop constraint if exists contributions_type_contribution_check;
alter table contributions add constraint contributions_type_contribution_check check (
  type_contribution in ('texte', 'photo', 'donnee_statistique', 'quiz', 'lieu')
);

insert into parametres_recompenses (cle, valeur, description)
values ('ajout_lieu', 40, 'Ajouter un lieu (défi communauté), une fois validé par un admin')
on conflict (cle) do nothing;

insert into defis (categorie_id, titre, description, instructions, type_participation, cle_recompense, difficulte, portee_temporelle, date_debut, date_fin, ordre, donnee_cle)
select id, 'Ajoute un lieu manquant', 'Un resto, un bar, un monument... qui n''est pas encore sur Notaville ?',
  'Indique son nom, son type, son quartier et une courte description. Vérifié par un admin avant de créditer les Notacoins.',
  'lieu', 'ajout_lieu', 'facile', 'permanent', now(), null::timestamptz, 40, null
from categories_defis where cle = 'communaute'
on conflict do nothing;

-- Remplace la fonction de la migration 06 : ajoute la création du lieu
-- au moment où sa contribution passe à "validee" (insertion ou
-- validation admin ultérieure), en plus de la logique déjà en place
-- (auto-correction quiz, crédit des Notacoins).
create or replace function public.traiter_contribution()
returns trigger as $$
declare
  v_type_participation text;
  v_bonne_reponse smallint;
  v_reponse_donnee integer;
begin
  if tg_op = 'INSERT' and new.type_contribution = 'quiz' then
    select d.type_participation into v_type_participation from defis d where d.id = new.defi_id;
    if v_type_participation = 'quiz' then
      select bonne_reponse into v_bonne_reponse from defi_quiz where defi_id = new.defi_id limit 1;
      v_reponse_donnee := nullif(new.contenu->>'reponse_choisie', '')::integer;
      if v_bonne_reponse is not null and v_reponse_donnee = v_bonne_reponse then
        new.statut := 'validee';
      else
        new.statut := 'rejetee';
        new.motif_rejet := 'Mauvaise réponse.';
      end if;
    end if;
  end if;

  if new.statut = 'validee'
     and (tg_op = 'INSERT' or old.statut is distinct from 'validee')
     and not new.notacoins_credites then

    if new.type_contribution = 'lieu' then
      insert into lieux (quartier_id, nom, type, description, adresse, source, cree_par, actif)
      values (
        nullif(new.contenu->>'quartier_id', '')::integer,
        new.contenu->>'nom',
        coalesce(nullif(new.contenu->>'type', ''), 'autre'),
        new.contenu->>'description',
        nullif(new.contenu->>'adresse', ''),
        'communaute',
        new.user_id,
        true
      );
    end if;

    perform public.crediter_notacoins(
      new.user_id,
      coalesce(new.cle_recompense, 'defi_action_simple'),
      'contributions',
      new.id
    );
    new.notacoins_credites := true;
    new.traitee_le := now();
  elsif new.statut = 'rejetee' and (tg_op = 'INSERT' or old.statut is distinct from 'rejetee') then
    new.traitee_le := now();
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
