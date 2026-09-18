'use client'

// Onglet Évènements : calendrier mensuel des évènements d'une ville
// (voir components/CalendrierEvenements.js). Publique, sans compte
// requis (section 14), comme /reductions. Ville par défaut : celle
// passée en `?ville=` (lien "Voir le calendrier complet" depuis la
// fiche ville), sinon la ville d'origine du compte connecté, sinon un
// champ de recherche vide.
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import CitySearch from '@/components/CitySearch'
import CalendrierEvenements from '@/components/CalendrierEvenements'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import { chargerVillesFr } from '@/lib/demo/villesFr'
import { demoProfil } from '@/lib/demo/data'

function EvenementsContenu() {
  const searchParams = useSearchParams()
  const [ville, setVille] = useState(null)
  const [chargement, setChargement] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let annule = false

    async function initialiser() {
      const codeParam = searchParams.get('ville')

      if (isDemoModeClient()) {
        if (codeParam) {
          const villes = await chargerVillesFr()
          const v = villes.find((x) => x.code_insee === codeParam)
          if (!annule && v) setVille(v)
        } else if (demoProfil?.ville_origine_code) {
          const villes = await chargerVillesFr()
          const v = villes.find((x) => x.code_insee === demoProfil.ville_origine_code)
          if (!annule && v) setVille(v)
        }
        if (!annule) setChargement(false)
        return
      }

      if (codeParam) {
        const { data } = await supabase.from('villes').select('code_insee, nom, departement').eq('code_insee', codeParam).single()
        if (!annule && data) setVille(data)
        if (!annule) setChargement(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profil } = await supabase.from('profiles').select('ville_origine_code').eq('id', user.id).single()
        if (profil?.ville_origine_code) {
          const { data } = await supabase
            .from('villes')
            .select('code_insee, nom, departement')
            .eq('code_insee', profil.ville_origine_code)
            .single()
          if (!annule && data) setVille(data)
        }
      }
      if (!annule) setChargement(false)
    }

    initialiser()
    return () => {
      annule = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold">Évènements</h1>
      <p className="mt-1 text-sm text-text-soft">
        Concerts, marchés, festivals... le calendrier des évènements d&apos;une ville.
      </p>

      <div className="mt-6">
        <CitySearch onSelect={setVille} valeurInitiale={ville} />
      </div>

      {chargement ? (
        <p className="mt-6 text-center text-sm text-text-soft">Chargement...</p>
      ) : ville ? (
        <div className="mt-6">
          <CalendrierEvenements codeInsee={ville.code_insee} nomVille={ville.nom} />
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-text-soft">
          Choisis une ville pour voir ses évènements à venir.
        </p>
      )}
    </div>
  )
}

export default function EvenementsPage() {
  return (
    <Suspense fallback={null}>
      <EvenementsContenu />
    </Suspense>
  )
}
