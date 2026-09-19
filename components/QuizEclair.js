'use client'

// Quiz éclair, version à niveaux -- voir supabase/42_quiz_eclair_niveaux.sql
// (progression/quota serveur) et lib/demo/quizEclairNiveaux.js (tirage
// des 10 questions d'une partie). Le suivi "déjà joué aujourd'hui, à
// quel niveau" vit en localStorage, exactement comme /jeux/ville-mystere
// -- le vrai garde-fou contre l'abus reste le plafond anti-abus côté
// serveur (limites_anti_abus, raison quiz_eclair_quotidien).
import { useEffect, useMemo, useState } from 'react'
import { Star, Lock, Trophy, Coins } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { chargerVillesFr } from '@/lib/demo/villesFr'
import { construireNiveaux, genererQuiz, NB_NIVEAUX, QUESTIONS_PAR_PARTIE } from '@/lib/demo/quizEclairNiveaux'

const CLE_STOCKAGE = 'notaville_quiz_eclair'

function dateDuJour() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function chargerJoueAujourdhui() {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE)
    if (!brut) return {}
    const donnees = JSON.parse(brut)
    const aujourdhui = dateDuJour()
    const filtre = {}
    for (const [niveau, val] of Object.entries(donnees)) {
      if (val?.date === aujourdhui) filtre[niveau] = val
    }
    return filtre
  } catch {
    return {}
  }
}

function sauvegarderJoue(joue) {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(joue))
  } catch {
    // localStorage indisponible -- le quiz reste jouable, juste sans
    // mémoire du "déjà joué aujourd'hui" si la page est rechargée.
  }
}

export default function QuizEclair({ niveauDebloqueInitial, niveauReussiInitial, notacoinsInitial, demo, connecte }) {
  const supabase = createClient()
  const [niveauDebloque, setNiveauDebloque] = useState(niveauDebloqueInitial)
  const [niveauReussi, setNiveauReussi] = useState(niveauReussiInitial)
  const [notacoins, setNotacoins] = useState(notacoinsInitial)
  const [niveauChoisi, setNiveauChoisi] = useState(niveauDebloqueInitial)
  const [joueAujourdhui, setJoueAujourdhui] = useState({})
  const [toutesVilles, setToutesVilles] = useState(null)
  const [erreurChargement, setErreurChargement] = useState(null)
  const [erreurDeblocage, setErreurDeblocage] = useState(null)
  const [enCoursDeblocage, setEnCoursDeblocage] = useState(false)
  const [partie, setPartie] = useState(null) // { questions, index, score, reponseChoisie }

  useEffect(() => {
    setJoueAujourdhui(chargerJoueAujourdhui())
    chargerVillesFr()
      .then(setToutesVilles)
      .catch(() => setErreurChargement('Impossible de charger la liste des villes pour le moment.'))
  }, [])

  const niveaux = useMemo(() => (toutesVilles ? construireNiveaux(toutesVilles) : null), [toutesVilles])

  const dejaJoueNiveauChoisi = Boolean(joueAujourdhui[niveauChoisi])
  const peutDebloquer = niveauDebloque < NB_NIVEAUX && niveauReussi >= niveauDebloque && notacoins >= 10

  function commencer() {
    if (!niveaux) return
    const pool = niveaux[niveauChoisi - 1]
    setPartie({ questions: genererQuiz(pool, QUESTIONS_PAR_PARTIE), index: 0, score: 0, reponseChoisie: null })
  }

  function repondre(option) {
    if (!partie || partie.reponseChoisie) return
    const bonne = option === partie.questions[partie.index].bonneReponse
    setPartie((p) => ({ ...p, reponseChoisie: option, score: p.score + (bonne ? 1 : 0) }))
  }

  function suivant() {
    setPartie((p) => {
      if (!p) return p
      const dernierIndex = p.index + 1 >= p.questions.length
      if (dernierIndex) terminerPartie(p.score, p.questions.length)
      return dernierIndex ? { ...p, index: p.index + 1 } : { ...p, index: p.index + 1, reponseChoisie: null }
    })
  }

  async function terminerPartie(score, total) {
    const nouveau = { ...joueAujourdhui, [niveauChoisi]: { date: dateDuJour(), score } }
    setJoueAujourdhui(nouveau)
    sauvegarderJoue(nouveau)

    const parfait = score === total
    if (demo) {
      if (parfait) {
        setNiveauReussi((n) => Math.max(n, niveauChoisi))
        setNotacoins((n) => n + 10)
      }
      return
    }
    if (!connecte) return
    try {
      const { data: gain, error } = await supabase.rpc('valider_quiz_eclair', { p_niveau: niveauChoisi, p_score: score })
      if (error) throw error
      if (parfait) {
        setNiveauReussi((n) => Math.max(n, niveauChoisi))
        if (gain) setNotacoins((n) => n + gain)
      }
    } catch {
      // Le quiz reste jouable même si le crédit échoue -- même principe
      // que crediterNotacoinsJeu ailleurs sur le site.
    }
  }

  async function debloquerNiveau() {
    setErreurDeblocage(null)
    setEnCoursDeblocage(true)
    try {
      if (demo) {
        const nouveau = Math.min(NB_NIVEAUX, niveauDebloque + 1)
        setNiveauDebloque(nouveau)
        setNotacoins((n) => n - 10)
        setNiveauChoisi(nouveau)
        return
      }
      const { data: nouveauNiveau, error } = await supabase.rpc('debloquer_niveau_quiz_eclair')
      if (error) throw error
      setNiveauDebloque(nouveauNiveau)
      setNotacoins((n) => n - 10)
      setNiveauChoisi(nouveauNiveau)
    } catch (e) {
      setErreurDeblocage(e.message ?? "Impossible de débloquer ce niveau pour l'instant.")
    } finally {
      setEnCoursDeblocage(false)
    }
  }

  function retourAuChoixDuNiveau() {
    setPartie(null)
  }

  const partieTerminee = partie && partie.index >= partie.questions.length

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-card-edge bg-card p-4 text-sm">
        <div>
          <p className="font-semibold">Niveau {niveauDebloque} / {NB_NIVEAUX}</p>
          <p className="mt-0.5 text-xs text-text-soft">
            {niveauReussi >= niveauDebloque
              ? 'Niveau actuel réussi -- tu peux débloquer la suite.'
              : 'Réussis ce niveau (10/10) pour pouvoir débloquer le suivant.'}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 font-mono text-amber-ink">
          {notacoins}
          <Coins className="h-3.5 w-3.5" />
        </span>
      </div>

      {niveauDebloque < NB_NIVEAUX && (
        <button
          type="button"
          onClick={debloquerNiveau}
          disabled={!peutDebloquer || enCoursDeblocage}
          className="flex items-center justify-center gap-2 rounded-full border border-amber/50 bg-amber/10 px-4 py-2.5 text-sm font-semibold text-amber-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trophy className="h-4 w-4" />
          {enCoursDeblocage ? 'Déblocage...' : `Débloquer le niveau ${niveauDebloque + 1} (10 Notacoins)`}
        </button>
      )}
      {erreurDeblocage && <p className="text-sm text-coral-ink">{erreurDeblocage}</p>}
      {!connecte && !demo && (
        <p className="text-xs text-text-soft">Connecte-toi pour garder ta progression et gagner des Notacoins.</p>
      )}

      {!partie && (
        <>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: niveauDebloque }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNiveauChoisi(n)}
                className={`relative flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
                  n === niveauChoisi ? 'border-amber bg-amber/10 text-amber-ink' : 'border-card-edge text-text-soft hover:border-amber'
                }`}
              >
                {n}
                {joueAujourdhui[n] && (
                  <span
                    className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-bg ${
                      joueAujourdhui[n].score === QUESTIONS_PAR_PARTIE ? 'bg-mint' : 'bg-coral'
                    }`}
                  />
                )}
              </button>
            ))}
            {niveauDebloque < NB_NIVEAUX && (
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-card-edge text-text-soft">
                <Lock className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          {erreurChargement && <p className="text-sm text-coral-ink">{erreurChargement}</p>}

          {dejaJoueNiveauChoisi ? (
            <div className="rounded-2xl border border-card-edge bg-card p-4 text-center text-sm">
              <p className="font-semibold">
                Niveau {niveauChoisi} déjà joué aujourd&apos;hui -- score : {joueAujourdhui[niveauChoisi].score}/{QUESTIONS_PAR_PARTIE}
              </p>
              <p className="mt-1 text-xs text-text-soft">
                {joueAujourdhui[niveauChoisi].score === QUESTIONS_PAR_PARTIE
                  ? 'Sans-faute ! Reviens demain pour rejouer ce niveau.'
                  : 'Reviens demain pour retenter ce niveau, ou choisis-en un autre déjà débloqué.'}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={commencer}
              disabled={!niveaux}
              className="btn-primary justify-center disabled:opacity-50"
            >
              {niveaux ? `Commencer le niveau ${niveauChoisi}` : 'Chargement des villes...'}
            </button>
          )}
        </>
      )}

      {partie && !partieTerminee && (
        <>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-1 font-mono">
              <Star className="h-3.5 w-3.5 text-amber-ink" fill="currentColor" strokeWidth={0} />
              {partie.score} / {partie.questions.length}
            </span>
            <span className="text-text-soft">Question {partie.index + 1} / {partie.questions.length}</span>
          </div>

          <div className="rounded-2xl border border-card-edge bg-card p-5 text-center">
            <p className="font-display text-lg font-bold">{partie.questions[partie.index].enonce}</p>
          </div>

          <div className="flex flex-col gap-2">
            {partie.questions[partie.index].options.map((o) => {
              const question = partie.questions[partie.index]
              const estLaBonneReponse = o === question.bonneReponse
              const estChoisie = o === partie.reponseChoisie
              let classe = 'border-card-edge hover:border-amber'
              if (partie.reponseChoisie && estLaBonneReponse) classe = 'border-mint bg-mint/10 text-mint-ink'
              else if (partie.reponseChoisie && estChoisie) classe = 'border-coral bg-coral/10 text-coral-ink'
              return (
                <button
                  key={o}
                  type="button"
                  disabled={Boolean(partie.reponseChoisie)}
                  onClick={() => repondre(o)}
                  className={`rounded-full border px-4 py-2.5 text-sm font-semibold disabled:cursor-default ${classe}`}
                >
                  {o}
                </button>
              )
            })}
          </div>

          {partie.reponseChoisie && (
            <button type="button" onClick={suivant} className="btn-primary justify-center">
              {partie.index + 1 >= partie.questions.length ? 'Voir le résultat' : 'Question suivante'}
            </button>
          )}
        </>
      )}

      {partieTerminee && (
        <div className="rounded-2xl border border-card-edge bg-card p-5 text-center">
          <p className={`text-lg font-bold ${partie.score === partie.questions.length ? 'text-mint-ink' : 'text-coral-ink'}`}>
            {partie.score} / {partie.questions.length}
          </p>
          <p className="mt-1 text-sm text-text-soft">
            {partie.score === partie.questions.length
              ? '10 Notacoins gagnés ! Tu peux tenter de débloquer le niveau suivant.'
              : 'Il te faut 10/10 pour gagner des Notacoins. Retente demain, ou choisis un autre niveau débloqué.'}
          </p>
          <button type="button" onClick={retourAuChoixDuNiveau} className="btn-primary mt-4 justify-center">
            Retour aux niveaux
          </button>
        </div>
      )}
    </div>
  )
}
