'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { labelTypeArticle } from '@/lib/boutique'
import Icone from '@/components/Icone'

// Achat/équipement d'un article de boutique -- voir
// supabase/32_boutique_cosmetique.sql (acheter_article_boutique,
// equiper_article_boutique). En mode démo, achat/équipement simulés en
// local uniquement (pas de vrai Supabase, comme le reste du mode démo).
export default function Boutique({ articles: articlesInitiaux, demo = false }) {
  const [articles, setArticles] = useState(articlesInitiaux)
  const [enCours, setEnCours] = useState(null)
  const [erreur, setErreur] = useState(null)
  const supabase = createClient()

  async function acheter(article) {
    setErreur(null)
    setEnCours(article.id)
    try {
      if (demo) {
        setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, possede: true } : a)))
        return
      }
      const { error } = await supabase.rpc('acheter_article_boutique', { p_article_id: article.id })
      if (error) throw error
      setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, possede: true } : a)))
    } catch (e) {
      setErreur(e.message ?? "Achat impossible pour l'instant.")
    } finally {
      setEnCours(null)
    }
  }

  async function equiper(article) {
    setErreur(null)
    setEnCours(article.id)
    try {
      if (!demo) {
        if (article.equipe) {
          const { error } = await supabase.rpc('desequiper_article_boutique', { p_type: article.type })
          if (error) throw error
        } else {
          const { error } = await supabase.rpc('equiper_article_boutique', { p_article_id: article.id })
          if (error) throw error
        }
      }
      // Un seul article équipé par type -- on ne touche que les articles
      // du même type que celui qu'on vient de (dés)équiper.
      setArticles((prev) =>
        prev.map((a) => {
          if (a.type !== article.type) return a
          return { ...a, equipe: article.equipe ? false : a.id === article.id }
        })
      )
    } catch (e) {
      setErreur(e.message ?? "Impossible d'équiper cet article pour l'instant.")
    } finally {
      setEnCours(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {erreur && (
        <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erreur}</p>
      )}

      {articles.length === 0 ? (
        <p className="text-sm text-text-soft">Aucun article disponible pour le moment.</p>
      ) : (
        articles.map((a) => (
          <div key={a.id} className="rounded-2xl border border-card-edge bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/10 text-amber-ink">
                <Icone nom={a.type === 'badge_cosmetique' ? a.valeur : 'etincelle'} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{a.nom}</p>
                  <span className="rounded-full border border-card-edge px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-soft">
                    {labelTypeArticle(a.type)}
                  </span>
                </div>
                {a.description && <p className="mt-1 text-sm text-text-soft">{a.description}</p>}
                <div className="mt-3 flex items-center gap-2">
                  {a.possede ? (
                    <button
                      type="button"
                      onClick={() => equiper(a)}
                      disabled={enCours === a.id}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                        a.equipe
                          ? 'bg-amber text-bg'
                          : 'border border-card-edge text-text hover:border-amber'
                      }`}
                    >
                      {a.equipe ? 'Équipé ✓' : 'Équiper'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => acheter(a)}
                      disabled={enCours === a.id}
                      className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs"
                    >
                      <Icone nom="pieces" className="h-3.5 w-3.5" />
                      {a.prix_notacoins}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
