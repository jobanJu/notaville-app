'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CitySearch from '@/components/CitySearch'
import { TYPES_EVENEMENT } from '@/lib/evenements'

export default function AdminEvenements({ evenementsInitiaux }) {
  const supabase = createClient()
  const [evenements, setEvenements] = useState(evenementsInitiaux)
  const [ville, setVille] = useState(null)
  const [nouveau, setNouveau] = useState({
    titre: '',
    description: '',
    lieu: '',
    type_evenement: TYPES_EVENEMENT[0].valeur,
    date_debut: '',
    date_fin: '',
    lien_externe: '',
  })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)

  async function creerEvenement(e) {
    e.preventDefault()
    setErreur(null)

    if (!ville) {
      setErreur('Choisis une ville.')
      return
    }
    if (!nouveau.date_debut) {
      setErreur('Choisis une date de début.')
      return
    }

    setEnvoi(true)
    const { data, error } = await supabase
      .from('evenements')
      .insert({
        titre: nouveau.titre,
        description: nouveau.description,
        ville_code_insee: ville.code_insee,
        lieu: nouveau.lieu || null,
        type_evenement: nouveau.type_evenement,
        date_debut: new Date(nouveau.date_debut).toISOString(),
        date_fin: nouveau.date_fin ? new Date(nouveau.date_fin).toISOString() : null,
        lien_externe: nouveau.lien_externe || null,
      })
      .select('id, titre, description, ville_code_insee, lieu, type_evenement, date_debut, date_fin, lien_externe, actif, villes(nom)')
      .single()

    if (error) {
      setErreur("L'évènement n'a pas pu être créé.")
      setEnvoi(false)
      return
    }

    setEvenements((liste) => [data, ...liste])
    setNouveau({ titre: '', description: '', lieu: '', type_evenement: TYPES_EVENEMENT[0].valeur, date_debut: '', date_fin: '', lien_externe: '' })
    setVille(null)
    setEnvoi(false)
  }

  async function basculerActif(ev) {
    const { data } = await supabase.from('evenements').update({ actif: !ev.actif }).eq('id', ev.id).select('*, villes(nom)').single()
    if (data) setEvenements((liste) => liste.map((e) => (e.id === data.id ? data : e)))
  }

  async function supprimer(id) {
    const { error } = await supabase.from('evenements').delete().eq('id', id)
    if (!error) setEvenements((liste) => liste.filter((e) => e.id !== id))
  }

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section>
        <h2 className="font-display text-lg font-bold">Créer un évènement</h2>
        <form onSubmit={creerEvenement} className="mt-3 flex flex-col gap-3 rounded-2xl border border-card-edge bg-card p-4">
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
            placeholder="Description"
            rows={2}
            className="rounded-2xl border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
          />
          <CitySearch onSelect={setVille} valeurInitiale={ville} placeholder="Ville de l'évènement..." />
          <input
            value={nouveau.lieu}
            onChange={(e) => setNouveau({ ...nouveau, lieu: e.target.value })}
            placeholder="Lieu (ex : Grand-Place)"
            className="rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={nouveau.type_evenement}
              onChange={(e) => setNouveau({ ...nouveau, type_evenement: e.target.value })}
              className="rounded-full border border-card-edge bg-bg-soft px-3 py-2 text-sm outline-none focus:border-amber"
            >
              {TYPES_EVENEMENT.map((t) => (
                <option key={t.valeur} value={t.valeur}>{t.label}</option>
              ))}
            </select>
            <input
              value={nouveau.lien_externe}
              onChange={(e) => setNouveau({ ...nouveau, lien_externe: e.target.value })}
              placeholder="Lien (billetterie...)"
              className="rounded-full border border-card-edge bg-bg-soft px-3 py-2 text-sm outline-none focus:border-amber"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-text-soft">Début</label>
              <input
                type="datetime-local"
                value={nouveau.date_debut}
                onChange={(e) => setNouveau({ ...nouveau, date_debut: e.target.value })}
                required
                className="w-full rounded-full border border-card-edge bg-bg-soft px-3 py-2 text-sm outline-none focus:border-amber"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-text-soft">Fin (optionnel)</label>
              <input
                type="datetime-local"
                value={nouveau.date_fin}
                onChange={(e) => setNouveau({ ...nouveau, date_fin: e.target.value })}
                className="w-full rounded-full border border-card-edge bg-bg-soft px-3 py-2 text-sm outline-none focus:border-amber"
              />
            </div>
          </div>
          {erreur && <p className="text-sm text-coral-ink">{erreur}</p>}
          <button type="submit" disabled={envoi} className="btn-primary justify-center disabled:opacity-50">
            {envoi ? 'Création...' : "Créer l'évènement"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold">Évènements ({evenements.length})</h2>
        <div className="mt-3 flex flex-col gap-2">
          {evenements.map((e) => (
            <div key={e.id} className="rounded-2xl border border-card-edge bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{e.titre}</p>
                  <p className="mt-0.5 text-xs text-text-soft">
                    {e.villes?.nom ?? e.ville_code_insee}
                    {e.lieu ? ` · ${e.lieu}` : ''} ·{' '}
                    {new Date(e.date_debut).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase ${e.actif ? 'border-mint/40 text-mint-ink' : 'border-card-edge text-text-soft'}`}>
                  {e.actif ? 'Actif' : 'Masqué'}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => basculerActif(e)} className="rounded-full border border-card-edge px-3 py-1 text-xs hover:border-amber">
                  {e.actif ? 'Masquer' : 'Réactiver'}
                </button>
                <button type="button" onClick={() => supprimer(e.id)} className="rounded-full border border-card-edge px-3 py-1 text-xs text-coral-ink hover:border-coral">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
          {evenements.length === 0 && <p className="text-sm text-text-soft">Aucun évènement pour l&apos;instant.</p>}
        </div>
      </section>
    </div>
  )
}
