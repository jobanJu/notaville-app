'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CitySearch from '@/components/CitySearch'
import { isDemoModeClient } from '@/lib/demo/client'
import { demoQuartiers } from '@/lib/demo/data'

export default function AvisPage() {
  const [ville, setVille] = useState(null)
  const [quartiers, setQuartiers] = useState([])
  const [quartierId, setQuartierId] = useState('')
  const [note, setNote] = useState(5)
  const [pointFort, setPointFort] = useState('')
  const [pointsForts, setPointsForts] = useState([])
  const [pointFaible, setPointFaible] = useState('')
  const [pointsFaibles, setPointsFaibles] = useState([])
  const [commentaire, setCommentaire] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    if (!ville) {
      setQuartiers([])
      return
    }
    if (isDemoModeClient()) {
      setQuartiers(demoQuartiers.filter((q) => q.villeCode === ville.code_insee))
      return
    }
    supabase
      .from('quartiers')
      .select('id, nom')
      .eq('ville_code_insee', ville.code_insee)
      .order('nom')
      .then(({ data }) => setQuartiers(data ?? []))
  }, [ville])

  function ajouter(liste, setListe, valeur, setValeur) {
    if (!valeur.trim()) return
    setListe([...liste, valeur.trim()])
    setValeur('')
  }

  async function envoyer(e) {
    e.preventDefault()
    setErreur(null)

    if (!ville) {
      setErreur('Choisis une ville.')
      return
    }

    // Un quartier n'est exigé que si la ville en a de référencés --
    // sinon l'avis se rattache directement à la ville (voir migration
    // 27), pour couvrir aussi les communes sans quartiers.
    if (quartiers.length > 0 && !quartierId) {
      setErreur('Choisis un quartier.')
      return
    }

    if (isDemoModeClient()) {
      setEnvoye(true)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('avis').insert({
      user_id: user.id,
      quartier_id: quartierId || null,
      ville_code_insee: quartierId ? null : ville.code_insee,
      note,
      points_forts: pointsForts,
      points_faibles: pointsFaibles,
      commentaire: commentaire.trim() || null,
    })

    if (error) {
      setErreur("L'avis n'a pas pu être enregistré.")
      return
    }
    setEnvoye(true)
  }

  if (envoye) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-lg font-bold text-mint-ink">Avis publié ! + Notacoins</p>
        <p className="mt-2 text-sm text-text-soft">Merci pour ce retour détaillé.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold">Un avis détaillé</h1>
      <p className="mt-1 text-sm text-text-soft">
        Ta ville d&apos;origine, ou une ville visitée — même à l&apos;étranger.
      </p>

      <form onSubmit={envoyer} className="mt-8 flex flex-col gap-5">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-soft">
            Ville
          </label>
          <CitySearch onSelect={setVille} />
        </div>

        {ville && (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-soft">
              Quartier
            </label>
            <select
              value={quartierId}
              onChange={(e) => setQuartierId(e.target.value)}
              className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
            >
              <option value="">Choisir un quartier...</option>
              {quartiers.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.nom}
                </option>
              ))}
            </select>
            {quartiers.length === 0 && (
              <p className="mt-2 text-xs text-text-soft">
                Cette ville n&apos;a pas encore de quartiers référencés : ton avis portera
                sur la ville entière.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-soft">
            Note globale
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setNote(n)}
                className={n <= note ? 'text-amber-ink' : 'text-card-edge'}
                aria-label={`${n} étoiles`}
              >
                <Star className="h-6 w-6" fill={n <= note ? 'currentColor' : 'none'} strokeWidth={1.75} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-mint-ink">
            Ce qui est bien
          </label>
          <div className="flex gap-2">
            <input
              value={pointFort}
              onChange={(e) => setPointFort(e.target.value)}
              placeholder="Ex : marché tous les jours"
              className="flex-1 rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-mint"
            />
            <button
              type="button"
              onClick={() => ajouter(pointsForts, setPointsForts, pointFort, setPointFort)}
              className="rounded-full border border-card-edge px-4 text-sm hover:border-mint"
            >
              Ajouter
            </button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pointsForts.map((p, i) => (
              <li key={i} className="rounded-full bg-mint/10 px-3 py-1 text-xs text-mint-ink">
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-coral-ink">
            Ce qui l&apos;est moins
          </label>
          <div className="flex gap-2">
            <input
              value={pointFaible}
              onChange={(e) => setPointFaible(e.target.value)}
              placeholder="Ex : trottoirs dégradés"
              className="flex-1 rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-coral"
            />
            <button
              type="button"
              onClick={() => ajouter(pointsFaibles, setPointsFaibles, pointFaible, setPointFaible)}
              className="rounded-full border border-card-edge px-4 text-sm hover:border-coral"
            >
              Ajouter
            </button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pointsFaibles.map((p, i) => (
              <li key={i} className="rounded-full bg-coral/10 px-3 py-1 text-xs text-coral-ink">
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-soft">
            Ton avis en quelques mots <span className="normal-case text-text-soft">(optionnel)</span>
          </label>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Raconte ton expérience de la ville : ambiance, ce qui t'a marqué..."
            className="w-full rounded-2xl border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
          />
          <p className="mt-1 text-right text-[11px] text-text-soft">{commentaire.length}/1000</p>
        </div>

        {erreur && <p className="text-sm text-coral-ink">{erreur}</p>}

        <button type="submit" className="btn-primary justify-center">
          Publier l&apos;avis
        </button>
      </form>
    </div>
  )
}
