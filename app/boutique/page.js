import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo/session'
import { demoProfil, demoBoutiqueArticles } from '@/lib/demo/data'
import Boutique from '@/components/Boutique'
import Icone from '@/components/Icone'

// Boutique cosmétique : badges/cadres/couleurs/titres achetables en
// Notacoins (voir supabase/32_boutique_cosmetique.sql). Page protégée
// (lib/supabase/middleware.js) -- il faut un compte pour acheter, mais
// rien n'empêche de la rendre publique en lecture seule plus tard.
export default async function BoutiquePage() {
  const demo = await isDemoMode()

  let articles = []
  let notacoins = 0

  if (demo) {
    articles = demoBoutiqueArticles
    notacoins = demoProfil.notacoins
  } else {
    const supabase = await createClient()
    const [{ data: dataArticles }, { data: { user } }] = await Promise.all([
      supabase.rpc('ma_boutique'),
      supabase.auth.getUser(),
    ])
    articles = dataArticles ?? []
    if (user) {
      const { data: profil } = await supabase.from('profiles').select('notacoins').eq('id', user.id).single()
      notacoins = profil?.notacoins ?? 0
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold">Boutique</h1>
      <p className="mt-1 text-sm text-text-soft">
        Des badges, cadres et titres cosmétiques à débloquer avec tes Notacoins.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-card-edge bg-card p-4">
        <Icone nom="pieces" className="h-5 w-5 text-amber-ink" />
        <p className="font-mono text-lg font-bold text-amber-ink">{notacoins}</p>
        <p className="text-sm text-text-soft">Notacoins disponibles</p>
      </div>

      <div className="mt-6">
        <Boutique articles={articles} demo={demo} />
      </div>
    </div>
  )
}
