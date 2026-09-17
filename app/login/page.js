'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { activerModeDemo } from '@/lib/demo/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [loginDemo, setLoginDemo] = useState('')
  const [mdpDemo, setMdpDemo] = useState('')
  const [erreurDemo, setErreurDemo] = useState(null)
  const supabase = createClient()
  const router = useRouter()

  async function envoyerLien(e) {
    e.preventDefault()
    setEnCours(true)
    setErreur(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setEnCours(false)
    if (error) {
      setErreur("Le lien n'a pas pu être envoyé. Vérifie ton adresse et réessaie.")
      return
    }
    setEnvoye(true)
  }

  function seConnecterEnDemo(e) {
    e.preventDefault()
    setErreurDemo(null)
    if (loginDemo === 'Test1' && mdpDemo === '1234') {
      activerModeDemo()
      router.push('/decouvrir')
      router.refresh()
    } else {
      setErreurDemo('Identifiants incorrects.')
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-extrabold">Se connecter à Notaville</h1>
      <p className="mt-2 text-sm text-text-soft">
        Pas de mot de passe : on t'envoie un lien de connexion par e-mail.
      </p>

      {envoye ? (
        <div className="mt-8 rounded-2xl border border-card-edge bg-card p-5 text-sm">
          <p className="text-mint-ink">Lien envoyé à {email}.</p>
          <p className="mt-2 text-text-soft">
            Ouvre ta boîte mail et clique sur le lien pour continuer.
          </p>
        </div>
      ) : (
        <form onSubmit={envoyerLien} className="mt-8 flex flex-col gap-3">
          <input
            id="email"
            type="email"
            required
            placeholder="ton@email.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
          />
          {erreur && <p className="text-sm text-coral-ink">{erreur}</p>}
          <button type="submit" disabled={enCours} className="btn-primary justify-center">
            {enCours ? 'Envoi...' : 'Recevoir mon lien de connexion'}
          </button>
        </form>
      )}

      <div className="mt-10 border-t border-card-edge pt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
          Bêta interne — compte de test
        </p>
        <p className="mt-1 text-xs text-text-soft">
          Pour visiter l&apos;interface avec des données fictives, sans projet Supabase branché.
        </p>
        <form onSubmit={seConnecterEnDemo} className="mt-3 flex flex-col gap-2">
          <input
            value={loginDemo}
            onChange={(e) => setLoginDemo(e.target.value)}
            placeholder="Identifiant (Test1)"
            className="rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
          />
          <input
            type="password"
            value={mdpDemo}
            onChange={(e) => setMdpDemo(e.target.value)}
            placeholder="Mot de passe (1234)"
            className="rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
          />
          {erreurDemo && <p className="text-sm text-coral-ink">{erreurDemo}</p>}
          <button type="submit" className="rounded-full border border-card-edge py-2.5 text-sm font-semibold hover:border-amber">
            Entrer en mode démo
          </button>
        </form>
      </div>
    </div>
  )
}
