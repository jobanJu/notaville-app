-- ============================================================
-- NOTAVILLE — Migration 33 : messagerie privée + contact modération
-- ============================================================
--
-- Décision produit (clarifiée avec l'utilisateur) : deux choses à la
-- fois, distinctes du mur public déjà livré (migration 29, qui reste
-- pour les échanges ouverts par ville) --
--   1. Messages privés 1-à-1 entre deux comptes.
--   2. Un canal pour contacter la modération, séparé des messages
--      privés classiques. Nécessite un rôle "modérateur" distinct
--      d'admin (est_admin, migration 06) : un modérateur peut voir/
--      répondre aux tickets de modération sans avoir les droits admin
--      complets (gestion défis/évènements/boutique).
alter table profiles add column if not exists est_moderateur boolean not null default false;

create or replace function public.est_moderateur_ou_admin()
returns boolean as $$
  select coalesce((select est_admin or est_moderateur from profiles where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

grant execute on function public.est_moderateur_ou_admin() to authenticated;

-- ---------- Conversations ----------
-- type 'privee' : user_a/user_b sont les deux participants, toujours
-- connus dès la création (via demarrer_conversation_privee ci-dessous).
-- type 'moderation' : user_a = la personne qui contacte la modération,
-- user_b = null tant qu'aucun modérateur n'a répondu ("ticket ouvert" /
-- pris en charge), rempli au premier message d'un modérateur.
create table if not exists conversations (
  id bigint generated always as identity primary key,
  type text not null default 'privee' check (type in ('privee', 'moderation')),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Une seule conversation privée par paire d'utilisateurs (peu importe
-- qui a démarré l'échange -- least/greatest normalise l'ordre).
create unique index if not exists uniq_conv_privee
  on conversations (least(user_a, user_b), greatest(user_a, user_b))
  where type = 'privee';

-- Un seul ticket de modération ouvert à la fois par utilisateur.
create unique index if not exists uniq_conv_moderation_ouverte
  on conversations (user_a) where type = 'moderation';

alter table conversations enable row level security;

drop policy if exists "Participant voit sa conversation" on conversations;
create policy "Participant voit sa conversation"
  on conversations for select to authenticated
  using (
    auth.uid() = user_a or auth.uid() = user_b
    or (type = 'moderation' and public.est_moderateur_ou_admin())
  );

drop policy if exists "Chacun démarre une conversation où il est participant" on conversations;
create policy "Chacun démarre une conversation où il est participant"
  on conversations for insert to authenticated
  with check (auth.uid() = user_a);

-- Permet à un modérateur de "prendre" un ticket non assigné (poser
-- user_b = lui-même) -- voir contacter_moderation() plus bas pour la
-- création côté utilisateur.
drop policy if exists "Un modérateur peut s'assigner un ticket de modération" on conversations;
create policy "Un modérateur peut s'assigner un ticket de modération"
  on conversations for update to authenticated
  using (type = 'moderation' and public.est_moderateur_ou_admin())
  with check (type = 'moderation' and public.est_moderateur_ou_admin());

-- ---------- Messages ----------
create table if not exists messages_prives (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references conversations(id) on delete cascade,
  expediteur_id uuid not null references profiles(id) on delete cascade,
  contenu text not null check (char_length(trim(contenu)) between 1 and 2000),
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_prives_conv on messages_prives(conversation_id, created_at);

alter table messages_prives enable row level security;

drop policy if exists "Participant lit les messages de sa conversation" on messages_prives;
create policy "Participant lit les messages de sa conversation"
  on messages_prives for select to authenticated
  using (
    exists (
      select 1 from conversations c where c.id = conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid()
           or (c.type = 'moderation' and public.est_moderateur_ou_admin()))
    )
  );

drop policy if exists "Participant envoie un message dans sa conversation" on messages_prives;
create policy "Participant envoie un message dans sa conversation"
  on messages_prives for insert to authenticated
  with check (
    expediteur_id = auth.uid()
    and exists (
      select 1 from conversations c where c.id = conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid()
           or (c.type = 'moderation' and public.est_moderateur_ou_admin()))
    )
  );

-- Marquer comme lu reste possible pour un participant, mais uniquement
-- le champ `lu` -- le trigger ci-dessous empêche de modifier le contenu
-- ou l'expéditeur d'un message existant (intégrité des échanges, y
-- compris pour les tickets de modération).
drop policy if exists "Participant marque les messages comme lus" on messages_prives;
create policy "Participant marque les messages comme lus"
  on messages_prives for update to authenticated
  using (
    exists (
      select 1 from conversations c where c.id = conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid()
           or (c.type = 'moderation' and public.est_moderateur_ou_admin()))
    )
  )
  with check (true);

create or replace function public.proteger_contenu_message()
returns trigger as $$
begin
  if new.contenu is distinct from old.contenu
     or new.expediteur_id is distinct from old.expediteur_id
     or new.conversation_id is distinct from old.conversation_id then
    raise exception 'seul le statut lu peut être modifié';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_proteger_contenu_message on messages_prives;
create trigger trg_proteger_contenu_message
  before update on messages_prives
  for each row execute procedure public.proteger_contenu_message();

-- ---------- Démarrer une conversation privée (ou récupérer l'existante) ----------
create or replace function public.demarrer_conversation_privee(p_autre_user_id uuid)
returns bigint as $$
declare
  v_id bigint;
  v_a uuid := least(auth.uid(), p_autre_user_id);
  v_b uuid := greatest(auth.uid(), p_autre_user_id);
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  if p_autre_user_id = auth.uid() then
    raise exception 'impossible de se contacter soi-même';
  end if;
  if not exists (select 1 from profiles where id = p_autre_user_id) then
    raise exception 'utilisateur introuvable';
  end if;

  select id into v_id from conversations where type = 'privee' and user_a = v_a and user_b = v_b;
  if v_id is null then
    insert into conversations (type, user_a, user_b) values ('privee', v_a, v_b) returning id into v_id;
  end if;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.demarrer_conversation_privee(uuid) to authenticated;

-- ---------- Contacter la modération (ou récupérer le ticket déjà ouvert) ----------
create or replace function public.contacter_moderation()
returns bigint as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;

  select id into v_id from conversations where type = 'moderation' and user_a = auth.uid();
  if v_id is null then
    insert into conversations (type, user_a) values ('moderation', auth.uid()) returning id into v_id;
  end if;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.contacter_moderation() to authenticated;

-- ---------- Liste des conversations (boîte de réception) ----------
create or replace function public.mes_conversations()
returns table (
  id bigint,
  type text,
  autre_pseudo text,
  dernier_message text,
  dernier_message_le timestamptz,
  non_lus bigint
)
language sql stable security definer set search_path = public
as $$
  select
    c.id,
    c.type,
    case
      when c.type = 'moderation' then 'Modération Notaville'
      when c.user_a = auth.uid() then pb.pseudo
      else pa.pseudo
    end as autre_pseudo,
    dm.contenu,
    dm.created_at,
    (select count(*) from messages_prives m2
       where m2.conversation_id = c.id and m2.lu = false and m2.expediteur_id <> auth.uid())
  from conversations c
  left join profiles pa on pa.id = c.user_a
  left join profiles pb on pb.id = c.user_b
  left join lateral (
    select contenu, created_at from messages_prives m
    where m.conversation_id = c.id order by created_at desc limit 1
  ) dm on true
  where c.user_a = auth.uid() or c.user_b = auth.uid()
     or (c.type = 'moderation' and public.est_moderateur_ou_admin() and c.user_b is null)
  order by coalesce(dm.created_at, c.created_at) desc;
$$;

grant execute on function public.mes_conversations() to authenticated;

-- ---------- Pour activer un compte modérateur ----------
-- update profiles set est_moderateur = true where pseudo = '...';
