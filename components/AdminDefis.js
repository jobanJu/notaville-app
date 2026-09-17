'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminDefis({ categories, defisInitiaux, recompenses, contributionsInitiales }) {
  const supabase = createClient()
  const [defis, setDefis] = useState(defisInitiaux)
  const [contributions, setContributions] = useState(contributionsInitiales)
  const [motifRejet, setMotifRejet] = useState({})
  const [nouveau, setNouveau] = useState({
    titre: '',
    description: '',
    instructions: '',
    categorie_id: categories[0]?.id ?? '',
    type_participation: 'action_simple',
    difficulte: 'facile',
    cle_recompense: recompenses[0]?.cle ?? '',
  })
  const [envoi, setEnvoi] = useState(false)

  async function creerDefi(e) {
    e.preventDefault()
    setEnvoi(true)
    const { data, error } = await supabase.from('defis').insert(nouveau).select().single()
    if (!error) {
      setDefis((d) => [data, ...d])
      setNouveau((n) => ({ ...n, titre: '', description: '', instructions: '' }))
    }
    setEnvoi(false)
  }

  async function basculerActif(defi) {
    const { data } = await supabase.from('defis').update({ actif: !defi.actif }).eq('id', defi.id).select().single()
    if (data) setDefis((liste) => liste.map((d) => (d.id === data.id ? data : d)))
  }

  async function supprimerDefi(id) {
    const { error } = await supabase.from('defis').delete().eq('id', id)
    if (!error) setDefis((liste) => liste.filter((d) => d.id !== id))
  }

  async function valider(contrib) {
    const { error } = await supabase.from('contributions').update({ statut: 'validee' }).eq('id', contrib.id)
    if (!error) setContributions((liste) => liste.filter((c) => c.id !== contrib.id))
  }

  async function rejeter(contrib) {
    const { error } = await supabase
      .from('contributions')
      .update({ statut: 'rejetee', motif_rejet: motifRejet[contrib.id] || null })
      .eq('id', contrib.id)
    if (!error) setContributions((liste) => liste.filter((c) => c.id !== contrib.id))
  }

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section>
        <h2 className="font-display text-lg font-bold">Créer un défi</h2>
        <form onSubmit={creerDefi} className="mt-3 flex flex-col gap-3 rounded-2xl border border-card-edge bg-card p-4">
          <input
            value={nouveau.titre}
            onChange={(e) => setNouveau({ ...nouveau, titre: e.target.value })}
            placeholder="Titre"
            required
            className="rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
          />
          <textarea
            value={nouveau.description}
            onChange={(e) => setNouveau({ ...nouveau, description: e.target.value })}
            placeholder="Description courte"
            required
            rows={2}
            className="rounded-2xl border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
          />
          <textarea
            value={nouveau.instructions}
            onChange={(e) => setNouveau({ ...nouveau, instructions: e.target.value })}
            placeholder="Instructions (comment participer)"
            rows={2}
            className="rounded-2xl border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={nouveau.categorie_id}
              onChange={(e) => setNouveau({ ...nouveau, categorie_id: Number(e.target.value) })}
              className="rounded-full border border-card-edge bg-bg-soft px-3 py-2 text-sm outline-none focus:border-amber"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
            <select
              value={nouveau.type_participation}
              onChange={(e) => setNouveau({ ...nouveau, type_participation: e.target.value })}
              className="rounded-full border border-card-edge bg-bg-soft px-3 py-2 text-sm outline-none focus:border-amber"
            >
              <option value="action_simple">Action simple</option>
              <option value="multi_etapes">Multi-étapes</option>
              <option value="photo">Photo</option>
              <option value="contribution_donnee">Donnée statistique</option>
              <option value="quiz">Quiz</option>
              <option value="externe">Externe</option>
            </select>
            <select
              value={nouveau.difficulte}
              onChange={(e) => setNouveau({ ...nouveau, difficulte: e.target.value })}
              className="rounded-full border border-card-edge bg-bg-soft px-3 py-2 text-sm outline-none focus:border-amber"
            >
              <option value="facile">Facile</option>
              <option value="moyen">Moyen</option>
              <option value="difficile">Difficile</option>
            </select>
            <select
              value={nouveau.cle_recompense}
              onChange={(e) => setNouveau({ ...nouveau, cle_recompense: e.target.value })}
              className="rounded-full border border-card-edge bg-bg-soft px-3 py-2 text-sm outline-none focus:border-amber"
            >
              {recompenses.map((r) => (
                <option key={r.cle} value={r.cle}>
                  {r.cle} ({r.valeur} Notacoins)
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={envoi} className="btn-primary justify-center">
            {envoi ? 'Création...' : 'Créer le défi'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold">Défis ({defis.length})</h2>
        <div className="mt-3 flex flex-col gap-2">
          {defis.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-card-edge px-4 py-2.5 text-sm">
              <div>
                <p className="font-semibold">{d.titre}</p>
                <p className="text-xs text-text-soft">{d.type_participation} · {d.difficulte} · {d.cle_recompense}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => basculerActif(d)} className={`rounded-full border px-3 py-1 text-xs ${d.actif ? 'border-mint text-mint-ink' : 'border-card-edge text-text-soft'}`}>
                  {d.actif ? 'Actif' : 'Inactif'}
                </button>
                <button onClick={() => supprimerDefi(d.id)} className="rounded-full border border-coral px-3 py-1 text-xs text-coral-ink">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold">Contributions en attente ({contributions.length})</h2>
        {contributions.length === 0 && <p className="mt-3 text-sm text-text-soft">Rien à valider pour le moment.</p>}
        <div className="mt-3 flex flex-col gap-3">
          {contributions.map((c) => (
            <div key={c.id} className="rounded-2xl border border-card-edge bg-card p-4">
              <p className="text-sm font-semibold">{c.defis?.titre}</p>
              <p className="text-xs text-text-soft">
                {c.profiles?.pseudo} · {new Date(c.created_at).toLocaleString('fr-FR')}
              </p>
              <p className="mt-2 text-sm">
                {c.type_contribution === 'donnee_statistique'
                  ? `${c.donnee_cle} = ${c.donnee_valeur}`
                  : c.type_contribution === 'photo'
                    ? c.photo_url
                    : c.contenu?.texte}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => valider(c)} className="rounded-full border border-mint px-3 py-1.5 text-xs text-mint-ink">
                  Valider
                </button>
                <input
                  value={motifRejet[c.id] ?? ''}
                  onChange={(e) => setMotifRejet({ ...motifRejet, [c.id]: e.target.value })}
                  placeholder="Motif du rejet (optionnel)"
                  className="flex-1 rounded-full border border-card-edge bg-bg-soft px-3 py-1.5 text-xs outline-none focus:border-coral"
                />
                <button onClick={() => rejeter(c)} className="rounded-full border border-coral px-3 py-1.5 text-xs text-coral-ink">
                  Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
