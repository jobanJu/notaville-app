'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Icone from '@/components/Icone'

// Mini-jeu "Devine la population", jouable sans compte, directement
// sur la page d'accueil -- même principe que le défi quiz du même nom
// (categories_defis 'connaissances'), pour que la page d'accueil ait
// tout de suite quelque chose de ludique plutôt que juste un texte de
// présentation. Populations réelles (voir public/data/villes-fr.json),
// fourchettes volontairement larges pour rester un jeu, pas un piège.
const QUESTIONS = [
  { nom: 'Paris', population: 2103778, choix: ['~ 500 000', '~ 1 million', '~ 2 millions', '~ 5 millions'], bonneReponse: '~ 2 millions' },
  { nom: 'Marseille', population: 886040, choix: ['~ 200 000', '~ 500 000', '~ 900 000', '~ 1,5 million'], bonneReponse: '~ 900 000' },
  { nom: 'Lyon', population: 519127, choix: ['~ 100 000', '~ 250 000', '~ 500 000', '~ 1 million'], bonneReponse: '~ 500 000' },
  { nom: 'Lille', population: 238246, choix: ['~ 50 000', '~ 120 000', '~ 240 000', '~ 500 000'], bonneReponse: '~ 240 000' },
  { nom: 'Bordeaux', population: 267991, choix: ['~ 80 000', '~ 150 000', '~ 270 000', '~ 600 000'], bonneReponse: '~ 270 000' },
  { nom: 'Strasbourg', population: 293771, choix: ['~ 90 000', '~ 180 000', '~ 290 000', '~ 700 000'], bonneReponse: '~ 290 000' },
  { nom: 'Nice', population: 357737, choix: ['~ 100 000', '~ 200 000', '~ 360 000', '~ 800 000'], bonneReponse: '~ 360 000' },
  { nom: 'Rennes', population: 230890, choix: ['~ 60 000', '~ 130 000', '~ 230 000', '~ 500 000'], bonneReponse: '~ 230 000' },
  { nom: 'Tourcoing', population: 98772, choix: ['~ 20 000', '~ 50 000', '~ 100 000', '~ 250 000'], bonneReponse: '~ 100 000' },
  { nom: 'Perpignan', population: 121616, choix: ['~ 30 000', '~ 60 000', '~ 120 000', '~ 300 000'], bonneReponse: '~ 120 000' },
  { nom: 'Ambérieu-en-Bugey', population: 15934, choix: ['~ 2 000', '~ 7 000', '~ 16 000', '~ 40 000'], bonneReponse: '~ 16 000' },
  { nom: "L'Abergement-Clémenciat", population: 860, choix: ['~ 150', '~ 500', '~ 900', '~ 3 000'], bonneReponse: '~ 900' },
]

function melanger(tableau) {
  const copie = [...tableau]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copie[i], copie[j]] = [copie[j], copie[i]]
  }
  return copie
}

function tirer(indexActuel) {
  let index = Math.floor(Math.random() * QUESTIONS.length)
  if (QUESTIONS.length > 1 && index === indexActuel) {
    index = (index + 1) % QUESTIONS.length
  }
  return { index, choix: melanger(QUESTIONS[index].choix) }
}

export default function JeuPopulation() {
  // Première question et ordre des choix fixes et non mélangés au
  // premier rendu (identiques serveur/client) -- tout ce qui dépend de
  // Math.random() (la ville tirée au sort, l'ordre des boutons)
  // n'arrive qu'après montage ou sur une action de l'utilisateur, pour
  // ne jamais désynchroniser le HTML serveur et le premier rendu
  // client.
  const [tirage, setTirage] = useState({ index: 0, choix: QUESTIONS[0].choix })
  const [reponseChoisie, setReponseChoisie] = useState(null)

  useEffect(() => {
    // Différé dans un micro-tâche (comme ImageVille.js) : un setState
    // dans un callback, pas dans le corps direct de l'effet.
    Promise.resolve().then(() => {
      setTirage(tirer(0))
    })
  }, [])

  const question = QUESTIONS[tirage.index]
  const choixMelanges = tirage.choix

  function autreVille() {
    setTirage(tirer(tirage.index))
    setReponseChoisie(null)
  }

  const aRepondu = reponseChoisie !== null
  const aBonJuste = reponseChoisie === question.bonneReponse

  return (
    <div className="mx-auto mt-10 max-w-md rounded-3xl border border-card-edge bg-card p-5 text-left shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mint-ink">
        <Icone nom="jeu" className="h-3.5 w-3.5" />
        Petit jeu, sans compte
      </p>
      <p className="mt-2 font-display text-lg font-bold">
        Combien d&apos;habitants à <span className="gradient-text">{question.nom}</span> ?
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {choixMelanges.map((c) => {
          const estLaBonneReponse = c === question.bonneReponse
          const estChoisie = c === reponseChoisie
          let classe = 'border-card-edge hover:border-amber'
          if (aRepondu && estLaBonneReponse) classe = 'border-mint bg-mint/10 text-mint-ink'
          else if (aRepondu && estChoisie) classe = 'border-coral bg-coral/10 text-coral-ink'
          return (
            <button
              key={c}
              type="button"
              disabled={aRepondu}
              onClick={() => setReponseChoisie(c)}
              className={`rounded-full border px-3 py-2 text-sm font-semibold disabled:cursor-default ${classe}`}
            >
              {c}
            </button>
          )
        })}
      </div>

      {aRepondu && (
        <div className="mt-4">
          <p className={`text-sm font-semibold ${aBonJuste ? 'text-mint-ink' : 'text-coral-ink'}`}>
            {aBonJuste ? 'Bien joué !' : 'Pas tout à fait !'} {question.nom} compte{' '}
            {question.population.toLocaleString('fr-FR')} habitants.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={autreVille} className="btn-primary text-sm">
              Une autre ville
            </button>
            <Link href="/inscription" className="text-sm text-text-soft hover:text-text">
              Créer un compte pour plus de défis →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
