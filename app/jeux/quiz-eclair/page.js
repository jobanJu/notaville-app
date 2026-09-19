import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo/session'
import { demoProfil } from '@/lib/demo/data'
import QuizEclair from '@/components/QuizEclair'
import PubGate from '@/components/PubGate'

// Quiz éclair -- version à niveaux (voir supabase/42_quiz_eclair_niveaux.sql
// pour la progression/quota, et lib/demo/quizEclairNiveaux.js pour le
// tirage des questions). Contrairement à l'ancienne version (pur
// composant client, questions à l'infini), cette page a maintenant
// besoin de connaître la progression du joueur avant le premier rendu
// (niveau débloqué, niveau réussi, solde) -- d'où le passage à un
// composant serveur qui délègue l'interaction à QuizEclair, comme
// /boutique ou /admin/*.
export default async function QuizEclairPage() {
  const demo = await isDemoMode()

  let connecte = demo
  let niveauDebloque = 1
  let niveauReussi = 0
  let notacoins = 0

  if (demo) {
    niveauDebloque = demoProfil.niveauQuizEclair
    niveauReussi = demoProfil.niveauQuizEclairReussi
    notacoins = demoProfil.notacoins
  } else {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    connecte = Boolean(user)
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('niveau_quiz_eclair, niveau_quiz_eclair_reussi, notacoins')
        .eq('id', user.id)
        .single()
      niveauDebloque = data?.niveau_quiz_eclair ?? 1
      niveauReussi = data?.niveau_quiz_eclair_reussi ?? 0
      notacoins = data?.notacoins ?? 0
    }
  }

  return (
    <PubGate>
      <div className="mx-auto max-w-md px-4 py-10">
        <Link href="/jeux" className="text-xs text-text-soft hover:text-text">← Espace jeux</Link>
        <h1 className="mt-2 text-2xl font-extrabold">Quiz éclair</h1>
        <p className="mt-1 text-sm text-text-soft">
          10 questions par jour et par niveau. Un sans-faute rapporte 10 Notacoins et débloque la possibilité
          de passer au niveau suivant.
        </p>

        <QuizEclair
          niveauDebloqueInitial={niveauDebloque}
          niveauReussiInitial={niveauReussi}
          notacoinsInitial={notacoins}
          demo={demo}
          connecte={connecte}
        />
      </div>
    </PubGate>
  )
}
