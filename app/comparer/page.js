'use client'

// Comparateur de villes ("Lille VS Perpignan" dans la vision du
// produit) : deux fiches ville côte à côte, avec un "reste à vivre"
// estimé pour rendre la comparaison concrète plutôt qu'une liste de
// chiffres. S'appuie sur la même fonction publique fiche_ville() que
// /villes/[code_insee] -- aucune nouvelle table.
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Star } from 'lucide-react'
import CitySearch from '@/components/CitySearch'
import ImageVille from '@/components/ImageVille'
import Icone from '@/components/Icone'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import { demoFichesVilles, demoLieux } from '@/lib/demo/data'
import { chargerVillesFr } from '@/lib/demo/villesFr'
import { chargerStatsNord } from '@/lib/demo/villesNordStats'
import { LABEL_DONNEE, LABEL_PROVENANCE } from '@/lib/villes/labels'
import { iconeTypeLieu, labelTypeLieu, normaliser } from '@/lib/lieux'
import { SURFACE_T2, PLUS_HAUT_EST_MIEUX, statValeur, statProvenance, loyerT2Estime, resteAVivre } from '@/lib/villes/budget'

function CarteVille({ label, ville, fiche, chargement, onChange }) {
  return (
    <div className="flex-1">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-soft">{label}</p>
      <CitySearch key={ville?.code_insee ?? 'vide'} onSelect={onChange} valeurInitiale={ville} />
      {chargement && <p className="mt-3 text-center text-xs text-text-soft">Chargement...</p>}
      {fiche && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-card-edge bg-card text-center">
          <ImageVille nom={fiche.nom} departement={fiche.departement} className="h-24 w-full" />
          <div className="p-4">
          <p className="font-display text-lg font-bold">{fiche.nom}</p>
          <p className="text-xs text-text-soft">
            {fiche.departement} · {fiche.population ? `${fiche.population.toLocaleString('fr-FR')} hab.` : '—'}
          </p>
          <div className="mt-2 flex justify-center gap-4 text-xs text-text-soft">
            <span className="flex items-center gap-1">
              <Icone nom="maison" className="h-3.5 w-3.5" /> {fiche.note_habitants ?? '—'}/5
            </span>
            <span className="flex items-center gap-1">
              <Icone nom="valise" className="h-3.5 w-3.5" /> {fiche.note_touristes ?? '—'}/5
            </span>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Résultats de la recherche par mot-clé (/recherche) pour une seule
// ville, réutilisés ici pour comparer "le meilleur bar à bière" entre
// les deux villes plutôt que d'obliger à ouvrir deux onglets /recherche.
function ColonneLieux({ nomVille, resultats }) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-text-soft">{nomVille}</p>
      {resultats.length === 0 ? (
        <p className="rounded-2xl border border-card-edge bg-card p-4 text-center text-xs text-text-soft">
          Rien trouvé pour ce mot-clé à {nomVille} pour l&apos;instant.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {resultats.map((l) => (
            <div key={l.id} className="rounded-2xl border border-card-edge bg-card p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Icone nom={iconeTypeLieu(l.type)} className="h-3.5 w-3.5 text-text-soft" />
                {l.nom}
              </p>
              <p className="mt-0.5 text-xs text-text-soft">{labelTypeLieu(l.type)}</p>
              {(l.nb_avis ?? l.nbAvis ?? 0) > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-ink">
                  <Star className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                  {l.note_moyenne ?? l.noteMoyenne}/5 ({l.nb_avis ?? l.nbAvis} avis)
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ComparerContenu() {
  const searchParams = useSearchParams()
  const [villeA, setVilleA] = useState(null)
  const [villeB, setVilleB] = useState(null)
  const [ficheA, setFicheA] = useState(null)
  const [ficheB, setFicheB] = useState(null)
  const [chargeA, setChargeA] = useState(false)
  const [chargeB, setChargeB] = useState(false)
  const [termeLieu, setTermeLieu] = useState('')
  const [resultatsA, setResultatsA] = useState([])
  const [resultatsB, setResultatsB] = useState([])
  const [chargementLieux, setChargementLieux] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const codeA = searchParams.get('a')
    if (!codeA) return
    if (isDemoModeClient()) {
      chargerVillesFr().then((villes) => {
        const v = villes.find((x) => x.code_insee === codeA)
        if (v) selectionner('A', v)
      })
      return
    }
    supabase
      .from('villes')
      .select('code_insee, nom, departement, population')
      .eq('code_insee', codeA)
      .single()
      .then(({ data }) => {
        if (data) selectionner('A', data)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // En vrai Supabase, fiche_ville() ne renvoie jamais null pour une ville
  // qui existe : au minimum nom/departement/population/notes, stats: [].
  // Le mode démo doit se comporter pareil -- sinon une ville sans "vie
  // quotidienne" simulée n'affichait même pas sa carte de base, alors
  // qu'on a bien son nom et sa population.
  async function chargerFiche(ville) {
    if (isDemoModeClient()) {
      if (demoFichesVilles[ville.code_insee]) return demoFichesVilles[ville.code_insee]

      // Les ~650 communes du Nord ont des stats générées à partir de la
      // population (voir lib/demo/villesNordStats.js) -- chargées à la
      // demande, pas embarquées dans lib/demo/data.js pour ne pas
      // alourdir chaque page du bundle avec des données qui ne servent
      // qu'au comparateur.
      if (ville.departement === 'Nord') {
        const statsNord = await chargerStatsNord()
        const stats = statsNord.get(ville.code_insee)
        if (stats) {
          return {
            code_insee: ville.code_insee,
            nom: ville.nom,
            departement: ville.departement,
            region: ville.region ?? 'Hauts-de-France',
            population: ville.population,
            note_habitants: null,
            nb_avis_habitants: 0,
            note_touristes: null,
            nb_avis_touristes: 0,
            stats,
            derniere_maj: new Date().toISOString(),
          }
        }
      }

      return {
        code_insee: ville.code_insee,
        nom: ville.nom,
        departement: ville.departement,
        region: ville.region ?? null,
        population: ville.population,
        note_habitants: null,
        nb_avis_habitants: 0,
        note_touristes: null,
        nb_avis_touristes: 0,
        stats: [],
        derniere_maj: new Date().toISOString(),
      }
    }
    const { data } = await supabase.rpc('fiche_ville', { p_code_insee: ville.code_insee })
    return data
  }

  async function selectionner(slot, ville) {
    if (slot === 'A') {
      setVilleA(ville)
      setChargeA(true)
      setFicheA(await chargerFiche(ville))
      setChargeA(false)
    } else {
      setVilleB(ville)
      setChargeB(true)
      setFicheB(await chargerFiche(ville))
      setChargeB(false)
    }
  }

  // Recherche par mot-clé scopée à chaque ville comparée (même RPC que
  // /recherche, avec un p_code_insee en plus côté vrai Supabase). Pas de
  // géolocalisation ici -- comparer deux villes n'a pas besoin de
  // distance, juste du meilleur résultat sur place.
  useEffect(() => {
    let annule = false

    async function chercher() {
      if (termeLieu.trim().length < 2 || !ficheA || !ficheB) {
        setResultatsA([])
        setResultatsB([])
        return
      }
      setChargementLieux(true)

      if (isDemoModeClient()) {
        const t = normaliser(termeLieu)
        const filtrerPourVille = (nomVille) =>
          demoLieux
            .filter((l) => l.villeNom === nomVille)
            .filter(
              (l) =>
                normaliser(l.nom).includes(t) ||
                normaliser(l.description).includes(t) ||
                normaliser(labelTypeLieu(l.type)).includes(t)
            )
            .sort((a, b) => (b.noteMoyenne ?? 0) - (a.noteMoyenne ?? 0))
            .slice(0, 3)
        if (!annule) {
          setResultatsA(filtrerPourVille(ficheA.nom))
          setResultatsB(filtrerPourVille(ficheB.nom))
          setChargementLieux(false)
        }
        return
      }

      const [ra, rb] = await Promise.all([
        supabase.rpc('rechercher_lieux', { p_terme: termeLieu, p_limite: 3, p_code_insee: ficheA.code_insee }),
        supabase.rpc('rechercher_lieux', { p_terme: termeLieu, p_limite: 3, p_code_insee: ficheB.code_insee }),
      ])
      if (!annule) {
        setResultatsA(ra.data ?? [])
        setResultatsB(rb.data ?? [])
        setChargementLieux(false)
      }
    }

    chercher()
    return () => {
      annule = true
    }
  }, [termeLieu, ficheA, ficheB])

  const cles = Array.from(
    new Set([...(ficheA?.stats ?? []), ...(ficheB?.stats ?? [])].map((s) => s.donnee_cle))
  )

  const resteA = ficheA ? resteAVivre(ficheA) : null
  const resteB = ficheB ? resteAVivre(ficheB) : null
  const resteIncomplet = ficheA && ficheB && cles.length > 0 && (resteA == null || resteB == null)

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-center text-2xl font-extrabold">Comparateur de villes</h1>
      <p className="mt-1 text-center text-sm text-text-soft">
        Coût de la vie, notes, population — côte à côte, sur les 34 969 communes de France. (Mode démo :
        toutes les communes du Nord (59), plus Paris, Lyon, Pierrelatte, Le Cheylard, Châtillon-en-Bazois,
        Gordes et Rocamadour, ont des données &laquo;&nbsp;vie quotidienne&nbsp;&raquo; simulées ; les
        autres villes n&apos;affichent que notes et population.)
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <CarteVille label="Ville A" ville={villeA} fiche={ficheA} chargement={chargeA} onChange={(v) => selectionner('A', v)} />
        <CarteVille label="Ville B" ville={villeB} fiche={ficheB} chargement={chargeB} onChange={(v) => selectionner('B', v)} />
      </div>

      {ficheA && ficheB && (
        <div className="mt-8">
          <h2 className="text-center text-lg font-bold">Comparer un mot-clé</h2>
          <p className="mx-auto mt-1 max-w-md text-center text-xs text-text-soft">
            Bière, brunch, musée... tape un mot-clé pour voir le lieu le mieux noté dans chaque ville.
          </p>
          <input
            value={termeLieu}
            onChange={(e) => setTermeLieu(e.target.value)}
            placeholder="Ex : bière, brunch, vue..."
            className="mx-auto mt-3 block w-full max-w-xs rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-center text-sm outline-none focus:border-amber"
          />
          {termeLieu.trim().length >= 2 && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {chargementLieux ? (
                <p className="text-center text-xs text-text-soft sm:col-span-2">Recherche...</p>
              ) : (
                <>
                  <ColonneLieux nomVille={ficheA.nom} resultats={resultatsA} />
                  <ColonneLieux nomVille={ficheB.nom} resultats={resultatsB} />
                </>
              )}
            </div>
          )}

          <div className="mt-8 border-t border-card-edge pt-8">
          {cles.length === 0 ? (
            <p className="text-center text-sm text-text-soft">
              Pas encore de données &laquo;&nbsp;Vie quotidienne&nbsp;&raquo; pour ces deux villes. Complète des défis pour changer ça !
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-card-edge">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card text-xs uppercase tracking-wide text-text-soft">
                    <th className="p-3 text-left font-semibold"></th>
                    <th className="p-3 text-right font-semibold">{ficheA.nom}</th>
                    <th className="p-3 text-right font-semibold">{ficheB.nom}</th>
                  </tr>
                </thead>
                <tbody>
                  {cles.map((cle) => {
                    const a = statValeur(ficheA, cle)
                    const b = statValeur(ficheB, cle)
                    const provA = statProvenance(ficheA, cle)
                    const provB = statProvenance(ficheB, cle)
                    // On ne désigne un "gagnant" que si les deux villes ont une
                    // valeur ET la même fiabilité de source (officiel vs.
                    // communauté) -- comparer un chiffre INSEE à une moyenne
                    // déclarée par une poignée d'utilisateurs n'a rien d'équitable.
                    const comparable = a != null && b != null && a !== b && provA === provB
                    const aGagne = comparable && (PLUS_HAUT_EST_MIEUX.has(cle) ? a > b : a < b)
                    const meilleurA = comparable && aGagne
                    const meilleurB = comparable && !aGagne
                    return (
                      <tr key={cle} className="border-t border-card-edge">
                        <td className="p-3 text-text-soft">{LABEL_DONNEE[cle] ?? cle}</td>
                        <td className={`p-3 text-right font-mono ${meilleurA ? 'text-mint-ink' : ''}`}>
                          {a != null ? `${a.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €` : '—'}
                          {provA && (
                            <span className={`ml-1.5 inline-block rounded-full border px-1.5 py-0 text-[9px] uppercase ${LABEL_PROVENANCE[provA]?.classe ?? ''}`}>
                              {LABEL_PROVENANCE[provA]?.texte ?? provA}
                            </span>
                          )}
                        </td>
                        <td className={`p-3 text-right font-mono ${meilleurB ? 'text-mint-ink' : ''}`}>
                          {b != null ? `${b.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €` : '—'}
                          {provB && (
                            <span className={`ml-1.5 inline-block rounded-full border px-1.5 py-0 text-[9px] uppercase ${LABEL_PROVENANCE[provB]?.classe ?? ''}`}>
                              {LABEL_PROVENANCE[provB]?.texte ?? provB}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {resteA != null && resteB != null && (
            <div className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-4 text-center">
              <p className="text-sm">
                <Icone nom="trophee" className="mb-0.5 inline-block h-4 w-4 text-amber-ink align-middle" />{' '}
                <strong>
                  {resteA > resteB ? ficheA.nom : ficheB.nom}
                </strong>{' '}
                laisserait environ{' '}
                <strong>{Math.abs(resteA - resteB).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</strong> de
                plus par mois, à salaire et loyer moyens.
              </p>
              <p className="mt-2 text-xs text-text-soft">
                Estimation : salaire net moyen − loyer moyen d&apos;un T2 (donnée déclarée quand elle
                existe, sinon estimée à partir du loyer au m² × {SURFACE_T2} m²) − panier de courses moyen
                − abonnement transport moyen. Chaque moyenne communautaire n&apos;est publiée qu&apos;à
                partir de 5 contributions minimum. Basé sur des données déclarées ou officielles — pas une
                prévision pour ta situation personnelle.
              </p>
            </div>
          )}

          {resteIncomplet && (
            <p className="mt-6 text-center text-xs text-text-soft">
              Reste à vivre non calculé : il manque au moins une donnée (salaire, loyer, courses ou
              transport) pour une des deux villes — pas de quoi comparer équitablement.
            </p>
          )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ComparerPage() {
  return (
    <Suspense fallback={null}>
      <ComparerContenu />
    </Suspense>
  )
}
