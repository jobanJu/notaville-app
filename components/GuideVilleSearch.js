'use client'

// Petit pont client : CitySearch appelle onSelect avec une ville, ici on
// redirige simplement vers son guide pratique. Composant à part plutôt
// que de rendre toute /app/guides/page.js côté client, pour garder le
// reste de la page (contenu fixe) en composant serveur.
import { useRouter } from 'next/navigation'
import CitySearch from '@/components/CitySearch'

export default function GuideVilleSearch() {
  const router = useRouter()

  return (
    <CitySearch
      placeholder="Chercher une ville (ex : Lille, Douai...)"
      onSelect={(ville) => router.push(`/guides/ville/${ville.code_insee}`)}
    />
  )
}
