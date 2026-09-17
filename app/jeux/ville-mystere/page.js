'use client'

// "Ville mystère" -- façon Wordle/Motus : une ville à deviner par jour
// (même ville pour tout le monde, comme le veut le principe), 6
// essais, un indice différent à chaque tentative (région, département,
// population, distance + direction). Contrairement aux deux autres
// jeux, le tirage est déterministe (basé sur la date) et non aléatoire
// -- pas besoin de le reporter dans un effet, ça ne désynchronise
// jamais serveur et client.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, ArrowDown, Check, X } from 'lucide-react'
import { VILLES_JEU, distanceKm, directionVers } from '@/lib/demo/jeuxVilles'
import Icone from '@/components/Icone'

const MAX_ESSAIS = 6
const CLE_STOCKAGE = 'notaville_ville_mystere'

function dateDuJour() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Indice déterministe basé sur le nombre de jours écoulés depuis
// l'epoch -- la même ville pour tout le monde, le même jour, sans
// tirage aléatoire.
function villeDuJour() {
  const jours = Math.floor(Date.now() / 86400000)
  return VILLES_JEU[jours % VILLES_JEU.length]
}

function chargerProgression(codeCible) {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE)
    if (!brut) return null
    const donnees = JSON.parse(brut)
    // Une progression sauvegardée ne compte que pour le jour et la
    // ville du jour en cours -- sinon (nouveau jour), on repart de zéro.
    if (donnees.date !== dateDuJour() || donnees.codeCible !== codeCible) return null
    return donnees
  } catch {
    return null
  }
}

function sauvegarderProgression(donnees) {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(donnees))
  } catch {
    // localStorage indisponible -- la partie reste jouable, juste sans
    // reprise si la page est rechargée.
  }
}

const VILLES_TRIEES = [...VILLES_JEU].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

export default function VilleMysterePage() {
  const cible = villeDuJour() // déterministe : identique au premier rendu serveur et client
  const [essais, setEssais] = useState([]) // liste de code_insee devinés, dans l'ordre
  const [progressionChargee, setProgressionChargee] = useState(false)
  const [choix, setChoix] = useState('')

  useEffect(() => {
    Promise.resolve().then(() => {
      const sauvegarde = chargerProgression(cible.code_insee)
      setEssais(sauvegarde?.essais ?? [])
      setProgressionChargee(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const gagne = essais.includes(cible.code_insee)
  const termine = gagne || essais.length >= MAX_ESSAIS

  function deviner() {
    if (!choix || termine) return
    const ville = VILLES_JEU.find((v) => v.code_insee === choix)
    if (!ville || essais.includes(ville.code_insee)) return
    const suivant = [...essais, ville.code_insee]
    setEssais(suivant)
    sauvegarderProgression({ date: dateDuJour(), codeCible: cible.code_insee, essais: suivant })
    setChoix('')
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link href="/jeux" className="text-xs text-text-soft hover:text-text">← Espace jeux</Link>
      <h1 className="mt-2 text-2xl font-extrabold">Ville mystère</h1>
      <p className="mt-1 text-sm text-text-soft">
        Une ville à deviner par jour, {MAX_ESSAIS} essais, un indice à chaque tentative. Même ville pour tout le monde aujourd&apos;hui.
      </p>

      {!progressionChargee ? (
        <p className="mt-6 text-center text-sm text-text-soft">Chargement...</p>
      ) : (
        <>
          {!termine && (
            <div className="mt-5 flex gap-2">
              <select
                value={choix}
                onChange={(e) => setChoix(e.target.value)}
                className="flex-1 rounded-full border border-card-edge bg-card px-3 py-2 text-sm"
              >
                <option value="">Choisis une ville...</option>
                {VILLES_TRIEES.filter((v) => !essais.includes(v.code_insee)).map((v) => (
                  <option key={v.code_insee} value={v.code_insee}>{v.nom}</option>
                ))}
              </select>
              <button type="button" onClick={deviner} disabled={!choix} className="btn-primary text-sm disabled:opacity-50">
                Deviner
              </button>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {essais.map((code) => {
              const v = VILLES_JEU.find((ville) => ville.code_insee === code)
              const bonneReponse = code === cible.code_insee
              const memeRegion = v.region === cible.region
              const memeDepartement = v.departement === cible.departement
              const distance = Math.round(distanceKm(v.latitude, v.longitude, cible.latitude, cible.longitude))
              const direction = distance === 0 ? '' : directionVers(v.latitude, v.longitude, cible.latitude, cible.longitude)
              return (
                <div
                  key={code}
                  className={`rounded-2xl border p-3 text-sm ${bonneReponse ? 'border-mint bg-mint/10' : 'border-card-edge bg-card'}`}
                >
                  <p className="flex items-center justify-between font-semibold">
                    {v.nom}
                    {bonneReponse && <Icone nom="trophee" className="h-4 w-4 text-amber-ink" />}
                  </p>
                  {!bonneReponse && (
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-xs text-text-soft sm:grid-cols-4">
                      <span className={`flex items-center gap-1 rounded-full border px-2 py-1 ${memeRegion ? 'border-mint text-mint-ink' : 'border-card-edge'}`}>
                        {memeRegion ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Région
                      </span>
                      <span className={`flex items-center gap-1 rounded-full border px-2 py-1 ${memeDepartement ? 'border-mint text-mint-ink' : 'border-card-edge'}`}>
                        {memeDepartement ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Dépt.
                      </span>
                      <span className="flex items-center gap-1 rounded-full border border-card-edge px-2 py-1">
                        {v.population > cible.population ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />} Pop.
                      </span>
                      <span className="flex items-center gap-1 rounded-full border border-card-edge px-2 py-1">
                        {distance} km {direction}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {termine && (
            <div className="mt-4 text-center">
              <p className={`text-sm font-semibold ${gagne ? 'text-mint-ink' : 'text-coral-ink'}`}>
                {gagne ? `Bien joué, c'était ${cible.nom} !` : `Perdu, c'était ${cible.nom}. Reviens demain pour une nouvelle ville.`}
              </p>
              <p className="mt-1 text-xs text-text-soft">{essais.length} / {MAX_ESSAIS} essai{essais.length > 1 ? 's' : ''}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
