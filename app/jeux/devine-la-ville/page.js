'use client'

// "Devine la ville" -- mini GeoGuessr : une photo (Wikipédia, via
// lib/wikimedia.js, même source que ImageVille.js), 4 noms de ville
// proposés. Pool volontairement restreint à de grandes villes
// connues (lib/demo/jeuxVilles.js) : une petite commune tirée au
// hasard n'a presque jamais de photo exploitable, et serait de toute
// façon impossible à reconnaître sur une image.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { chargerImageVille } from '@/lib/wikimedia'
import { VILLES_JEU, melanger, tirerAutres, creerPioche } from '@/lib/demo/jeuxVilles'
import { crediterNotacoinsJeu } from '@/lib/notacoins'
import Icone from '@/components/Icone'
import PubGate from '@/components/PubGate'

const TENTATIVES_MAX = 5 // si aucune photo trouvée après N essais, on abandonne la manche proprement

// Pioche "sans répétition" (voir lib/demo/jeuxVilles.js) : les 33
// villes passent chacune une fois avant de pouvoir repasser, au lieu
// d'un tirage Math.random() qui n'excluait que la toute dernière et
// laissait revenir les mêmes bien trop vite.
function nouvelleManche(pioche) {
  const bonneVille = pioche.suivant()
  const distracteurs = tirerAutres(VILLES_JEU, bonneVille, 3)
  return { bonneVille, options: melanger([bonneVille, ...distracteurs]) }
}

export default function DevineLaVillePage() {
  // Premier tirage fixe (pas de Math.random au premier rendu, pour ne
  // jamais désynchroniser serveur/client) -- le vrai tirage arrive dans
  // l'effet, comme JeuPopulation.js.
  const [manche, setManche] = useState({ bonneVille: VILLES_JEU[0], options: VILLES_JEU.slice(0, 4) })
  const [image, setImage] = useState(undefined) // undefined = chargement, null = pas trouvée
  const [reponseChoisie, setReponseChoisie] = useState(null)
  const [score, setScore] = useState(0)
  const [serie, setSerie] = useState(0)
  const [manchesJouees, setManchesJouees] = useState(0)

  // Une pioche par partie (créée une seule fois au montage) : voir
  // /jeux/quiz-eclair pour le même correctif.
  const pioche = useRef(null)
  if (!pioche.current) pioche.current = creerPioche(VILLES_JEU)

  useEffect(() => {
    Promise.resolve().then(() => tirerManche())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function tirerManche() {
    setReponseChoisie(null)
    setImage(undefined)
    let essai = 0
    let courant = nouvelleManche(pioche.current)
    while (essai < TENTATIVES_MAX) {
      const res = await chargerImageVille(courant.bonneVille.nom, courant.bonneVille.departement)
      if (res) {
        setManche(courant)
        setImage(res)
        return
      }
      essai += 1
      courant = nouvelleManche(pioche.current)
    }
    // Aucune photo trouvée après plusieurs essais (réseau capricieux,
    // par exemple) -- on affiche quand même la manche sans photo plutôt
    // que de bloquer le jeu indéfiniment.
    setManche(courant)
    setImage(null)
  }

  function repondre(ville) {
    if (reponseChoisie) return
    setReponseChoisie(ville)
    setManchesJouees((n) => n + 1)
    if (ville.code_insee === manche.bonneVille.code_insee) {
      setScore((s) => s + 10)
      setSerie((s) => s + 1)
      crediterNotacoinsJeu('jeu_bonne_reponse')
    } else {
      setSerie(0)
    }
  }

  const aRepondu = reponseChoisie !== null
  const aBonJuste = reponseChoisie?.code_insee === manche.bonneVille.code_insee

  return (
    <PubGate>
    <div className="mx-auto max-w-md px-4 py-10">
      <Link href="/jeux" className="text-xs text-text-soft hover:text-text">← Espace jeux</Link>
      <h1 className="mt-2 text-2xl font-extrabold">Devine la ville</h1>
      <p className="mt-1 text-sm text-text-soft">Une photo, quatre villes. Sauras-tu la reconnaître ?</p>

      <div className="mt-4 flex items-center justify-center gap-4 text-sm">
        <span className="flex items-center gap-1 font-mono">
          <Star className="h-3.5 w-3.5 text-amber-ink" fill="currentColor" strokeWidth={0} />
          {score} pts
        </span>
        <span className="text-text-soft">Série : {serie}</span>
        <span className="text-text-soft">Manche {manchesJouees + (aRepondu ? 0 : 1)}</span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-card-edge bg-bg-soft">
        {image === undefined && <div className="flex h-56 items-center justify-center text-sm text-text-soft">Chargement de la photo...</div>}
        {image === null && (
          <div className="flex h-56 flex-col items-center justify-center gap-1 px-4 text-center text-sm text-text-soft">
            <Icone nom="compass" className="h-6 w-6" />
            Pas de photo disponible pour cette manche, réponds quand même !
          </div>
        )}
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt="Devine cette ville" className="h-56 w-full object-cover" />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {manche.options.map((v) => {
          const estLaBonneReponse = v.code_insee === manche.bonneVille.code_insee
          const estChoisie = v.code_insee === reponseChoisie?.code_insee
          let classe = 'border-card-edge hover:border-amber'
          if (aRepondu && estLaBonneReponse) classe = 'border-mint bg-mint/10 text-mint-ink'
          else if (aRepondu && estChoisie) classe = 'border-coral bg-coral/10 text-coral-ink'
          return (
            <button
              key={v.code_insee}
              type="button"
              disabled={aRepondu}
              onClick={() => repondre(v)}
              className={`rounded-full border px-4 py-2.5 text-sm font-semibold disabled:cursor-default ${classe}`}
            >
              {v.nom}
            </button>
          )
        })}
      </div>

      {aRepondu && (
        <div className="mt-4 text-center">
          <p className={`text-sm font-semibold ${aBonJuste ? 'text-mint-ink' : 'text-coral-ink'}`}>
            {aBonJuste ? 'Bien joué !' : `Raté, c'était ${manche.bonneVille.nom}.`}
          </p>
          <button
            type="button"
            onClick={() => tirerManche()}
            className="btn-primary mt-3 text-sm"
          >
            Ville suivante
          </button>
        </div>
      )}
    </div>
    </PubGate>
  )
}
