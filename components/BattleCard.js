'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BattleCard({
  duelId,
  quartierA,
  quartierB,
  votesInitiauxA,
  votesInitiauxB,
  voteInitial,
  demo = false,
}) {
  const [votesA, setVotesA] = useState(votesInitiauxA)
  const [votesB, setVotesB] = useState(votesInitiauxB)
  const [monVote, setMonVote] = useState(voteInitial)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const total = votesA + votesB || 1
  const pctA = Math.round((votesA / total) * 100)
  const pctB = 100 - pctA

  async function voter(quartier) {
    if (monVote) return

    if (!demo) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('votes_duels')
        .insert({ duel_id: duelId, user_id: user.id, quartier_choisi_id: quartier.id })

      if (error) {
        setMessage("Ton vote n'a pas pu être enregistré.")
        return
      }
    }

    setMonVote(quartier.id)
    if (quartier.id === quartierA.id) setVotesA((v) => v + 1)
    else setVotesB((v) => v + 1)
    setMessage(`Merci pour ton vote ! Si ${quartier.nom} termine en tête, tu gagnes des Notacoins bonus.`)
  }

  return (
    <div className="rounded-3xl border border-card-edge bg-card p-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => voter(quartierA)}
          disabled={!!monVote}
          className={`flex-1 rounded-2xl border p-4 text-center transition ${
            monVote === quartierA.id
              ? 'border-mint'
              : 'border-card-edge hover:border-amber disabled:hover:border-card-edge'
          }`}
        >
          <span className="font-display block font-bold">{quartierA.nom}</span>
          <span className="text-xs text-text-soft">{quartierA.ville}</span>
        </button>
        <span className="font-display text-sm font-extrabold text-amber-ink">VS</span>
        <button
          onClick={() => voter(quartierB)}
          disabled={!!monVote}
          className={`flex-1 rounded-2xl border p-4 text-center transition ${
            monVote === quartierB.id
              ? 'border-mint'
              : 'border-card-edge hover:border-amber disabled:hover:border-card-edge'
          }`}
        >
          <span className="font-display block font-bold">{quartierB.nom}</span>
          <span className="text-xs text-text-soft">{quartierB.ville}</span>
        </button>
      </div>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-card-edge">
        <div
          className="h-full rounded-full"
          style={{ width: `${pctA}%`, background: 'linear-gradient(120deg, #FF5A56, #FFA726)' }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs text-text-soft">
        <span>{pctA}%</span>
        <span>{total === 1 && votesA + votesB === 0 ? 0 : votesA + votesB} votes</span>
        <span>{pctB}%</span>
      </div>

      {message && <p className="mt-4 text-sm text-mint-ink">{message}</p>}
    </div>
  )
}
