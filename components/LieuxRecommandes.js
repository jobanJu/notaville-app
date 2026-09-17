'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import BoutonSignaler from '@/components/BoutonSignaler'
import Icone from '@/components/Icone'
import { prixSymbole } from '@/lib/lieux'

const ICONE_TYPE = {
  restaurant: 'restaurant',
  bar: 'bar',
  cafe: 'cafe',
  monument: 'landmark',
  musee: 'musee',
  parc: 'parc',
  boutique: 'boutique',
  hotel: 'hotel',
  autre: 'lieu',
}

// Recommandations basées sur les quartiers déjà aimés sur la carte de
// /decouvrir (fonction SQL recommander_lieux), ou à défaut sur la ville
// d'origine. Noter un lieu ici le retire des prochaines recommandations
// (déjà géré côté fonction SQL, on le retire aussi localement pour un
// retour immédiat).
export default function LieuxRecommandes({ lieux, demo = false }) {
  const [restants, setRestants] = useState(lieux)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  async function noter(lieu, note) {
    if (demo) {
      setMessage(`${lieu.nom} noté ${note}/5 — démo, rien n'est sauvegardé`)
      setRestants((r) => r.filter((l) => l.id !== lieu.id))
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('avis_lieux')
      .upsert({ lieu_id: lieu.id, user_id: user.id, note }, { onConflict: 'lieu_id,user_id' })

    if (error) {
      setMessage("Cette note n'a pas pu être enregistrée.")
      return
    }
    setMessage(`${lieu.nom} noté ${note}/5. Merci !`)
    setRestants((r) => r.filter((l) => l.id !== lieu.id))
  }

  if (restants.length === 0) {
    return (
      <p className="text-center text-sm text-text-soft">
        {lieux.length === 0
          ? "Pas encore de lieu à recommander dans tes quartiers pour l'instant."
          : "Tu as noté toutes les recommandations du moment. Reviens plus tard !"}
      </p>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        {restants.map((lieu) => (
          <div key={lieu.id} className="rounded-2xl border border-card-edge bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 font-semibold">
                  <Icone nom={ICONE_TYPE[lieu.type] ?? 'lieu'} className="h-4 w-4 text-text-soft" />
                  {lieu.nom}
                  {prixSymbole(lieu.niveau_prix ?? lieu.niveauPrix) && (
                    <span className="font-mono text-xs font-bold text-amber-ink">
                      {prixSymbole(lieu.niveau_prix ?? lieu.niveauPrix)}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-text-soft">
                  {lieu.quartier_nom ?? lieu.quartierNom}
                  {(lieu.ville_nom ?? lieu.villeNom) ? ` · ${lieu.ville_nom ?? lieu.villeNom}` : ''}
                </p>
                {lieu.description && <p className="mt-1 text-sm text-text-soft">{lieu.description}</p>}
                {(lieu.nb_avis ?? lieu.nbAvis) > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-ink">
                    <Star className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
                    {lieu.note_moyenne ?? lieu.noteMoyenne}/5 ({lieu.nb_avis ?? lieu.nbAvis} avis)
                  </p>
                )}
                <div className="mt-1.5">
                  <BoutonSignaler cibleType="lieu" cibleId={lieu.id} demo={demo} />
                </div>
              </div>
              <div className="flex shrink-0 gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => noter(lieu, n)}
                    className="text-text-soft hover:text-amber-ink"
                    aria-label={`Noter ${lieu.nom} ${n}/5`}
                  >
                    <Star className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {message && <p className="mt-4 text-center text-sm text-text-soft">{message}</p>}
    </div>
  )
}
