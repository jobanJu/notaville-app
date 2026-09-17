'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import { chargerVillesFr } from '@/lib/demo/villesFr'

// Champ de recherche de ville avec suggestions en direct (parmi les
// 34 969 communes de France). Appelle onSelect({ code_insee, nom, departement })
// quand une ville est choisie.
export default function CitySearch({ onSelect, placeholder = 'Chercher une ville...', valeurInitiale = null }) {
  const [terme, setTerme] = useState(valeurInitiale?.nom ?? '')
  const [resultats, setResultats] = useState([])
  const [choisie, setChoisie] = useState(valeurInitiale ?? null)
  const supabase = createClient()

  useEffect(() => {
    if (choisie || terme.trim().length < 2) {
      setResultats([])
      return
    }

    const minuteur = setTimeout(async () => {
      if (isDemoModeClient()) {
        const villes = await chargerVillesFr()
        const filtre = villes
          .filter((v) => v.nom.toLowerCase().startsWith(terme.toLowerCase()))
          .sort((a, b) => b.population - a.population)
          .slice(0, 8)
        setResultats(filtre)
        return
      }
      const { data } = await supabase
        .from('villes')
        .select('code_insee, nom, departement, population')
        .ilike('nom', `${terme}%`)
        .order('population', { ascending: false })
        .limit(8)
      setResultats(data ?? [])
    }, 250)

    return () => clearTimeout(minuteur)
  }, [terme, choisie])

  function choisir(ville) {
    setChoisie(ville)
    setTerme(ville.nom)
    setResultats([])
    onSelect(ville)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={terme}
        placeholder={placeholder}
        onChange={(e) => {
          setChoisie(null)
          setTerme(e.target.value)
        }}
        className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
      />
      {resultats.length > 0 && (
        <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-card-edge bg-card shadow-xl">
          {resultats.map((v) => (
            <li key={v.code_insee}>
              <button
                type="button"
                onClick={() => choisir(v)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-bg-soft"
              >
                <span>{v.nom}</span>
                <span className="text-xs text-text-soft">{v.departement}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
