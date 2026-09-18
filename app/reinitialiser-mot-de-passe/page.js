'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Atteinte uniquement via le lien reçu par e-mail (mot de passe oublié) :
// /auth/callback échange le code puis redirige ici avec une session
// "recovery" déjà active -- il suffit d'appeler updateUser({ password }).
export default function ReinitialiserMotDePassePage() {
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [afficherMdp, setAfficherMdp] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [reussi, setReussi] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  async function valider(e) {
    e.preventDefault()
    setErreur(null)

    if (motDePasse.length < 6) {
      setErreur('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }

    setEnCours(true)
    const { error } = await supabase.auth.updateUser({ password: motDePasse })
    setEnCours(false)

    if (error) {
      setErreur(
        "La mise à jour a échoué. Le lien a peut-être expiré -- redemande un lien depuis la page de connexion."
      )
      return
    }

    setReussi(true)
    setTimeout(() => {
      router.push('/decouvrir')
      router.refresh()
    }, 1500)
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-extrabold">Nouveau mot de passe</h1>
      <p className="mt-2 text-sm text-text-soft">Choisis un nouveau mot de passe pour ton compte.</p>

      {reussi ? (
        <div className="mt-8 rounded-2xl border border-card-edge bg-card p-5 text-sm text-mint-ink">
          Mot de passe mis à jour. Redirection...
        </div>
      ) : (
        <form onSubmit={valider} className="mt-8 flex flex-col gap-3">
          <div className="relative">
            <input
              type={afficherMdp ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Nouveau mot de passe (6 caractères minimum)"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-3 pr-16 text-sm outline-none focus:border-amber"
            />
            <button
              type="button"
              onClick={() => setAfficherMdp((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-soft hover:text-text"
            >
              {afficherMdp ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          <input
            type={afficherMdp ? 'text' : 'password'}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Confirme le mot de passe"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
          />
          {erreur && <p className="text-sm text-coral-ink">{erreur}</p>}
          <button type="submit" disabled={enCours} className="btn-primary justify-center">
            {enCours ? 'Mise à jour...' : 'Valider'}
          </button>
        </form>
      )}
    </div>
  )
}
