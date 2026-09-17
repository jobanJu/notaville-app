'use client'

// "Quiz éclair" -- trois types de question qui tournent (région,
// département, population), tirées du même pool de grandes villes que
// /jeux/devine-la-ville. Pas de photo ici : contrairement à
// devine-la-ville, l'intérêt est la culture générale, pas la
// reconnaissance visuelle.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { VILLES_JEU, melanger } from '@/lib/demo/jeuxVilles'
import PubGate from '@/components/PubGate'

const TYPES = ['region', 'departement', 'population']

const BUCKETS_POPULATION = [
  { seuil: 800000, label: 'Plus de 800 000 habitants' },
  { seuil: 400000, label: '400 000 – 800 000 habitants' },
  { seuil: 200000, label: '200 000 – 400 000 habitants' },
  { seuil: 0, label: '100 000 – 200 000 habitants' },
]

function bucketPopulation(pop) {
  return BUCKETS_POPULATION.find((b) => pop >= b.seuil).label
}

function distracteurs(cle, bonneValeur, n) {
  const valeurs = [...new Set(VILLES_JEU.map((v) => v[cle]).filter((v) => v !== bonneValeur))]
  return melanger(valeurs).slice(0, n)
}

function tirerQuestion(excluCode) {
  const reste = excluCode ? VILLES_JEU.filter((v) => v.code_insee !== excluCode) : VILLES_JEU
  const ville = reste[Math.floor(Math.random() * reste.length)]
  const type = TYPES[Math.floor(Math.random() * TYPES.length)]

  if (type === 'population') {
    const bonneReponse = bucketPopulation(ville.population)
    const options = melanger(BUCKETS_POPULATION.map((b) => b.label))
    return { ville, type, enonce: `Combien d'habitants compte ${ville.nom} ?`, options, bonneReponse }
  }

  const cle = type // 'region' ou 'departement'
  const bonneReponse = ville[cle]
  const options = melanger([bonneReponse, ...distracteurs(cle, bonneReponse, 3)])
  const enonce = type === 'region' ? `Dans quelle région se trouve ${ville.nom} ?` : `Dans quel département se trouve ${ville.nom} ?`
  return { ville, type, enonce, options, bonneReponse }
}

export default function QuizEclairPage() {
  // Même précaution d'hydratation que JeuPopulation.js / devine-la-ville :
  // le premier rendu ne dépend pas de Math.random(), le vrai tirage
  // arrive dans l'effet.
  const [question, setQuestion] = useState({
    ville: VILLES_JEU[0],
    type: 'region',
    enonce: `Dans quelle région se trouve ${VILLES_JEU[0].nom} ?`,
    options: [VILLES_JEU[0].region],
    bonneReponse: VILLES_JEU[0].region,
  })
  const [reponseChoisie, setReponseChoisie] = useState(null)
  const [score, setScore] = useState(0)
  const [serie, setSerie] = useState(0)

  useEffect(() => {
    Promise.resolve().then(() => setQuestion(tirerQuestion(null)))
  }, [])

  function repondre(option) {
    if (reponseChoisie) return
    setReponseChoisie(option)
    if (option === question.bonneReponse) {
      setScore((s) => s + 10)
      setSerie((s) => s + 1)
    } else {
      setSerie(0)
    }
  }

  function suivant() {
    setReponseChoisie(null)
    setQuestion(tirerQuestion(question.ville.code_insee))
  }

  const aRepondu = reponseChoisie !== null
  const aBonJuste = reponseChoisie === question.bonneReponse

  return (
    <PubGate>
    <div className="mx-auto max-w-md px-4 py-10">
      <Link href="/jeux" className="text-xs text-text-soft hover:text-text">← Espace jeux</Link>
      <h1 className="mt-2 text-2xl font-extrabold">Quiz éclair</h1>
      <p className="mt-1 text-sm text-text-soft">Région, département, population — des questions qui tournent.</p>

      <div className="mt-4 flex items-center justify-center gap-4 text-sm">
        <span className="flex items-center gap-1 font-mono">
          <Star className="h-3.5 w-3.5 text-amber-ink" fill="currentColor" strokeWidth={0} />
          {score} pts
        </span>
        <span className="text-text-soft">Série : {serie}</span>
      </div>

      <div className="mt-6 rounded-2xl border border-card-edge bg-card p-5 text-center">
        <p className="font-display text-lg font-bold">{question.enonce}</p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {question.options.map((o) => {
          const estLaBonneReponse = o === question.bonneReponse
          const estChoisie = o === reponseChoisie
          let classe = 'border-card-edge hover:border-amber'
          if (aRepondu && estLaBonneReponse) classe = 'border-mint bg-mint/10 text-mint-ink'
          else if (aRepondu && estChoisie) classe = 'border-coral bg-coral/10 text-coral-ink'
          return (
            <button
              key={o}
              type="button"
              disabled={aRepondu}
              onClick={() => repondre(o)}
              className={`rounded-full border px-4 py-2.5 text-sm font-semibold disabled:cursor-default ${classe}`}
            >
              {o}
            </button>
          )
        })}
      </div>

      {aRepondu && (
        <div className="mt-4 text-center">
          <p className={`text-sm font-semibold ${aBonJuste ? 'text-mint-ink' : 'text-coral-ink'}`}>
            {aBonJuste ? 'Bien joué !' : `Raté, la bonne réponse était : ${question.bonneReponse}.`}
          </p>
          <button type="button" onClick={suivant} className="btn-primary mt-3 text-sm">
            Question suivante
          </button>
        </div>
      )}
    </div>
    </PubGate>
  )
}
