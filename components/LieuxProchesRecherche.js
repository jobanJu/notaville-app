'use client'

import { useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import { demoLieux } from '@/lib/demo/data'
import { distanceKm, useMaPosition } from '@/lib/geoloc'
import { iconeTypeLieu, labelTypeLieu, prixSymbole } from '@/lib/lieux'
import Icone from '@/components/Icone'
import BoutonSignaler from '@/components/BoutonSignaler'
import AdresseSearch from '@/components/AdresseSearch'

const EXEMPLES = ['bière', 'brunch', 'terrasse', 'musée', 'vue']

function normaliser(texte) {
  return (texte ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

// Remplace la carte de /decouvrir pour la partie "lieux précis" : plus
// besoin de zoomer/déplacer une carte qui prenait toute la page --
// on tape un mot-clé ("bière", "brunch"...) et, dès que la position est
// autorisée, la liste se trie par proximité directement (une seule
// requête, voir rechercher_lieux_proches dans supabase/24_lieux_prix.sql).
// La position est demandée automatiquement à l'arrivée sur la page
// (plutôt qu'un bouton à cliquer en plus) : le navigateur affiche de
// toute façon sa propre demande d'autorisation, rien n'est envoyé
// ailleurs qu'au calcul de distance en local.
export default function LieuxProchesRecherche() {
  const [terme, setTerme] = useState('')
  const [resultats, setResultats] = useState([])
  const [chargement, setChargement] = useState(false)
  const [adresseChoisie, setAdresseChoisie] = useState(null) // { lat, lon, label } | null
  const [afficherAdresse, setAfficherAdresse] = useState(false)
  const { statut: statutPosition, position: positionGPS, erreur: erreurPosition, demander } = useMaPosition()
  const supabase = createClient()

  // Une adresse choisie à la main prend le dessus sur le GPS -- utile
  // sur ordinateur (pas de position) ou pour chercher "autour d'une
  // adresse" sans y être. Revenir au GPS : re-cliquer "Utiliser ma
  // position".
  const position = adresseChoisie ?? positionGPS

  useEffect(() => {
    demander()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let annule = false

    async function chercher() {
      if (terme.trim().length < 2) {
        setResultats([])
        return
      }
      setChargement(true)

      if (isDemoModeClient()) {
        const t = normaliser(terme)
        const trouves = demoLieux.filter(
          (l) =>
            normaliser(l.nom).includes(t) ||
            normaliser(l.description).includes(t) ||
            normaliser(labelTypeLieu(l.type)).includes(t)
        )
        if (!annule) {
          setResultats(trouves)
          setChargement(false)
        }
        return
      }

      const { data } = await supabase.rpc('rechercher_lieux_proches', {
        p_terme: terme,
        p_lat: position?.lat ?? null,
        p_lon: position?.lon ?? null,
        p_rayon_km: 15,
        p_limite: 30,
      })
      if (!annule) {
        setResultats(data ?? [])
        setChargement(false)
      }
    }

    chercher()
    return () => {
      annule = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terme, position])

  const resultatsTries = useMemo(() => {
    const avecDistance = resultats.map((l) => {
      const lat = l.latitude
      const lon = l.longitude
      const distance =
        l.distance ?? (position && lat != null && lon != null ? distanceKm(position.lat, position.lon, lat, lon) : null)
      return { ...l, distance }
    })
    if (position) {
      return [...avecDistance].sort((a, b) => {
        if (a.distance == null) return 1
        if (b.distance == null) return -1
        return a.distance - b.distance
      })
    }
    const note = (l) => l.note_moyenne ?? l.noteMoyenne ?? 0
    const nbAvis = (l) => l.nb_avis ?? l.nbAvis ?? 0
    return [...avecDistance].sort((a, b) => note(b) - note(a) || nbAvis(b) - nbAvis(a))
  }, [resultats, position])

  const rechercheActive = terme.trim().length >= 2

  return (
    <div>
      <input
        value={terme}
        onChange={(e) => setTerme(e.target.value)}
        placeholder="Ex : bière, brunch, vue..."
        className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
      />

      {!rechercheActive && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXEMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setTerme(ex)}
              className="rounded-full border border-card-edge px-3 py-1.5 text-xs text-text-soft hover:border-amber"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-soft">
        <button
          type="button"
          onClick={() => {
            setAdresseChoisie(null)
            setAfficherAdresse(false)
            demander()
          }}
          disabled={statutPosition === 'chargement'}
          className="flex items-center gap-1.5 rounded-full border border-card-edge px-3 py-1.5 font-semibold text-text hover:border-amber disabled:opacity-60"
        >
          <Icone nom="lieu" className="h-3.5 w-3.5" />
          {!adresseChoisie && statutPosition === 'trouve'
            ? 'Position GPS activée'
            : statutPosition === 'chargement'
              ? 'Repérage GPS...'
              : 'Utiliser ma position GPS'}
        </button>

        {adresseChoisie ? (
          <span>Autour de « {adresseChoisie.label} ».</span>
        ) : (
          statutPosition === 'erreur' && <span>{erreurPosition}</span>
        )}

        <button
          type="button"
          onClick={() => setAfficherAdresse((v) => !v)}
          className="font-semibold text-mint-ink hover:underline"
        >
          {adresseChoisie ? "Changer d'adresse" : "...ou chercher autour d'une adresse"}
        </button>
      </div>

      {afficherAdresse && (
        <div className="mt-2">
          <AdresseSearch
            onSelect={(a) => {
              setAdresseChoisie(a)
              setAfficherAdresse(false)
            }}
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {chargement && <p className="py-6 text-center text-sm text-text-soft">Recherche...</p>}

        {!chargement && rechercheActive && resultatsTries.length === 0 && (
          <p className="py-6 text-center text-sm text-text-soft">
            Aucun lieu ne correspond à « {terme} » pour l&apos;instant. Les lieux viennent des contributions de
            la communauté (défi « Ajoute un lieu manquant ») -- il en manque sûrement encore autour de toi.
          </p>
        )}

        {!chargement &&
          resultatsTries.map((l) => {
            const prix = prixSymbole(l.niveau_prix ?? l.niveauPrix)
            return (
              <div key={l.id} className="rounded-2xl border border-card-edge bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Icone nom={iconeTypeLieu(l.type)} className="h-4 w-4 text-text-soft" />
                    {l.nom}
                  </p>
                  {prix && <span className="shrink-0 font-mono text-xs font-bold text-amber-ink">{prix}</span>}
                </div>
                <p className="mt-0.5 text-xs text-text-soft">
                  {labelTypeLieu(l.type)} · {l.quartier_nom ?? l.quartierNom}
                  {(l.ville_nom ?? l.villeNom) ? ` · ${l.ville_nom ?? l.villeNom}` : ''}
                  {l.distance != null ? ` · ${l.distance < 1 ? '< 1 km' : `${Math.round(l.distance)} km`}` : ''}
                </p>
                {l.description && <p className="mt-1.5 text-sm">{l.description}</p>}
                {(l.nb_avis ?? l.nbAvis) > 0 && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-ink">
                    <Star className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
                    {l.note_moyenne ?? l.noteMoyenne}/5 ({l.nb_avis ?? l.nbAvis} avis)
                  </p>
                )}
                <div className="mt-1.5">
                  <BoutonSignaler cibleType="lieu" cibleId={l.id} demo={isDemoModeClient()} />
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
