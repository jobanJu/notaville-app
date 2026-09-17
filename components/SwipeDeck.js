'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SwipeDeck({ quartiers, demo = false }) {
  const [index, setIndex] = useState(0)
  const [message, setMessage] = useState('')
  const [drag, setDrag] = useState({ x: 0, dragging: false })
  const startX = useRef(0)
  const supabase = createClient()

  const restants = quartiers.slice(index, index + 3)
  const termine = index >= quartiers.length

  async function enregistrer(quartier, aime) {
    if (demo) {
      setMessage(aime ? 'Match enregistré (+ Notacoins) — démo, rien n\'est sauvegardé' : 'Passé')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('notes')
      .insert({ quartier_id: quartier.id, aime, user_id: user.id })

    if (error && error.code !== '23505') {
      // 23505 = déjà noté (contrainte unique) : on ignore et on avance quand même
      setMessage("Cette note n'a pas pu être enregistrée.")
      return
    }
    setMessage(aime ? 'Match enregistré (+ Notacoins)' : 'Passé')
  }

  function decider(quartier, aime) {
    enregistrer(quartier, aime)
    setDrag({ x: 0, dragging: false })
    setIndex((i) => i + 1)
  }

  function onPointerDown(e) {
    startX.current = e.clientX
    setDrag({ x: 0, dragging: true })
  }
  function onPointerMove(e) {
    if (!drag.dragging) return
    setDrag({ x: e.clientX - startX.current, dragging: true })
  }
  function onPointerUp(quartier) {
    if (drag.x > 100) decider(quartier, true)
    else if (drag.x < -100) decider(quartier, false)
    else setDrag({ x: 0, dragging: false })
  }

  if (termine) {
    return (
      <div className="rounded-3xl border border-card-edge bg-card p-8 text-center">
        <p className="font-display text-lg font-bold">Tu as tout exploré !</p>
        <p className="mt-2 text-sm text-text-soft">
          Reviens plus tard pour de nouveaux quartiers, ou rédige un avis détaillé.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="relative mx-auto h-[420px] w-full max-w-sm">
        {restants
          .map((q, i) => ({ q, i }))
          .reverse()
          .map(({ q, i }) => {
            const estHaut = i === 0
            const style = estHaut
              ? {
                  transform: `translateX(${drag.x}px) rotate(${drag.x / 18}deg)`,
                  transition: drag.dragging ? 'none' : 'transform 0.3s ease',
                  zIndex: 10,
                }
              : {
                  transform: `translateY(${i * 10}px) scale(${1 - i * 0.04})`,
                  zIndex: 10 - i,
                }
            return (
              <div
                key={q.id}
                style={style}
                onPointerDown={estHaut ? onPointerDown : undefined}
                onPointerMove={estHaut ? onPointerMove : undefined}
                onPointerUp={estHaut ? () => onPointerUp(q) : undefined}
                className="absolute inset-0 flex cursor-grab flex-col justify-end rounded-3xl border border-card-edge bg-card p-6 active:cursor-grabbing"
              >
                {estHaut && (
                  <>
                    <span
                      className="absolute left-5 top-6 rounded-lg border-[3px] border-mint px-3 py-1 font-display text-lg font-extrabold text-mint"
                      style={{ opacity: Math.max(0, drag.x / 90) }}
                    >
                      J&apos;AIME
                    </span>
                    <span
                      className="absolute right-5 top-6 rounded-lg border-[3px] border-coral px-3 py-1 font-display text-lg font-extrabold text-coral"
                      style={{ opacity: Math.max(0, -drag.x / 90) }}
                    >
                      PASSE
                    </span>
                  </>
                )}
                <h3 className="font-display text-xl font-bold">{q.nom}</h3>
                <p className="mt-1 text-sm text-text-soft">{q.villeNom}</p>
              </div>
            )
          })}
      </div>

      <div className="mt-6 flex justify-center gap-5">
        <button
          onClick={() => decider(restants[0], false)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-card-edge text-lg hover:border-coral hover:text-coral"
          aria-label="Passer ce quartier"
        >
          ✕
        </button>
        <button
          onClick={() => decider(restants[0], true)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-card-edge text-lg hover:border-mint hover:text-mint"
          aria-label="Aimer ce quartier"
        >
          ♥
        </button>
      </div>

      <p className="mt-4 text-center text-sm text-text-soft">{message}</p>
      <p className="mt-1 text-center text-xs text-text-soft">
        {index} / {quartiers.length}
      </p>
    </div>
  )
}
