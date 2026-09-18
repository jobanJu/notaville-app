'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import Icone from '@/components/Icone'
import LogoutButton from './LogoutButton'

// Menu mobile (burger) : avant, les liens publics (Villes, Comparer...)
// étaient dans un <nav> "hidden sm:flex" SANS équivalent visible en
// dessous de 640px pour un visiteur non connecté -- un vrai trou de
// navigation sur mobile, repéré pendant la passe de responsive. Ce
// composant les remplace tous les deux (public + connecté) par un seul
// bouton burger, visible uniquement sous sm, qui ouvre la liste
// complète adaptée à l'état de connexion.
//
// Depuis l'ajout de BottomNav.js (barre basse façon appli, premier
// retour utilisateur sur le côté "site web" de la navigation mobile),
// les 5 destinations les plus utilisées une fois connecté (Classement,
// Découvrir, Défis, Jeux, Profil) vivent dans cette barre basse. Le
// burger ne garde donc, côté connecté, que les liens secondaires.
export default function NavMobileMenu({ connecte, profil, demo }) {
  const [ouvert, setOuvert] = useState(false)

  const liensPublics = [
    { href: '/villes', label: 'Villes' },
    { href: '/recherche', label: 'Recherche' },
    { href: '/comparer', label: 'Comparer' },
    { href: '/guides', label: 'Guides' },
    { href: '/reductions', label: 'Réductions' },
    { href: '/evenements', label: 'Évènements' },
  ]
  const liensConnecte = [
    { href: '/avis', label: 'Avis' },
    { href: '/duels', label: 'Duels' },
    { href: '/boutique', label: 'Boutique' },
    { href: '/messages', label: 'Messages' },
  ]

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOuvert((v) => !v)}
        aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={ouvert}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-card-edge"
      >
        {ouvert ? <X className="h-4 w-4" strokeWidth={1.75} /> : <Menu className="h-4 w-4" strokeWidth={1.75} />}
      </button>

      {ouvert && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-card-edge bg-bg px-4 py-4 shadow-lg">
          <nav className="flex flex-col gap-1 text-sm">
            {liensPublics.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOuvert(false)}
                className="rounded-xl px-3 py-2.5 text-text-soft hover:bg-bg-soft hover:text-text"
              >
                {l.label}
              </Link>
            ))}

            {connecte && (
              <>
                <div className="my-1 border-t border-card-edge" />
                {liensConnecte.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOuvert(false)}
                    className="rounded-xl px-3 py-2.5 text-text-soft hover:bg-bg-soft hover:text-text"
                  >
                    {l.label}
                  </Link>
                ))}
                {profil?.est_admin && (
                  <>
                    <Link
                      href="/admin/defis"
                      onClick={() => setOuvert(false)}
                      className="rounded-xl px-3 py-2.5 text-text-soft hover:bg-bg-soft hover:text-text"
                    >
                      Admin défis
                    </Link>
                    <Link
                      href="/admin/evenements"
                      onClick={() => setOuvert(false)}
                      className="rounded-xl px-3 py-2.5 text-text-soft hover:bg-bg-soft hover:text-text"
                    >
                      Admin évènements
                    </Link>
                  </>
                )}
                <Link
                  href="/profil"
                  onClick={() => setOuvert(false)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 font-mono text-amber-ink hover:bg-bg-soft"
                >
                  {profil?.notacoins ?? 0}
                  <Icone nom="pieces" className="h-3.5 w-3.5" />
                  Mon profil
                </Link>
                <div className="px-3 py-2.5">
                  <LogoutButton />
                </div>
              </>
            )}

            {!connecte && (
              <>
                <div className="my-1 border-t border-card-edge" />
                <Link
                  href="/login"
                  onClick={() => setOuvert(false)}
                  className="rounded-xl px-3 py-2.5 text-text-soft hover:bg-bg-soft hover:text-text"
                >
                  Se connecter
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOuvert(false)}
                  className="btn-primary mt-1 justify-center"
                >
                  Rejoindre
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  )
}
