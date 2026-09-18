'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AVATARS_PROPOSES } from '@/lib/avatars'
import Avatar from '@/components/Avatar'

export default function InscriptionPage() {
  const [pseudo, setPseudo] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [avatarChoisi, setAvatarChoisi] = useState(AVATARS_PROPOSES[0])
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  async function creerCompte(e) {
    e.preventDefault()
    setErreur(null)

    if (motDePasse.length < 6) {
      setErreur('Le mot de passe doit faire au moins 6 caractères.')
      return
    }

    setEnCours(true)

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: motDePasse,
      options: {
        data: {
          pseudo: pseudo.trim(),
          avatar_emoji: avatarChoisi.emoji,
          avatar_couleur: avatarChoisi.couleur,
        },
      },
    })

    setEnCours(false)

    if (error) {
      setErreur(
        error.message?.toLowerCase().includes('already registered')
          ? 'Cet e-mail est déjà utilisé.'
          : "L'inscription a échoué : e-mail invalide, ou pseudo déjà pris."
      )
      return
    }

    if (data?.session) {
      router.push('/onboarding')
      router.refresh()
      return
    }

    // Pas de session renvoyée : la confirmation par e-mail est
    // probablement encore activée côté Supabase (Authentication →
    // Providers → Email → "Confirm email"). Le compte est bien créé,
    // mais il faut d'abord la désactiver pour se connecter directement.
    setErreur(
      'Compte créé, mais la connexion automatique a échoué. Si ça persiste, la confirmation par e-mail est peut-être encore activée côté Supabase.'
    )
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-extrabold">Créer un compte</h1>
      <p className="mt-2 text-sm text-text-soft">
        Un pseudo, un e-mail, un mot de passe. C&apos;est tout.
      </p>

      <form onSubmit={creerCompte} className="mt-8 flex flex-col gap-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-soft">
            Avatar
          </p>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS_PROPOSES.map((a) => (
              <button
                key={a.emoji}
                type="button"
                onClick={() => setAvatarChoisi(a)}
                aria-label="Choisir cet avatar"
                className={`flex items-center justify-center rounded-full p-0.5 ${
                  avatarChoisi.emoji === a.emoji ? 'ring-2 ring-amber' : ''
                }`}
              >
                <Avatar emoji={a.emoji} couleur={a.couleur} taille="md" />
              </button>
            ))}
          </div>
        </div>

        <input
          id="pseudo"
          type="text"
          required
          minLength={2}
          maxLength={24}
          autoComplete="nickname"
          placeholder="Pseudo"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          className="rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
        />
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
        <input
          id="mot-de-passe"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Mot de passe (6 caractères minimum)"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className="rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
        />
        {erreur && <p className="text-sm text-coral-ink">{erreur}</p>}
        <button type="submit" disabled={enCours} className="btn-primary justify-center">
          {enCours ? 'Création...' : 'Créer mon compte'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-text-soft">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-semibold text-amber-ink hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
