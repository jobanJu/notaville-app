'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import { useMaPosition } from '@/lib/geoloc'
import { inverserAdresse } from '@/lib/adresse'
import Icone from '@/components/Icone'

const CLE_CONSENTEMENT = 'notaville_villes_consentement' // 'accepte' | 'refuse'

// Historique "façon Google Maps" des villes visitées (voir /mes-villes) :
// contrairement au reste du site, ici la position sert à ENREGISTRER
// quelque chose (le code INSEE de la ville, jamais la position GPS
// exacte) -- un vrai changement par rapport à la géolocalisation
// purement locale utilisée ailleurs (lib/geoloc.js). D'où ce composant
// séparé et un consentement explicite, demandé une seule fois, avant la
// toute première capture. Une fois accepté, la capture est automatique
// et silencieuse à chaque ouverture de l'appli -- pas de bouton à
// recliquer (choix explicite de l'utilisateur), juste la demande
// d'autorisation GPS habituelle du navigateur.
export default function VillesVisiteesTracker({ demo }) {
  const [consentement, setConsentement] = useState(null) // null tant qu'on n'a pas lu le localStorage
  const { position, demander } = useMaPosition()

  useEffect(() => {
    if (demo || isDemoModeClient()) return
    try {
      setConsentement(localStorage.getItem(CLE_CONSENTEMENT))
    } catch {
      setConsentement('refuse')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (consentement === 'accepte') demander()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentement])

  useEffect(() => {
    if (consentement !== 'accepte' || !position) return

    let annule = false
    async function enregistrer() {
      const trouvee = await inverserAdresse(position.lat, position.lon)
      if (annule || !trouvee?.codeInsee) return
      try {
        const supabase = createClient()
        await supabase.rpc('enregistrer_visite', {
          p_code_insee: trouvee.codeInsee,
          p_ville_nom: trouvee.ville ?? null,
        })
      } catch {
        // Silencieux : un souci réseau ici ne doit jamais gêner la
        // navigation normale sur le site.
      }
    }
    enregistrer()
    return () => {
      annule = true
    }
  }, [consentement, position])

  function repondre(accepte) {
    try {
      localStorage.setItem(CLE_CONSENTEMENT, accepte ? 'accepte' : 'refuse')
    } catch {
      // Stockage indisponible (navigation privée...) -- on redemandera
      // à la prochaine ouverture, sans bloquer l'utilisateur pour autant.
    }
    setConsentement(accepte ? 'accepte' : 'refuse')
  }

  if (demo || consentement !== null) return null

  return (
    <div className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-sm rounded-2xl border border-card-edge bg-card p-4 shadow-lg sm:bottom-6">
      <div className="flex items-start gap-3">
        <Icone nom="valise" className="mt-0.5 h-5 w-5 shrink-0 text-mint-ink" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Garder un historique de tes villes visitées ?</p>
          <p className="mt-1 text-xs text-text-soft">
            Notaville peut repérer automatiquement, à chaque ouverture, la ville où tu te trouves (juste son nom,
            jamais ta position exacte) pour construire ton historique sur /mes-villes et te noter tes découvertes.
            + Notacoins à chaque nouvelle ville.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => repondre(true)}
              className="rounded-full bg-mint px-3 py-1.5 text-xs font-semibold text-[#03251C]"
            >
              Activer
            </button>
            <button
              onClick={() => repondre(false)}
              className="rounded-full border border-card-edge px-3 py-1.5 text-xs text-text-soft"
            >
              Non merci
            </button>
          </div>
        </div>
        <button onClick={() => repondre(false)} aria-label="Fermer" className="shrink-0 text-text-soft">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
