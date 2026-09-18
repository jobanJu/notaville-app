'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import { demoEvenements } from '@/lib/demo/data'
import { iconeTypeEvenement, labelTypeEvenement } from '@/lib/evenements'
import Icone from '@/components/Icone'

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function cleJour(date) {
  return date.toISOString().slice(0, 10)
}

// Vrai calendrier mensuel (grille) des évènements d'une ville --
// clic sur un jour pour voir le détail. Se recharge tout seul à chaque
// changement de mois ou de ville (voir evenements, migration 30 :
// lecture publique, écriture réservée à l'admin).
export default function CalendrierEvenements({ codeInsee, nomVille, demo = false }) {
  const [mois, setMois] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [evenements, setEvenements] = useState([])
  const [chargement, setChargement] = useState(true)
  const [jourSelectionne, setJourSelectionne] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    if (!codeInsee) return
    setChargement(true)
    setJourSelectionne(null)

    const debut = new Date(mois.getFullYear(), mois.getMonth(), 1)
    const fin = new Date(mois.getFullYear(), mois.getMonth() + 1, 1)

    if (demo || isDemoModeClient()) {
      const liste = (demoEvenements[codeInsee] ?? []).filter((e) => {
        const d = new Date(e.date_debut)
        return d >= debut && d < fin
      })
      setEvenements(liste)
      setChargement(false)
      return
    }

    let annule = false
    supabase
      .from('evenements')
      .select('id, titre, description, lieu, type_evenement, date_debut, date_fin, lien_externe')
      .eq('ville_code_insee', codeInsee)
      .gte('date_debut', debut.toISOString())
      .lt('date_debut', fin.toISOString())
      .order('date_debut')
      .then(({ data }) => {
        if (!annule) {
          setEvenements(data ?? [])
          setChargement(false)
        }
      })
    return () => {
      annule = true
    }
  }, [codeInsee, mois])

  const parJour = new Map()
  for (const e of evenements) {
    const cle = cleJour(new Date(e.date_debut))
    if (!parJour.has(cle)) parJour.set(cle, [])
    parJour.get(cle).push(e)
  }

  const premierJourMois = new Date(mois.getFullYear(), mois.getMonth(), 1)
  const nbJoursMois = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate()
  // Lundi = 0 ... Dimanche = 6 (convention française).
  const decalage = (premierJourMois.getDay() + 6) % 7

  const cellules = []
  for (let i = 0; i < decalage; i++) cellules.push(null)
  for (let j = 1; j <= nbJoursMois; j++) cellules.push(j)

  const aujourdhui = cleJour(new Date())
  const evenementsJour = jourSelectionne ? (parJour.get(jourSelectionne) ?? []) : evenements

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMois((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-card-edge hover:border-amber"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-sm font-bold">
          {MOIS[mois.getMonth()]} {mois.getFullYear()}
        </p>
        <button
          type="button"
          onClick={() => setMois((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-card-edge hover:border-amber"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-text-soft">
        {JOURS.map((j, i) => (
          <div key={i} className="py-1">{j}</div>
        ))}
        {cellules.map((jour, i) => {
          if (jour == null) return <div key={i} />
          const date = new Date(mois.getFullYear(), mois.getMonth(), jour)
          const cle = cleJour(date)
          const evenementsCe = parJour.get(cle) ?? []
          const estAujourdhui = cle === aujourdhui
          const estSelectionne = cle === jourSelectionne
          return (
            <button
              key={i}
              type="button"
              onClick={() => setJourSelectionne(estSelectionne ? null : cle)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm ${
                estSelectionne
                  ? 'bg-amber text-bg font-bold'
                  : estAujourdhui
                    ? 'border border-amber text-amber-ink font-semibold'
                    : 'hover:bg-bg-soft'
              }`}
            >
              {jour}
              {evenementsCe.length > 0 && (
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${estSelectionne ? 'bg-bg' : 'bg-amber'}`} />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
          {jourSelectionne
            ? new Date(jourSelectionne).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
            : `Tous les évènements de ${MOIS[mois.getMonth()]}`}
        </p>

        {chargement ? (
          <p className="mt-3 text-sm text-text-soft">Chargement...</p>
        ) : evenementsJour.length === 0 ? (
          <p className="mt-3 text-sm text-text-soft">
            {jourSelectionne ? 'Aucun évènement ce jour-là.' : `Aucun évènement connu à ${nomVille} ce mois-ci.`}
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {evenementsJour.map((e) => (
              <div key={e.id} className="rounded-2xl border border-card-edge bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber/10 text-amber-ink">
                    <Icone nom={iconeTypeEvenement(e.type_evenement)} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{e.titre}</p>
                    <p className="mt-0.5 text-xs text-text-soft">
                      {labelTypeEvenement(e.type_evenement)}
                      {e.lieu ? ` · ${e.lieu}` : ''} ·{' '}
                      {new Date(e.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                    {e.description && <p className="mt-1.5 text-sm text-text-soft">{e.description}</p>}
                    {e.lien_externe && (
                      <a
                        href={e.lien_externe}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-block text-xs text-amber-ink hover:underline"
                      >
                        Plus d&apos;infos
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
