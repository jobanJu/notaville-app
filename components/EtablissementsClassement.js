'use client'

// Classement national par type d'établissement public ("meilleurs
// hôpitaux de France", "meilleures gares"...), sur le même principe que
// LieuxRecommandes.js (notation directe, upsert avis_etablissements)
// mais à l'échelle nationale plutôt que par quartier. Minimum de 3 avis
// avant d'apparaître au classement (voir supabase/21_etablissements.sql)
// pour qu'un seul avis à 5/5 ne ressorte pas premier.
import { useEffect, useState } from 'react'
import { Star, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import { demoEtablissements } from '@/lib/demo/data'
import { TYPES_ETABLISSEMENT, labelTypeEtablissement } from '@/lib/etablissements'
import CitySearch from '@/components/CitySearch'
import Icone from '@/components/Icone'

const TYPES_ONGLET = TYPES_ETABLISSEMENT.filter((t) => t.valeur !== 'autre')

export default function EtablissementsClassement() {
  const [type, setType] = useState('hopital')
  const [classement, setClassement] = useState([])
  const [chargement, setChargement] = useState(true)
  const [message, setMessage] = useState('')
  const [ajoutOuvert, setAjoutOuvert] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let annule = false

    async function charger() {
      setChargement(true)
      if (isDemoModeClient()) {
        const lignes = demoEtablissements
          .filter((e) => e.type === type && (e.nbAvis ?? 0) >= 3)
          .sort((a, b) => b.noteMoyenne - a.noteMoyenne || b.nbAvis - a.nbAvis)
        if (!annule) {
          setClassement(lignes)
          setChargement(false)
        }
        return
      }
      const { data } = await supabase.rpc('classement_etablissements', { p_type: type, p_limite: 20 })
      if (!annule) {
        setClassement(data ?? [])
        setChargement(false)
      }
    }

    charger()
    return () => {
      annule = true
    }
  }, [type])

  async function noter(etablissement, note) {
    if (isDemoModeClient()) {
      setMessage(`${etablissement.nom} noté ${note}/5 — démo, rien n'est sauvegardé`)
      return
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('avis_etablissements')
      .upsert({ etablissement_id: etablissement.id, user_id: user.id, note }, { onConflict: 'etablissement_id,user_id' })
    setMessage(error ? "Cette note n'a pas pu être enregistrée." : `${etablissement.nom} noté ${note}/5. Merci !`)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TYPES_ONGLET.map((t) => (
          <button
            key={t.valeur}
            onClick={() => setType(t.valeur)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              type === t.valeur ? 'bg-gradient-to-r from-coral to-amber text-[#2A0F0F]' : 'border border-card-edge text-text-soft'
            }`}
          >
            <Icone nom={t.icone} className="h-3.5 w-3.5" />
            {t.label}s
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-card-edge">
        {chargement && <p className="p-6 text-center text-sm text-text-soft">Chargement...</p>}
        {!chargement && classement.length === 0 && (
          <p className="p-6 text-center text-sm text-text-soft">
            Pas encore assez d&apos;avis pour classer les {labelTypeEtablissement(type).toLowerCase()}s (minimum 3
            avis).
          </p>
        )}
        {!chargement &&
          classement.map((e, i) => (
            <div key={e.id} className="border-b border-card-edge px-4 py-3 last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-5 shrink-0 font-mono text-sm text-text-soft">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.nom}</p>
                  <p className="text-xs text-text-soft">
                    {e.ville_nom ?? e.villeNom}
                    {(e.departement) ? ` · ${e.departement}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="flex items-center justify-end gap-1 font-mono text-sm text-amber-ink">
                    <Star className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
                    {e.note_moyenne ?? e.noteMoyenne}
                  </p>
                  <p className="text-[10px] text-text-soft">{e.nb_avis ?? e.nbAvis} avis</p>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2 pl-8">
                <span className="text-[11px] text-text-soft">Noter :</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => noter(e, n)}
                      className="text-text-soft hover:text-amber-ink"
                      aria-label={`Noter ${e.nom} ${n}/5`}
                    >
                      <Star className="h-3 w-3" strokeWidth={1.75} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>

      {message && <p className="mt-3 text-center text-xs text-text-soft">{message}</p>}

      <div className="mt-4">
        {ajoutOuvert ? (
          <FormulaireAjoutEtablissement onFerme={() => setAjoutOuvert(false)} onMessage={setMessage} />
        ) : (
          <button
            onClick={() => setAjoutOuvert(true)}
            className="mx-auto flex items-center gap-1.5 rounded-full border border-card-edge px-3 py-1.5 text-xs text-text-soft hover:border-amber"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Ajouter un établissement manquant
          </button>
        )}
      </div>
    </div>
  )
}

function FormulaireAjoutEtablissement({ onFerme, onMessage }) {
  const [nom, setNom] = useState('')
  const [type, setType] = useState('hopital')
  const [ville, setVille] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const supabase = createClient()

  async function soumettre(e) {
    e.preventDefault()
    if (!nom.trim() || !ville) return
    setEnvoi(true)

    if (isDemoModeClient()) {
      await new Promise((r) => setTimeout(r, 300))
      onMessage(`${nom} ajouté — démo, rien n'est sauvegardé. Sois parmi les 3 premiers à le noter pour qu'il apparaisse au classement.`)
      setEnvoi(false)
      onFerme()
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase.from('etablissements').insert({
      nom,
      type,
      ville_code_insee: ville.code_insee,
      cree_par: user?.id ?? null,
    })

    setEnvoi(false)
    if (error) {
      onMessage("Cet établissement n'a pas pu être ajouté.")
      return
    }
    onMessage(`${nom} ajouté ! Sois parmi les 3 premiers à le noter pour qu'il apparaisse au classement.`)
    onFerme()
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-2 rounded-2xl border border-card-edge bg-card p-4">
      <p className="font-display text-sm font-bold">Ajouter un établissement</p>
      <input
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Nom de l'établissement"
        required
        className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-2 text-sm outline-none focus:border-amber"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-2 text-sm outline-none focus:border-amber"
        >
          {TYPES_ETABLISSEMENT.map((t) => (
            <option key={t.valeur} value={t.valeur}>{t.label}</option>
          ))}
        </select>
        <CitySearch onSelect={setVille} placeholder="Ville de l'établissement" />
      </div>
      <div className="mt-1 flex justify-end gap-2">
        <button type="button" onClick={onFerme} className="rounded-full px-3 py-1.5 text-xs text-text-soft">
          Annuler
        </button>
        <button
          type="submit"
          disabled={envoi || !ville || !nom.trim()}
          className="btn-primary px-4 py-1.5 text-xs disabled:opacity-50"
        >
          {envoi ? 'Envoi...' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
}
