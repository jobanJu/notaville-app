'use client'

// "Plus cher ou moins cher ?" -- higher/lower sur les données "Vie
// quotidienne" déjà collectées par la communauté (mêmes chiffres que
// la fiche ville et /comparer, voir lib/donnees.js et
// lib/villes/labels.js pour les libellés/unités). La ville championne
// reste en jeu tant que la série continue ; à chaque manche, une
// nouvelle ville arrive avec une donnée que les deux villes ont en
// commun (toutes les villes n'ont pas les mêmes statistiques -- écarts
// honnêtes, voir lib/demo/data.js).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import { demoFichesVilles } from '@/lib/demo/data'
import { LABEL_DONNEE, statsAffichables } from '@/lib/villes/labels'
import { BORNES_DONNEE } from '@/lib/donnees'
import { crediterNotacoinsJeu } from '@/lib/notacoins'
import Icone from '@/components/Icone'
import PubGate from '@/components/PubGate'

const VILLES_DEMO = Object.values(demoFichesVilles)
// En mode réel, on réutilise fiche_ville() (même fonction que
// /comparer) sur ce même petit groupe de villes déjà présentes dans le
// site plutôt que d'inventer un tirage sur les 34 969 communes --
// beaucoup trop peu auraient assez de contributions pour ce jeu.
const CODES_REEL = Object.keys(demoFichesVilles)

function melanger(tableau) {
  const copie = [...tableau]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copie[i], copie[j]] = [copie[j], copie[i]]
  }
  return copie
}

function valeurStat(fiche, cle) {
  return fiche?.stats?.find((s) => s.donnee_cle === cle)?.valeur ?? null
}

function statsCommunes(ficheA, ficheB) {
  const clesA = new Set(statsAffichables(ficheA.stats).map((s) => s.donnee_cle))
  return statsAffichables(ficheB.stats).map((s) => s.donnee_cle).filter((cle) => clesA.has(cle))
}

// Cherche une ville (parmi `pool`, hors `championCode`) qui partage au
// moins une donnée avec la ville championne, et une donnée en commun
// au hasard parmi celles-ci.
function tirerAdversaire(pool, champion) {
  const candidats = melanger(pool.filter((v) => v.code_insee !== champion.code_insee))
  for (const candidat of candidats) {
    const cles = statsCommunes(champion, candidat)
    if (cles.length > 0) {
      return { adversaire: candidat, cle: cles[Math.floor(Math.random() * cles.length)] }
    }
  }
  return null
}

export default function PlusCherMoinsCherPage() {
  const supabase = createClient()
  // Premier rendu fixe (pas de tirage aléatoire avant l'effet, même
  // précaution que les autres jeux) : les deux premières villes du
  // groupe démo, sans donnée choisie tant que l'effet n'a pas tourné.
  const [pool, setPool] = useState(VILLES_DEMO)
  const [champion, setChampion] = useState(VILLES_DEMO[0])
  const [adversaire, setAdversaire] = useState(VILLES_DEMO[1])
  const [statCle, setStatCle] = useState(null)
  const [reponseChoisie, setReponseChoisie] = useState(null)
  const [serie, setSerie] = useState(0)
  const [meilleureSerie, setMeilleureSerie] = useState(0)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    Promise.resolve().then(async () => {
      let villes = VILLES_DEMO
      if (!isDemoModeClient()) {
        const resultats = await Promise.all(
          CODES_REEL.map((code) => supabase.rpc('fiche_ville', { p_code_insee: code }))
        )
        villes = resultats.map((r) => r.data).filter(Boolean)
      }
      setPool(villes)
      demarrerManche(villes, villes[Math.floor(Math.random() * villes.length)])
      setChargement(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function demarrerManche(poolActuel, championActuel) {
    const tirage = tirerAdversaire(poolActuel, championActuel)
    if (!tirage) {
      // Aucune ville du groupe ne partage plus de donnée avec cette
      // championne (ne devrait arriver qu'en toute fin de partie) --
      // on repart d'une autre ville championne plutôt que de bloquer.
      const autre = poolActuel[Math.floor(Math.random() * poolActuel.length)]
      const relance = tirerAdversaire(poolActuel, autre)
      if (!relance) return
      setChampion(autre)
      setAdversaire(relance.adversaire)
      setStatCle(relance.cle)
      return
    }
    setChampion(championActuel)
    setAdversaire(tirage.adversaire)
    setStatCle(tirage.cle)
  }

  function repondre(sens) {
    if (reponseChoisie || !statCle) return
    setReponseChoisie(sens)
    const valeurChampion = valeurStat(champion, statCle)
    const valeurAdversaire = valeurStat(adversaire, statCle)
    const correct = sens === 'plus' ? valeurAdversaire >= valeurChampion : valeurAdversaire <= valeurChampion
    if (correct) {
      const nouvelleSerie = serie + 1
      setSerie(nouvelleSerie)
      setMeilleureSerie((m) => Math.max(m, nouvelleSerie))
      crediterNotacoinsJeu('jeu_bonne_reponse')
    } else {
      setSerie(0)
    }
  }

  function mancheSuivante() {
    setReponseChoisie(null)
    demarrerManche(pool, adversaire)
  }

  const aRepondu = reponseChoisie !== null
  const label = statCle ? LABEL_DONNEE[statCle] ?? statCle : ''
  const unite = statCle ? BORNES_DONNEE[statCle]?.unite ?? '' : ''

  return (
    <PubGate>
    <div className="mx-auto max-w-md px-4 py-10">
      <Link href="/jeux" className="text-xs text-text-soft hover:text-text">← Espace jeux</Link>
      <h1 className="mt-2 text-2xl font-extrabold">Plus cher ou moins cher ?</h1>
      <p className="mt-1 text-sm text-text-soft">
        Compare deux villes sur une donnée réelle du site (loyer, salaire, prix...) et enchaîne les bonnes réponses.
      </p>

      <div className="mt-4 flex items-center justify-center gap-4 text-sm">
        <span className="flex items-center gap-1 font-mono">
          <Icone nom="trophee" className="h-3.5 w-3.5 text-amber-ink" />
          Série : {serie}
        </span>
        <span className="text-text-soft">Record : {meilleureSerie}</span>
      </div>

      {chargement || !statCle ? (
        <p className="mt-8 text-center text-sm text-text-soft">Préparation de la manche...</p>
      ) : (
        <>
          <p className="mt-5 text-center text-xs font-semibold uppercase tracking-wide text-text-soft">{label}</p>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-card-edge bg-card p-4 text-center">
              <p className="font-display font-bold">{champion.nom}</p>
              <p className="mt-2 text-lg font-extrabold text-amber-ink">
                {valeurStat(champion, statCle)} {unite}
              </p>
            </div>

            <div className={`rounded-2xl border p-4 text-center ${aRepondu ? (reponseChoisie === 'plus' ? (valeurStat(adversaire, statCle) >= valeurStat(champion, statCle) ? 'border-mint bg-mint/10' : 'border-coral bg-coral/10') : (valeurStat(adversaire, statCle) <= valeurStat(champion, statCle) ? 'border-mint bg-mint/10' : 'border-coral bg-coral/10')) : 'border-card-edge bg-card'}`}>
              <p className="font-display font-bold">{adversaire.nom}</p>
              <p className="mt-2 text-lg font-extrabold text-amber-ink">
                {aRepondu ? `${valeurStat(adversaire, statCle)} ${unite}` : '?'}
              </p>
            </div>
          </div>

          {!aRepondu ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => repondre('plus')}
                className="flex items-center justify-center gap-1.5 rounded-full border border-card-edge px-4 py-2.5 text-sm font-semibold hover:border-amber"
              >
                <ArrowUp className="h-4 w-4" /> Plus élevé
              </button>
              <button
                type="button"
                onClick={() => repondre('moins')}
                className="flex items-center justify-center gap-1.5 rounded-full border border-card-edge px-4 py-2.5 text-sm font-semibold hover:border-amber"
              >
                <ArrowDown className="h-4 w-4" /> Plus bas
              </button>
            </div>
          ) : (
            <div className="mt-4 text-center">
              <button type="button" onClick={mancheSuivante} className="btn-primary text-sm">
                Manche suivante
              </button>
            </div>
          )}
        </>
      )}
    </div>
    </PubGate>
  )
}
