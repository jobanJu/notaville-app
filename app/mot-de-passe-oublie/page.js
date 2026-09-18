'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(false)

  const supabase = createClient()

  async function envoyerLien(e) {
    e.preventDefault()
    setEnCours(true)
    setErreur(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reinitialiser-mot-de-passe`,
    })

    setEnCours(false)
    if (error) {
      setErreur("Le lien n'a pas pu être envoyé. Vérifie ton adresse et réessaie.")
      return
    }
    setEnvoye(true)
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-extrabold">Mot de passe oublié</h1>
      <p className="mt-2 text-sm text-text-soft">
        On t&apos;envoie un lien par e-mail pour en choisir un nouveau.
      </p>

      {envoye ? (
        <div className="mt-8 rounded-2xl border border-card-edge bg-card p-5 text-sm">
          <p className="text-mint-ink">Lien envoyé à {email}.</p>
          <p className="mt-2 text-text-soft">
            Ouvre ta boîte mail et clique sur le lien pour choisir un nouveau mot de passe.
          </p>
        </div>
      ) : (
        <form onSubmit={envoyerLien} className="mt-8 flex flex-col gap-3">
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            placeholder="ton@email.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
          />
          {erreur && <p className="text-sm text-coral-ink">{erreur}</p>}
          <button type="submit" disabled={enCours} className="btn-primary justify-center">
            {enCours ? 'Envoi...' : 'Recevoir le lien'}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-text-soft">
        <Link href="/login" className="font-semibold text-amber-ink hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
