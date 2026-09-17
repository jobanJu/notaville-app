'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icone from '@/components/Icone'

const ONGLETS = [
  { href: '/classement', label: 'Classement', icone: 'trophee' },
  { href: '/decouvrir', label: 'Découvrir', icone: 'carte' },
  { href: '/defis', label: 'Défis', icone: 'flamme' },
  { href: '/jeux', label: 'Jeux', icone: 'jeu' },
  { href: '/profil', label: 'Profil', icone: 'utilisateurs' },
]

// Barre de navigation basse façon appli mobile, visible uniquement sous
// sm et seulement une fois connecté (voir app/layout.js) : les 5
// destinations les plus utilisées, toujours accessibles sans passer par
// un menu. Remplace, pour ces destinations, le seul menu burger qui
// donnait une impression de site web plutôt que d'appli -- premier
// retour utilisateur sur l'expérience mobile. Le burger (NavMobileMenu)
// reste le point d'entrée pour la partie publique et les liens
// secondaires (Avis, Duels, Comparer, Guides, Réductions, Admin).
export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-card-edge bg-bg/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ONGLETS.map((o) => {
        const actif = pathname === o.href || pathname.startsWith(`${o.href}/`)
        return (
          <Link
            key={o.href}
            href={o.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              actif ? 'text-mint-ink' : 'text-text-soft'
            }`}
          >
            <Icone nom={o.icone} className="h-5 w-5" strokeWidth={actif ? 2 : 1.75} />
            {o.label}
          </Link>
        )
      })}
    </nav>
  )
}
