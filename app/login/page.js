'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { activerModeDemo } from '@/lib/demo/client'

// Détecte si l'identifiant saisi ressemble à un e-mail ou à un numéro
// de téléphone, pour appeler signInWithPassword avec le bon champ.
function estEmail(identifiant) {
  return identifiant.includes('@')
}

// Normalise un numéro français saisi en 0X XX XX XX XX vers le format
// E.164 (+33...) attendu par Supabase Auth ; laisse tel quel si déjà
// au format international.
function normaliserTelephone(saisie) {
  const nettoye = saisie.replace(/[\s.\-()]/g, '')
  if (nettoye.startsWith('+')) return nettoye
  if (nettoye.startsWith('0')) return `+33${nettoye.slice(1)}`
  return nettoye
}

export default function LoginPage() {
  const [identifiant, setIdentifiant] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(false)

  const [loginDemo, setLoginDemo] = useState('')
  const [mdpDemo, setMdpDemo] = useState('')
  const [erreurDemo, setErreurDemo] = useState(null)

  const supabase = createClient()
  const router = useRouter()

  async function seConnecter(e) {
    e.preventDefault()
    setEnCours(true)
    setErreur(null)

    const saisie = identifiant.trim()
    const champ = estEmail(saisie)
      ? { email: saisie.toLowerCase() }
      : { phone: normaliserTelephone(saisie) }

    const { error } = await supabase.auth.signInWithPassword({
      ...champ,
      password: motDePasse,
    })

    setEnCours(false)
    if (error) {
      setErreur('Identifiant ou mot de passe incorrect.')
      return
    }
    router.push('/decouvrir')
    router.refresh()
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
        Avec ton e-mail ou ton numéro de téléphone, et ton mot de passe.
      </p>

      <form onSubmit={seConnecter} className="mt-8 flex flex-col gap-3">
        <input
          id="identifiant"
          type="text"
          required
          autoComplete="username"
          placeholder="ton@email.fr ou 06 12 34 56 78"
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
          className="rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
        />
        <input
          id="mot-de-passe"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className="rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
        />
        {erreur && <p className="text-sm text-coral-ink">{erreur}</p>}
        <button type="submit" disabled={enCours} className="btn-primary justify-center">
          {enCours ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-text-soft">
        Pas encore de compte ?{' '}
        <Link href="/inscription" className="font-semibold text-amber-ink hover:underline">
          S&apos;inscrire
        </Link>
      </p>

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
