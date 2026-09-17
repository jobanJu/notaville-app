import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo/session'
import { demoProfil } from '@/lib/demo/data'
import Icone from '@/components/Icone'
import LogoutButton from './LogoutButton'
import NavMobileMenu from './NavMobileMenu'

export default async function Navbar() {
  const demo = await isDemoMode()

  let user = null
  let profil = null

  if (demo) {
    user = { id: 'demo' }
    profil = demoProfil
  } else {
    const supabase = await createClient()
    const {
      data: { user: vraiUser },
    } = await supabase.auth.getUser()
    user = vraiUser

    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('pseudo, notacoins, est_admin')
        .eq('id', user.id)
        .single()
      profil = data
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-card-edge bg-bg/85 backdrop-blur">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-display text-lg font-extrabold">
          Notaville {demo && <span className="ml-1 text-xs font-normal text-amber-ink">DÉMO</span>}
        </Link>

        {/* Villes et Comparer sont publics : accessibles avec ou sans
            compte, comme l'exige le cahier des charges (les statistiques
            et comparateurs restent gratuits, défis ou pas). */}
        <nav className="hidden items-center gap-4 text-sm text-text-soft sm:flex">
          <Link href="/villes" className="hover:text-text">Villes</Link>
          <Link href="/recherche" className="hover:text-text">Recherche</Link>
          <Link href="/comparer" className="hover:text-text">Comparer</Link>
          <Link href="/guides" className="hover:text-text">Guides</Link>
          <Link href="/reductions" className="hover:text-text">Réductions</Link>
        </nav>

        {user ? (
          <nav className="hidden items-center gap-4 text-sm text-text-soft sm:flex">
            <Link href="/decouvrir" className="hover:text-text">Découvrir</Link>
            <Link href="/avis" className="hover:text-text">Avis</Link>
            <Link href="/defis" className="hover:text-text">Défis</Link>
            <Link href="/duels" className="hover:text-text">Duels</Link>
            <Link href="/classement" className="hover:text-text">Classement</Link>
            <Link href="/jeux" className="hover:text-text">Jeux</Link>
            {profil?.est_admin && (
              <Link href="/admin/defis" className="hover:text-text">Admin</Link>
            )}
            <Link href="/profil" className="hover:text-text">
              <span className="flex items-center gap-1 font-mono text-amber-ink">
                {profil?.notacoins ?? 0}
                <Icone nom="pieces" className="h-3.5 w-3.5" />
              </span>
            </Link>
            <LogoutButton />
          </nav>
        ) : (
          <nav className="hidden items-center gap-3 sm:flex">
            <Link href="/login" className="text-sm text-text-soft hover:text-text">
              Se connecter
            </Link>
            <Link href="/login" className="btn-primary text-sm">
              Rejoindre
            </Link>
          </nav>
        )}

        <NavMobileMenu connecte={Boolean(user)} profil={profil} demo={demo} />
      </div>
    </header>
  )
}
