'use client'

// "Chasse aux lieux" -- inspiré de Pokémon Go : ta position live
// (lib/geoloc.js, jamais stockée ni envoyée ailleurs que pour ce
// calcul) montre les lieux contribués par la communauté autour de toi,
// et tu ne peux "attraper" un lieu que si tu es vraiment à proximité
// (300 m). Réutilise la même donnée que /recherche et LieuxRecommandes
// (lieux + avis_lieux), juste une autre façon de les découvrir.
//
// La collection est stockée dans ce navigateur (localStorage), pas sur
// le compte -- assumé et affiché honnêtement, pour ne pas laisser
// croire à une progression synchronisée entre appareils.
import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import { demoLieux } from '@/lib/demo/data'
import { distanceKm, useMaPosition } from '@/lib/geoloc'
import { iconeTypeLieu, labelTypeLieu } from '@/lib/lieux'
import Icone from '@/components/Icone'
import Link from 'next/link'
import PubGate from '@/components/PubGate'

const RAYON_RECHERCHE_KM = 5
const RAYON_CAPTURE_KM = 0.3
const CLE_COLLECTION = 'notaville_chasse_collection'

function chargerCollection() {
  try {
    const brut = window.localStorage.getItem(CLE_COLLECTION)
    return brut ? new Set(JSON.parse(brut)) : new Set()
  } catch {
    return new Set()
  }
}

function sauvegarderCollection(set) {
  try {
    window.localStorage.setItem(CLE_COLLECTION, JSON.stringify([...set]))
  } catch {
    // localStorage indisponible (navigation privée, quota...) -- la
    // partie reste jouable, juste sans mémoire d'une visite à l'autre.
  }
}

export default function ChassePage() {
  const { statut, position, erreur, demander } = useMaPosition()
  const [lieux, setLieux] = useState([])
  const [chargement, setChargement] = useState(false)
  const [collection, setCollection] = useState(() => new Set())
  const [collectionChargee, setCollectionChargee] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Lecture localStorage différée en effet (jamais au premier rendu
    // serveur) -- même précaution que le reste du site pour éviter une
    // désynchronisation serveur/client.
    Promise.resolve().then(() => {
      setCollection(chargerCollection())
      setCollectionChargee(true)
    })
  }, [])

  useEffect(() => {
    if (!position) return
    let annule = false

    async function charger() {
      setChargement(true)
      if (isDemoModeClient()) {
        const proches = demoLieux
          .map((l) => ({
            ...l,
            distance: l.latitude != null && l.longitude != null ? distanceKm(position.lat, position.lon, l.latitude, l.longitude) : null,
          }))
          .filter((l) => l.distance != null && l.distance <= RAYON_RECHERCHE_KM)
          .sort((a, b) => a.distance - b.distance)
        if (!annule) {
          setLieux(proches)
          setChargement(false)
        }
        return
      }
      const { data } = await supabase.rpc('lieux_proches', {
        p_lat: position.lat,
        p_lon: position.lon,
        p_rayon_km: RAYON_RECHERCHE_KM,
        p_limite: 30,
      })
      if (!annule) {
        setLieux(data ?? [])
        setChargement(false)
      }
    }

    charger()
    return () => {
      annule = true
    }
  }, [position])

  function attraper(lieu) {
    setCollection((c) => {
      const suivant = new Set(c)
      suivant.add(lieu.id)
      sauvegarderCollection(suivant)
      return suivant
    })
  }

  return (
    <PubGate>
    <div className="mx-auto max-w-md px-4 py-10">
      <Link href="/jeux" className="text-xs text-text-soft hover:text-text">← Espace jeux</Link>
      <h1 className="mt-2 text-2xl font-extrabold">Chasse aux lieux</h1>
      <p className="mt-1 text-sm text-text-soft">
        Approche-toi à moins de 300 m d&apos;un lieu contribué par la communauté pour l&apos;attraper.
      </p>

      <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-amber-ink">
        <Icone nom="trophee" className="h-4 w-4" />
        {collectionChargee ? collection.size : '...'} lieu{collection.size > 1 ? 'x' : ''} attrapé{collection.size > 1 ? 's' : ''}
      </p>
      <p className="text-[11px] text-text-soft">Ta collection reste sur cet appareil, elle n&apos;est pas encore liée à ton compte.</p>

      {statut !== 'trouve' && (
        <button
          onClick={demander}
          disabled={statut === 'chargement'}
          className="btn-primary mt-4 w-full justify-center disabled:opacity-60"
        >
          {statut === 'chargement' ? 'Repérage...' : 'Commencer la chasse'}
        </button>
      )}
      {statut === 'erreur' && <p className="mt-2 text-center text-xs text-coral-ink">{erreur}</p>}

      {statut === 'trouve' && (
        <>
          <button onClick={demander} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-card-edge px-3 py-2 text-xs text-text-soft hover:border-amber">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
            Actualiser ma position
          </button>

          <div className="mt-4 flex flex-col gap-2">
            {chargement && <p className="py-6 text-center text-sm text-text-soft">Recherche des lieux autour de toi...</p>}

            {!chargement && lieux.length === 0 && (
              <p className="py-6 text-center text-sm text-text-soft">
                Aucun lieu contribué à moins de {RAYON_RECHERCHE_KM} km pour l&apos;instant. Explore une autre zone, ou
                ajoute le premier lieu du coin via un défi !
              </p>
            )}

            {!chargement &&
              lieux.map((l) => {
                const attrape = collection.has(l.id)
                const aPortee = l.distance <= RAYON_CAPTURE_KM
                return (
                  <div key={l.id} className={`rounded-2xl border p-4 ${attrape ? 'border-mint/40 bg-mint/5' : 'border-card-edge bg-card'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold">
                          <Icone nom={iconeTypeLieu(l.type)} className="h-4 w-4 text-text-soft" />
                          {l.nom}
                        </p>
                        <p className="mt-0.5 text-xs text-text-soft">
                          {labelTypeLieu(l.type)} · {l.distance < 1 ? `${Math.round(l.distance * 1000)} m` : `${l.distance.toFixed(1)} km`}
                        </p>
                      </div>
                      {attrape ? (
                        <span className="shrink-0 rounded-full border border-mint px-3 py-1.5 text-xs font-semibold text-mint-ink">
                          Attrapé
                        </span>
                      ) : aPortee ? (
                        <button
                          onClick={() => attraper(l)}
                          className="shrink-0 rounded-full bg-gradient-to-r from-coral to-amber px-3 py-1.5 text-xs font-bold text-[#2A0F0F]"
                        >
                          Attraper !
                        </button>
                      ) : (
                        <span className="shrink-0 rounded-full border border-card-edge px-3 py-1.5 text-xs text-text-soft">
                          Hors de portée
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </>
      )}
    </div>
    </PubGate>
  )
}
