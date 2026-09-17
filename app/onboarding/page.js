'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CitySearch from '@/components/CitySearch'
import { isDemoModeClient } from '@/lib/demo/client'

export default function OnboardingPage() {
  const [ville, setVille] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  // En mode démo le profil de test a déjà une ville d'origine : cette
  // page n'a pas lieu d'être.
  useEffect(() => {
    if (isDemoModeClient()) router.replace('/decouvrir')
  }, [])

  async function valider() {
    if (!ville) return
    setEnCours(true)
    setErreur(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('profiles')
      .update({ ville_origine_code: ville.code_insee })
      .eq('id', user.id)

    setEnCours(false)
    if (error) {
      setErreur("Impossible d'enregistrer ta ville, réessaie.")
      return
    }
    router.push('/decouvrir')
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-extrabold">Quelle est ta ville ?</h1>
      <p className="mt-2 text-sm text-text-soft">
        Ta ville d&apos;origine : celle que tu notes au quotidien. Tu pourras
        aussi noter n&apos;importe quelle autre ville visitée plus tard.
      </p>

      <div className="mt-8">
        <CitySearch onSelect={setVille} placeholder="Tourcoing, Lille, Marseille..." />
      </div>

      {erreur && <p className="mt-3 text-sm text-coral-ink">{erreur}</p>}

      <button
        onClick={valider}
        disabled={!ville || enCours}
        className="btn-primary mt-6 w-full justify-center"
      >
        {enCours ? 'Enregistrement...' : `Continuer${ville ? ` avec ${ville.nom}` : ''}`}
      </button>
    </div>
  )
}
