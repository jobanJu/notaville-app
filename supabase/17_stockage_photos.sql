-- ---------- 17. Stockage des photos de défis ----------
-- Jusqu'ici, un défi photo demandait juste un lien vers une photo déjà
-- hébergée ailleurs (Phase "provisoire"). On passe à un vrai envoi
-- direct : bucket Supabase Storage dédié, chaque photo rangée sous
-- <user_id>/<horodatage>-<nom fichier> (voir components/DefiActions.js),
-- pour qu'un utilisateur ne puisse déposer que dans son propre dossier.
insert into storage.buckets (id, name, public)
values ('defis-photos', 'defis-photos', true)
on conflict (id) do nothing;

-- Public en lecture (les photos de défis, une fois validées, sont
-- montrées à tous -- cf. policy "contributions validées visibles par
-- tous" sur la table contributions).
create policy "Les photos de défis sont lisibles par tous"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'defis-photos');

-- Chacun ne peut déposer que dans son propre dossier (premier segment
-- du chemin = son user_id), ce qui empêche d'écraser ou de polluer le
-- dossier d'un autre utilisateur.
create policy "Chacun dépose ses photos dans son propre dossier"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'defis-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Chacun peut supprimer ses propres photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'defis-photos' and (storage.foldername(name))[1] = auth.uid()::text);
