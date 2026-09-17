'use client'

// Même pont que GuideVilleSearch.js : CitySearch appelle onSelect, on
// redirige vers la fiche ville publique (accessible sans compte).
import { useRouter } from 'next/navigation'
import CitySearch from '@/components/CitySearch'

export default function HomeCitySearch() {
  const router = useRouter()

  return (
    <CitySearch
      placeholder="Rechercher une ville, un quartier..."
      onSelect={(ville) => router.push(`/villes/${ville.code_insee}`)}
    />
  )
}
