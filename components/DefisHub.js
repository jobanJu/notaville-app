'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Icone from '@/components/Icone'

const LABEL_DIFFICULTE = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' }
const COULEUR_DIFFICULTE = { facile: 'text-mint-ink', moyen: 'text-amber-ink', difficile: 'text-coral-ink' }

function tempsRestant(dateFin) {
  if (!dateFin) return null
  const ms = new Date(dateFin).getTime() - Date.now()
  if (ms <= 0) return 'Terminé'
  const jours = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (jours >= 1) return `${jours} j restant${jours > 1 ? 's' : ''}`
  const heures = Math.floor(ms / (1000 * 60 * 60))
  return `${Math.max(1, heures)} h restante${heures > 1 ? 's' : ''}`
}

function DefiCard({ d, categorieNom, participation, nbParticipants }) {
  return (
    <Link
      href={`/defis/${d.id}`}
      className="flex items-center gap-3 rounded-2xl border border-card-edge bg-card p-4 transition hover:border-amber"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-card-edge text-amber-ink">
        {d.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.image_url} alt="" className="h-full w-full rounded-xl object-cover" />
        ) : (
          <Icone nom="trophee" className="h-5 w-5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{d.titre}</p>
        <p className="mt-0.5 truncate text-xs text-text-soft">{d.description}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
          <span className="rounded-full border border-card-edge px-2 py-0.5 uppercase tracking-wide text-text-soft">
            {categorieNom}
          </span>
          <span className={COULEUR_DIFFICULTE[d.difficulte] ?? 'text-text-soft'}>
            {LABEL_DIFFICULTE[d.difficulte] ?? 'Facile'}
          </span>
          {nbParticipants > 0 && <span className="text-text-soft">{nbParticipants} participants</span>}
          {d.date_fin && <span className="text-coral-ink">{tempsRestant(d.date_fin)}</span>}
        </div>
      </div>
      <span className="shrink-0 font-mono text-xs text-amber-ink">
        {participation?.statut === 'terminee'
          ? 'Terminé ✓'
          : participation
            ? `${participation.etape_courante}${d.palier_cible ? `/${d.palier_cible}` : ''}`
            : 'Voir'}
      </span>
    </Link>
  )
}

export default function DefisHub({ categories, defis, participations, compteurs, villeOrigineCode }) {
  const [filtre, setFiltre] = useState('tous')

  const categorieParId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const participationParDefi = useMemo(() => new Map(participations.map((p) => [p.defi_id, p])), [participations])
  const participantsParDefi = useMemo(() => new Map(compteurs.map((c) => [c.defi_id, c.nb_participants])), [compteurs])

  const defiDuJour = defis.find((d) => d.portee_temporelle === 'jour')
  const proches = defis.filter((d) => d.ville_code_insee && d.ville_code_insee === villeOrigineCode).slice(0, 5)
  const populaires = [...defis]
    .sort((a, b) => (participantsParDefi.get(b.id) ?? 0) - (participantsParDefi.get(a.id) ?? 0))
    .slice(0, 5)
  const enCours = defis.filter((d) => participationParDefi.get(d.id)?.statut === 'en_cours')
  const termines = defis.filter((d) => participationParDefi.get(d.id)?.statut === 'terminee')

  const categoriesCoeur = categories.filter((c) => c.type !== 'partenaire' && c.type !== 'jeu')
  const categoriesSecondaires = categories.filter((c) => c.type === 'partenaire' || c.type === 'jeu')
  const categoriesOrdre = [...categoriesCoeur, ...categoriesSecondaires]

  const defisFiltres = filtre === 'tous' ? defis : defis.filter((d) => categorieParId.get(d.categorie_id)?.cle === filtre)

  function ligne(titre, liste, icone = null) {
    if (liste.length === 0) return null
    return (
      <div className="mt-8">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-bold">
          {icone && <Icone nom={icone} className="h-4 w-4 text-coral-ink" />}
          {titre}
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {liste.map((d) => (
            <DefiCard
              key={d.id}
              d={d}
              categorieNom={categorieParId.get(d.categorie_id)?.nom}
              participation={participationParDefi.get(d.id)}
              nbParticipants={participantsParDefi.get(d.id) ?? 0}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {defiDuJour && ligne('Défi du jour', [defiDuJour], 'flamme')}
      {ligne('Près de chez toi', proches)}
      {ligne('Populaires', populaires)}
      {ligne('En cours', enCours)}
      {ligne('Terminés', termines)}

      <div className="mt-10 border-t border-card-edge pt-6">
        <h2 className="font-display text-lg font-bold">Tous les défis</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setFiltre('tous')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filtre === 'tous' ? 'bg-gradient-to-r from-coral to-amber text-[#2A0F0F]' : 'border border-card-edge text-text-soft'
            }`}
          >
            Tous
          </button>
          {categoriesOrdre.map((c) => (
            <button
              key={c.id}
              onClick={() => setFiltre(c.cle)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                filtre === c.cle ? 'bg-gradient-to-r from-coral to-amber text-[#2A0F0F]' : 'border border-card-edge text-text-soft'
              }`}
            >
              <Icone nom={c.icone} className="h-3.5 w-3.5" />
              {c.nom}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {defisFiltres.length === 0 && (
            <p className="py-6 text-center text-sm text-text-soft">Aucun défi dans cette catégorie pour le moment.</p>
          )}
          {defisFiltres.map((d) => (
            <DefiCard
              key={d.id}
              d={d}
              categorieNom={categorieParId.get(d.categorie_id)?.nom}
              participation={participationParDefi.get(d.id)}
              nbParticipants={participantsParDefi.get(d.id) ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
