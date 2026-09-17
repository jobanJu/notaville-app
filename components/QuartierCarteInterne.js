'use client'

import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { X, Heart } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'

const COULEUR_AIME = '#14CDA0' // --mint
const COULEUR_PASSE = '#FF5A56' // --coral
const COULEUR_NEUTRE = '#FFA726' // --amber

// Remplace l'ancien SwipeDeck (façon Tinder) : une carte interactive sur
// laquelle on clique les quartiers pour les noter, plutôt qu'un empilement
// de cartes à faire glisser. Les quartiers sans coordonnées connues
// (cf. supabase/10_quartiers_coordonnees.sql) sont listés sous la carte.
export default function QuartierCarteInterne({ quartiers, demo = false }) {
  const [decisions, setDecisions] = useState({})
  const [selected, setSelected] = useState(null)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const avecCoordonnees = useMemo(
    () => quartiers.filter((q) => q.latitude != null && q.longitude != null),
    [quartiers],
  )
  const sansCoordonnees = useMemo(
    () => quartiers.filter((q) => q.latitude == null || q.longitude == null),
    [quartiers],
  )

  const centre = useMemo(() => {
    if (avecCoordonnees.length === 0) return [46.6, 2.5]
    const lat = avecCoordonnees.reduce((s, q) => s + q.latitude, 0) / avecCoordonnees.length
    const lng = avecCoordonnees.reduce((s, q) => s + q.longitude, 0) / avecCoordonnees.length
    return [lat, lng]
  }, [avecCoordonnees])
  const zoom = avecCoordonnees.length > 0 ? 13 : 5

  async function enregistrer(quartier, aime) {
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

  function decider(quartier, aime) {
    enregistrer(quartier, aime)
    setSelected(null)
  }

  function couleur(id) {
    if (decisions[id] === true) return COULEUR_AIME
    if (decisions[id] === false) return COULEUR_PASSE
    return COULEUR_NEUTRE
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-4 text-xs text-text-soft">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COULEUR_NEUTRE }} /> à noter
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COULEUR_AIME }} /> aimé
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COULEUR_PASSE }} /> passé
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-3xl border border-card-edge">
        {avecCoordonnees.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center bg-card px-6 text-center text-sm text-text-soft">
            Pas encore de quartiers positionnés sur la carte pour ta ville — retrouve-les dans la liste ci-dessous.
          </div>
        ) : (
          <MapContainer center={centre} zoom={zoom} scrollWheelZoom={false} style={{ height: '380px', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {avecCoordonnees.map((q) => (
              <CircleMarker
                key={q.id}
                center={[q.latitude, q.longitude]}
                radius={14}
                pathOptions={{ color: couleur(q.id), fillColor: couleur(q.id), fillOpacity: 0.85, weight: 2 }}
                eventHandlers={{ click: () => setSelected(q) }}
              >
                <Tooltip direction="top" offset={[0, -10]}>{q.nom}</Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      {selected && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-card-edge bg-card p-4">
          <div>
            <p className="font-display font-bold">{selected.nom}</p>
            <p className="text-xs text-text-soft">{selected.villeNom}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => decider(selected, false)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-card-edge hover:border-coral hover:text-coral-ink"
              aria-label="Je ne connais pas ce quartier"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => decider(selected, true)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-card-edge hover:border-mint hover:text-mint-ink"
              aria-label="J'aime ce quartier"
            >
              <Heart className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-4 text-center text-sm text-text-soft">{message}</p>}

      {sansCoordonnees.length > 0 && (
        <div className="mt-8">
          <p className="font-display text-sm font-bold text-text-soft">Autres quartiers à découvrir</p>
          <div className="mt-3 flex flex-col gap-2">
            {sansCoordonnees.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded-2xl border border-card-edge bg-card p-4"
              >
                <div>
                  <p className="font-semibold">{q.nom}</p>
                  <p className="text-xs text-text-soft">{q.villeNom}</p>
                </div>
                {decisions[q.id] !== undefined ? (
                  <span className="text-xs" style={{ color: couleur(q.id) }}>
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
      )}
    </div>
  )
}
