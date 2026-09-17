'use client'

import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { rechercherAdresses } from '@/lib/adresse'

// Champ de recherche d'adresse avec suggestions (API Adresse du
// gouvernement, voir lib/adresse.js). Appelle onSelect({ lat, lon, label })
// quand une adresse est choisie -- même contrat que CitySearch.js pour
// les villes.
export default function AdresseSearch({ onSelect, placeholder = 'Tape une adresse ou une ville...' }) {
  const [terme, setTerme] = useState('')
  const [resultats, setResultats] = useState([])
  const [chargement, setChargement] = useState(false)
  const [choisie, setChoisie] = useState(false)

  useEffect(() => {
    if (choisie || terme.trim().length < 3) {
      setResultats([])
      return
    }
    setChargement(true)
    const minuteur = setTimeout(async () => {
      const trouves = await rechercherAdresses(terme, 5)
      setResultats(trouves)
      setChargement(false)
    }, 300)
    return () => clearTimeout(minuteur)
  }, [terme, choisie])

  function choisir(adresse) {
    setChoisie(true)
    setTerme(adresse.label)
    setResultats([])
    onSelect(adresse)
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" strokeWidth={1.75} />
        <input
          type="text"
          value={terme}
          placeholder={placeholder}
          onChange={(e) => {
            setChoisie(false)
            setTerme(e.target.value)
          }}
          className="w-full rounded-full border border-card-edge bg-bg-soft py-3 pl-10 pr-4 text-sm outline-none focus:border-amber"
        />
      </div>
      {chargement && <p className="mt-1 px-2 text-xs text-text-soft">Recherche d&apos;adresse...</p>}
      {resultats.length > 0 && (
        <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-card-edge bg-card shadow-xl">
          {resultats.map((a) => (
            <li key={`${a.lat}-${a.lon}`}>
              <button
                type="button"
                onClick={() => choisir(a)}
                className="flex w-full flex-col px-4 py-2.5 text-left text-sm hover:bg-bg-soft"
              >
                <span>{a.label}</span>
                <span className="text-xs text-text-soft">{a.contexte}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
