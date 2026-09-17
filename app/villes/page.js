'use client'

// Page publique : consultable sans compte, comme l'exige le cahier des
// charges (les pages villes/statistiques restent gratuites et libres
// d'accès, défis ou pas).
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import { chargerVillesFr } from '@/lib/demo/villesFr'
import ImageVille from '@/components/ImageVille'
import Icone from '@/components/Icone'
import { COORDS_VILLES_POPULAIRES, distanceKm } from '@/lib/villesCoords'

// Une vingtaine de grandes villes (+ Tourcoing et Perpignan, pour des
// raisons qui nous sont propres) affichées sous forme de bulles sous la
// barre de recherche, tant qu'aucune recherche n'est en cours -- pour
// que la page ait quelque chose à montrer dès l'arrivée, plutôt qu'un
// champ vide face à 34 969 communes.
const VILLES_POPULAIRES = [
  { code_insee: '75056', nom: 'Paris' },
  { code_insee: '13055', nom: 'Marseille' },
  { code_insee: '69123', nom: 'Lyon' },
  { code_insee: '31555', nom: 'Toulouse' },
  { code_insee: '06088', nom: 'Nice' },
  { code_insee: '44109', nom: 'Nantes' },
  { code_insee: '34172', nom: 'Montpellier' },
  { code_insee: '67482', nom: 'Strasbourg' },
  { code_insee: '33063', nom: 'Bordeaux' },
  { code_insee: '59350', nom: 'Lille' },
  { code_insee: '35238', nom: 'Rennes' },
  { code_insee: '51454', nom: 'Reims' },
  { code_insee: '42218', nom: 'Saint-Étienne' },
  { code_insee: '83137', nom: 'Toulon' },
  { code_insee: '38185', nom: 'Grenoble' },
  { code_insee: '21231', nom: 'Dijon' },
  { code_insee: '49007', nom: 'Angers' },
  { code_insee: '30189', nom: 'Nîmes' },
  { code_insee: '59599', nom: 'Tourcoing' },
  { code_insee: '66136', nom: 'Perpignan' },
]

// État de la géolocalisation : idle (rien demandé), chargement,
// trouve (avec la liste triée par distance), ou une erreur (refus,
// indisponible, navigateur trop ancien).
export default function VillesPage() {
  const [terme, setTerme] = useState('')
  const [resultats, setResultats] = useState([])
  const [pres, setPres] = useState({ statut: 'idle', villes: [], erreur: null })
  const supabase = createClient()

  function chercherPresDeMoi() {
    if (!('geolocation' in navigator)) {
      setPres({ statut: 'erreur', villes: [], erreur: "La géolocalisation n'est pas disponible sur cet appareil." })
      return
    }
    setPres({ statut: 'chargement', villes: [], erreur: null })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const villes = VILLES_POPULAIRES.map((v) => {
          const coords = COORDS_VILLES_POPULAIRES[v.code_insee]
          return { ...v, distance: coords ? distanceKm(latitude, longitude, coords.lat, coords.lon) : null }
        })
          .filter((v) => v.distance !== null)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 6)
        setPres({ statut: 'trouve', villes, erreur: null })
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Position refusée. Tu peux l'autoriser dans les réglages de ton navigateur."
            : "Impossible de récupérer ta position pour le moment."
        setPres({ statut: 'erreur', villes: [], erreur: message })
      },
      { timeout: 10000 }
    )
  }

  async function chercher(e) {
    const valeur = e.target.value
    setTerme(valeur)
    if (valeur.trim().length < 2) {
      setResultats([])
      return
    }
    if (isDemoModeClient()) {
      const villes = await chargerVillesFr()
      setResultats(
        villes
          .filter((v) => v.nom.toLowerCase().startsWith(valeur.toLowerCase()))
          .sort((a, b) => b.population - a.population)
          .slice(0, 15)
      )
      return
    }
    const { data } = await supabase.rpc('rechercher_villes', { p_terme: valeur, p_limite: 15 })
    setResultats(data ?? [])
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold">Villes</h1>
      <p className="mt-1 text-sm text-text-soft">
        Statistiques, notes des habitants et des voyageurs — consultable sans compte.
      </p>

      <input
        value={terme}
        onChange={chercher}
        placeholder="Chercher une ville..."
        className="mt-6 w-full rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
      />

      {resultats.length === 0 && terme.trim().length < 2 && (
        <div className="mt-4">
          {pres.statut === 'idle' && (
            <button
              onClick={chercherPresDeMoi}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-card-edge px-4 py-2.5 text-sm hover:border-amber"
            >
              <Icone nom="lieu" className="h-4 w-4" />
              Villes près de moi
            </button>
          )}
          {pres.statut === 'chargement' && (
            <p className="text-center text-sm text-text-soft">Repérage de ta position...</p>
          )}
          {pres.statut === 'erreur' && (
            <p className="text-center text-sm text-coral-ink">{pres.erreur}</p>
          )}
          {pres.statut === 'trouve' && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
                Près de toi
              </p>
              <p className="mt-1 text-[11px] text-text-soft">
                Limité pour l&apos;instant aux grandes villes déjà référencées sur cette page.
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {pres.villes.map((v) => (
                  <li key={v.code_insee}>
                    <Link
                      href={`/villes/${v.code_insee}`}
                      className="flex items-center gap-3 rounded-2xl border border-card-edge bg-card p-3 hover:border-amber"
                    >
                      <ImageVille nom={v.nom} className="h-12 w-12 flex-shrink-0 rounded-xl" />
                      <span className="flex-1 font-semibold">{v.nom}</span>
                      <span className="text-xs text-text-soft">{Math.round(v.distance)} km</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {resultats.length === 0 && terme.trim().length < 2 && pres.statut !== 'trouve' && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">Villes populaires</p>
          <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4">
            {VILLES_POPULAIRES.map((v) => (
              <Link
                key={v.code_insee}
                href={`/villes/${v.code_insee}`}
                className="flex flex-col items-center gap-1.5 text-center hover:opacity-80"
              >
                <ImageVille nom={v.nom} className="h-16 w-16 rounded-full ring-1 ring-card-edge" />
                <span className="text-xs font-medium leading-tight">{v.nom}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {resultats.map((v) => (
          <li key={v.code_insee}>
            <Link
              href={`/villes/${v.code_insee}`}
              className="flex items-center gap-3 rounded-2xl border border-card-edge bg-card p-3 hover:border-amber"
            >
              <ImageVille nom={v.nom} departement={v.departement} className="h-12 w-12 flex-shrink-0 rounded-xl" />
              <div className="flex-1">
                <p className="font-semibold">{v.nom}</p>
                <p className="text-xs text-text-soft">{v.departement} · {v.region}</p>
              </div>
              <span className="text-text-soft">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
