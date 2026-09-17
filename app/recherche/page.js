'use client'

// Recherche de lieux par mot-clé ("bière", "brunch", "vue"...), triable
// par note ou par distance à la position live du visiteur. Page
// publique, sans compte requis (même principe que /villes, /comparer).
// Les résultats viennent des mêmes `lieux` que LieuxRecommandes
// (contribués via le défi "Ajoute un lieu manquant") -- ce n'est donc
// pas encore exhaustif, juste ce que la communauté a déjà renseigné.
import { useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import { demoLieux } from '@/lib/demo/data'
import { distanceKm, useMaPosition } from '@/lib/geoloc'
import { iconeTypeLieu, labelTypeLieu } from '@/lib/lieux'
import Icone from '@/components/Icone'
import BoutonSignaler from '@/components/BoutonSignaler'

const EXEMPLES = ['bière', 'terrasse', 'brunch', 'musée', 'vue']

function normaliser(texte) {
  return (texte ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export default function RecherchePage() {
  const [terme, setTerme] = useState('')
  const [resultats, setResultats] = useState([])
  const [chargement, setChargement] = useState(false)
  const [tri, setTri] = useState('note') // 'note' | 'distance'
  const { statut: statutPosition, position, erreur: erreurPosition, demander } = useMaPosition()
  const supabase = createClient()

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

      const { data } = await supabase.rpc('rechercher_lieux', { p_terme: terme, p_limite: 30 })
      if (!annule) {
        setResultats(data ?? [])
        setChargement(false)
      }
    }

    chercher()
    return () => {
      annule = true
    }
  }, [terme])

  const resultatsTries = useMemo(() => {
    const avecDistance = resultats.map((l) => {
      const lat = l.latitude
      const lon = l.longitude
      const distance = position && lat != null && lon != null ? distanceKm(position.lat, position.lon, lat, lon) : null
      return { ...l, distance }
    })
    const note = (l) => l.note_moyenne ?? l.noteMoyenne ?? 0
    const nbAvis = (l) => l.nb_avis ?? l.nbAvis ?? 0

    if (tri === 'distance' && position) {
      return [...avecDistance].sort((a, b) => {
        if (a.distance == null) return 1
        if (b.distance == null) return -1
        return a.distance - b.distance
      })
    }
    return [...avecDistance].sort((a, b) => note(b) - note(a) || nbAvis(b) - nbAvis(a))
  }, [resultats, position, tri])

  const rechercheActive = terme.trim().length >= 2

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold">Recherche</h1>
      <p className="mt-1 text-sm text-text-soft">
        Un plat, une boisson, une ambiance... tape un mot-clé pour trouver les lieux les mieux notés.
      </p>

      <input
        value={terme}
        onChange={(e) => setTerme(e.target.value)}
        placeholder="Ex : bière, brunch, vue..."
        className="mt-6 w-full rounded-full border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
      />

      {!rechercheActive && (
        <div className="mt-4 flex flex-wrap gap-2">
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

      {rechercheActive && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={demander}
            disabled={statutPosition === 'chargement' || statutPosition === 'trouve'}
            className="flex items-center gap-1.5 rounded-full border border-card-edge px-3 py-1.5 text-xs hover:border-amber disabled:opacity-60"
          >
            <Icone nom="lieu" className="h-3.5 w-3.5" />
            {statutPosition === 'trouve'
              ? 'Position activée'
              : statutPosition === 'chargement'
                ? 'Repérage...'
                : 'Utiliser ma position'}
          </button>

          {position && (
            <div className="flex gap-0.5 rounded-full border border-card-edge p-0.5 text-xs">
              <button
                onClick={() => setTri('note')}
                className={`rounded-full px-2.5 py-1 ${tri === 'note' ? 'bg-amber font-semibold text-[#2A0F0F]' : 'text-text-soft'}`}
              >
                Mieux notés
              </button>
              <button
                onClick={() => setTri('distance')}
                className={`rounded-full px-2.5 py-1 ${tri === 'distance' ? 'bg-amber font-semibold text-[#2A0F0F]' : 'text-text-soft'}`}
              >
                Plus proches
              </button>
            </div>
          )}
        </div>
      )}

      {statutPosition === 'erreur' && <p className="mt-2 text-xs text-coral-ink">{erreurPosition}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {chargement && <p className="py-6 text-center text-sm text-text-soft">Recherche...</p>}

        {!chargement && rechercheActive && resultatsTries.length === 0 && (
          <p className="py-6 text-center text-sm text-text-soft">
            Aucun lieu ne correspond à « {terme} » pour l&apos;instant. Les lieux viennent des contributions
            de la communauté (défi « Ajoute un lieu manquant ») — il en manque sûrement encore beaucoup.
          </p>
        )}

        {!chargement &&
          resultatsTries.map((l) => (
            <div key={l.id} className="rounded-2xl border border-card-edge bg-card p-4">
              <p className="flex items-center gap-1.5 font-semibold">
                <Icone nom={iconeTypeLieu(l.type)} className="h-4 w-4 text-text-soft" />
                {l.nom}
              </p>
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
          ))}
      </div>
    </div>
  )
}
