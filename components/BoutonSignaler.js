'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MOTIFS = [
  { valeur: 'contenu_faux', label: 'Information fausse ou trompeuse' },
  { valeur: 'contenu_inapproprie', label: 'Contenu injurieux ou déplacé' },
  { valeur: 'spam', label: 'Spam ou publicité' },
  { valeur: 'doublon', label: 'Doublon / existe déjà' },
  { valeur: 'autre', label: 'Autre' },
]

// Bouton de signalement réutilisable, à poser à côté de tout contenu
// déposé par un utilisateur (lieu, photo, avis...). N'affiche jamais
// le contenu signalé à d'autres utilisateurs : le signalement part
// dans une table dédiée, modérée depuis la console Supabase (comme le
// reste de la modération en Phase 1 -- voir contributions.statut).
export default function BoutonSignaler({ cibleType, cibleId, demo = false }) {
  const [ouvert, setOuvert] = useState(false)
  const [motif, setMotif] = useState('')
  const [detail, setDetail] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const supabase = createClient()

  async function envoyer(e) {
    e.preventDefault()
    if (!motif) return
    setEnvoi(true)
    setErreur(null)

    if (demo) {
      setEnvoye(true)
      setEnvoi(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('signalements').insert({
      user_id: user?.id ?? null,
      cible_type: cibleType,
      cible_id: String(cibleId),
      motif,
      detail: detail.trim() || null,
    })

    if (error) {
      setErreur("Le signalement n'a pas pu être envoyé.")
      setEnvoi(false)
      return
    }
    setEnvoye(true)
    setEnvoi(false)
  }

  if (envoye) {
    return <span className="text-[11px] text-mint-ink">Signalement envoyé, merci.</span>
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-[11px] text-text-soft underline decoration-dotted hover:text-coral-ink"
      >
        Signaler
      </button>
    )
  }

  return (
    <form
      onSubmit={envoyer}
      className="mt-2 flex flex-col gap-2 rounded-xl border border-card-edge bg-bg-soft p-3 text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <select
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        required
        className="w-full rounded-full border border-card-edge bg-bg px-3 py-1.5 text-xs outline-none focus:border-coral"
      >
        <option value="">Motif du signalement...</option>
        {MOTIFS.map((m) => (
          <option key={m.valeur} value={m.valeur}>{m.label}</option>
        ))}
      </select>
      <input
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="Précision (facultatif)"
        className="w-full rounded-full border border-card-edge bg-bg px-3 py-1.5 text-xs outline-none focus:border-coral"
      />
      {erreur && <p className="text-coral-ink">{erreur}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={envoi || !motif}
          className="rounded-full bg-coral px-3 py-1.5 text-[11px] font-semibold text-[#2A0F0F] disabled:opacity-50"
        >
          {envoi ? 'Envoi...' : 'Envoyer'}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-full border border-card-edge px-3 py-1.5 text-[11px] text-text-soft"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
