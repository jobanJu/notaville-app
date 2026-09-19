// Quiz éclair, version "50 niveaux" (voir supabase/42_quiz_eclair_niveaux.sql
// pour la partie serveur -- progression, quota quotidien, déblocage).
// Le pool de villes (France + Belgique, ~35 000 communes via
// lib/demo/villesFr.js) est trié par population décroissante et
// découpé en 50 paliers : niveau 1 = les villes les plus connues,
// niveau 50 = les communes les plus confidentielles. Recalculé à
// chaque partie depuis le jeu de données courant -- pas besoin de
// figer les paliers en dur, un tri+découpage sur un tableau déjà
// chargé reste instantané.
import { melanger, creerPioche } from './jeuxVilles'

export const NB_NIVEAUX = 50
export const QUESTIONS_PAR_PARTIE = 10

export function construireNiveaux(toutesVilles) {
  const triees = [...toutesVilles].sort((a, b) => b.population - a.population)
  const parNiveau = Math.max(4, Math.ceil(triees.length / NB_NIVEAUX))
  const niveaux = []
  for (let i = 0; i < NB_NIVEAUX; i++) {
    const tranche = triees.slice(i * parNiveau, (i + 1) * parNiveau)
    niveaux.push(tranche.length >= 4 ? tranche : triees.slice(-4))
  }
  return niveaux
}

const TYPES_QUESTION = ['region', 'departement', 'population']

function distracteurs(cle, bonneValeur, pool, n) {
  const valeurs = [...new Set(pool.map((v) => v[cle]).filter((v) => v !== bonneValeur))]
  return melanger(valeurs).slice(0, n)
}

// "Laquelle de ces villes a le plus d'habitants ?" -- comparaison
// directe entre les 4 options plutôt que des paliers de population
// fixes (200k/400k/800k...), qui n'ont de sens que pour de grandes
// villes : cette formulation reste juste à n'importe quelle échelle,
// des métropoles aux hameaux des niveaux les plus élevés.
function questionPopulation(villes) {
  const dedupliquees = [...new Map(villes.map((v) => [v.population, v])).values()]
  if (dedupliquees.length < 4) return null
  const options = dedupliquees.slice(0, 4)
  const bonneReponse = options.reduce((max, v) => (v.population > max.population ? v : max)).nom
  return {
    type: 'population',
    enonce: "Laquelle de ces villes a le plus d'habitants ?",
    options: melanger(options.map((v) => v.nom)),
    bonneReponse,
  }
}

function questionRegionOuDepartement(type, ville, pool) {
  const bonneReponse = ville[type]
  const autres = distracteurs(type, bonneReponse, pool, 3)
  if (autres.length < 3) return null
  const enonce = type === 'region' ? `Dans quelle région se trouve ${ville.nom} ?` : `Dans quel département se trouve ${ville.nom} ?`
  return { type, enonce, options: melanger([bonneReponse, ...autres]), bonneReponse }
}

// QUESTIONS_PAR_PARTIE questions pour une partie à un niveau donné,
// piochées sans répétition de ville dans le palier (voir creerPioche,
// même correctif que pour l'ancienne version de ce jeu). Types
// région/département/population qui tournent (round-robin, pas un
// tirage pur au hasard qui peut sur-représenter un seul type sur 10
// questions).
export function genererQuiz(pool, nbQuestions = QUESTIONS_PAR_PARTIE) {
  const pioche = creerPioche(pool)
  const questions = []
  for (let i = 0; i < nbQuestions; i++) {
    const type = TYPES_QUESTION[i % TYPES_QUESTION.length]
    let question = null
    for (let essai = 0; essai < 4 && !question; essai++) {
      if (type === 'population') {
        question = questionPopulation([pioche.suivant(), pioche.suivant(), pioche.suivant(), pioche.suivant()])
      } else {
        question = questionRegionOuDepartement(type, pioche.suivant(), pool)
      }
    }
    // Repli si le palier est trop homogène pour fournir 3 distracteurs
    // distincts (région/département) -- la comparaison de population
    // reste presque toujours réalisable.
    questions.push(question ?? questionPopulation(melanger(pool).slice(0, 4)) ?? { type: 'region', enonce: '—', options: [], bonneReponse: null })
  }
  return questions
}
