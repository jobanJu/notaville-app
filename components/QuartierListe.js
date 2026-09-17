'use client'

import { useState } from 'react'
import { X, Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Remplace l'ancienne carte Leaflet (QuartierCarte/QuartierCarteInterne) :
// même mécanique de notation (un clic j'aime/je ne connais pas -> table
// `notes`, crédit Notacoins inchangé), en liste simple plutôt qu'une
// carte qui prenait toute la page et n'avait de coordonnées que pour les
// quartiers de Lille (voir supabase/10_quartiers_coordonnees.sql). Une
// liste fonctionne identiquement pour toutes les villes, sans attendre
// une couverture géographique complète.
export default function QuartierListe({ quartiers, demo = false }) {
  const [decisions, setDecisions] = useState({})
  const [message, setMessage] = useState('')
  const supabase = createClient()

  async function decider(quartier, aime) {
    if (demo) {
      setDecisions((d) => ({ ...d, [quartier.id]: aime }))
      setMessage(
        aime
          ? `${quartier.nom} : match enregistré (+ Notacoins) — démo, rien n'est sauvegardé`
          : `${quartier.nom} : passé — démo, rien n'est sauvegardé`,
      )
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('notes')
      .insert({ quartier_id: quartier.id, aime, user_id: user.id })

    if (error && error.code !== '23505') {
      // 23505 = déjà noté (contrainte unique) : on ignore et on marque quand même comme noté.
      setMessage("Cette note n'a pas pu être enregistrée.")
      return
    }
    setDecisions((d) => ({ ...d, [quartier.id]: aime }))
    setMessage(aime ? `${quartier.nom} : match enregistré (+ Notacoins)` : `${quartier.nom} : passé`)
  }

  return (
    <div>
      {message && (
        <p className="mb-3 rounded-full border border-card-edge bg-card px-4 py-2 text-center text-sm text-text-soft">
          {message}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {quartiers.map((q) => (
          <div
            key={q.id}
            className="flex items-center justify-between rounded-2xl border border-card-edge bg-card p-4"
          >
            <div>
              <p className="font-semibold">{q.nom}</p>
              <p className="text-xs text-text-soft">{q.villeNom}</p>
            </div>
            {decisions[q.id] !== undefined ? (
              <span
                className="text-xs font-semibold"
                style={{ color: decisions[q.id] ? 'var(--mint-ink)' : 'var(--coral-ink)' }}
              >
                {decisions[q.id] ? 'Aimé' : 'Passé'}
              </span>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => decider(q, false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-card-edge hover:border-coral hover:text-coral-ink"
                  aria-label={`Je ne connais pas ${q.nom}`}
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => decider(q, true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-card-edge hover:border-mint hover:text-mint-ink"
                  aria-label={`J'aime ${q.nom}`}
                >
                  <Heart className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
