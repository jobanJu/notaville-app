import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo/session'
import { demoFichesVilles, demoQuartiers, demoLieux } from '@/lib/demo/data'
import { trouverVilleFrParCode } from '@/lib/demo/villesFrServeur'
import { statValeur, loyerT2Estime, resteAVivre } from '@/lib/villes/budget'
import { iconeTypeLieu, labelTypeLieu } from '@/lib/lieux'
import { LABEL_DONNEE } from '@/lib/villes/labels'
import ImageVille from '@/components/ImageVille'
import Icone from '@/components/Icone'

// Guide pratique d'une ville : synthèse des données déjà collectées
// ailleurs sur le site (fiche_ville, lieux, quartiers) en une lecture
// utile plutôt qu'une nouvelle base de données -- le "guide" du cahier
// des charges (section 14), en complément des chiffres bruts de
// /villes/[code_insee] et /comparer. Public, sans compte requis, même
// principe que le reste des pages "coeur".
export default async function GuideVillePage({ params }) {
  const { code_insee } = await params
  const demo = await isDemoMode()

  let fiche
  let quartiers = []
  let lieux = []

  if (demo) {
    fiche = demoFichesVilles[code_insee] ?? null
    if (!fiche) {
      const ville = await trouverVilleFrParCode(code_insee)
      if (ville) {
        fiche = {
          code_insee: ville.code_insee,
          nom: ville.nom,
          departement: ville.departement,
          region: ville.region,
          population: ville.population,
          note_habitants: null,
          nb_avis_habitants: 0,
          note_touristes: null,
          nb_avis_touristes: 0,
          stats: [],
        }
      }
    }
    if (fiche) {
      quartiers = demoQuartiers.filter((q) => q.villeCode === code_insee)
      lieux = demoLieux
        .filter((l) => l.villeNom === fiche.nom)
        .sort((a, b) => (b.noteMoyenne ?? 0) - (a.noteMoyenne ?? 0) || (b.nbAvis ?? 0) - (a.nbAvis ?? 0))
        .slice(0, 6)
    }
  } else {
    const supabase = await createClient()
    const { data } = await supabase.rpc('fiche_ville', { p_code_insee: code_insee })
    fiche = data
    if (fiche) {
      const [{ data: quartiersData }, { data: lieuxData }] = await Promise.all([
        supabase.from('quartiers').select('id, nom').eq('ville_code_insee', code_insee).limit(12),
        supabase.rpc('rechercher_lieux', { p_terme: '', p_limite: 6, p_code_insee: code_insee }),
      ])
      quartiers = quartiersData ?? []
      lieux = lieuxData ?? []
    }
  }

  if (!fiche) notFound()

  const loyer = loyerT2Estime(fiche)
  const courses = statValeur(fiche, 'panier_courses')
  const transport = statValeur(fiche, 'abonnement_transport')
  const sport = statValeur(fiche, 'abonnement_sport')
  const biere = statValeur(fiche, 'prix_biere')
  const resto = statValeur(fiche, 'prix_resto')
  const cinema = statValeur(fiche, 'prix_cinema')
  const sorties = [biere, resto, cinema].some((v) => v != null)
    ? (biere ?? 0) + (resto ?? 0) + (cinema ?? 0)
    : null
  const reste = resteAVivre(fiche)
  const aucuneDonneeBudget = loyer == null && courses == null && transport == null && sport == null && sorties == null

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link href="/guides" className="text-xs text-text-soft hover:text-text">← Tous les guides</Link>

      <ImageVille
        nom={fiche.nom}
        departement={fiche.departement}
        className="mt-3 h-40 w-full rounded-2xl"
        messageAbsent="Pas encore de photo pour cette ville."
      />
      <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-ink">
        <Icone nom="livre" className="h-4 w-4" />
        Guide pratique
      </p>
      <h1 className="mt-1 text-2xl font-extrabold">{fiche.nom}</h1>
      <p className="mt-1 text-sm text-text-soft">
        {fiche.departement} · {fiche.region}
        {fiche.population ? ` · ${fiche.population.toLocaleString('fr-FR')} habitants` : ''}
      </p>

      {(fiche.note_habitants != null || fiche.note_touristes != null) && (
        <p className="mt-3 text-sm text-text-soft">
          {fiche.note_habitants != null && `Les habitants la notent ${fiche.note_habitants}/5`}
          {fiche.note_habitants != null && fiche.note_touristes != null && ' -- '}
          {fiche.note_touristes != null && `les touristes ${fiche.note_touristes}/5`}
          {fiche.note_habitants == null && fiche.note_touristes == null ? '' : '.'}
        </p>
      )}

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold">Budget type pour vivre à {fiche.nom}</h2>
        {aucuneDonneeBudget ? (
          <p className="mt-3 text-sm text-text-soft">
            Pas encore assez de contributions « vie quotidienne » pour cette ville. Regarde la fiche ville pour
            voir ce qui est déjà connu, ou sois le premier à répondre à un défi.
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-col gap-2">
              {loyer != null && (
                <LigneBudget label={`Loyer d'un T2${loyer.estime ? ' (estimé)' : ''}`} valeur={loyer.valeur} unite="€/mois" />
              )}
              {courses != null && <LigneBudget label={LABEL_DONNEE.panier_courses} valeur={courses} unite="€" />}
              {transport != null && <LigneBudget label={LABEL_DONNEE.abonnement_transport} valeur={transport} unite="€/mois" />}
              {sport != null && <LigneBudget label={LABEL_DONNEE.abonnement_sport} valeur={sport} unite="€/mois" />}
              {sorties != null && <LigneBudget label="Sorties (bière, resto, ciné, un de chaque)" valeur={sorties} unite="€" />}
            </div>
            {reste != null && (
              <div className="mt-3 rounded-2xl border border-mint bg-mint/10 p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-mint-ink">Reste à vivre estimé (salaire net moyen)</p>
                <p className="mt-1 font-mono text-xl font-bold text-mint-ink">{Math.round(reste).toLocaleString('fr-FR')} €/mois</p>
              </div>
            )}
            <Link href={`/comparer?a=${code_insee}`} className="mt-3 inline-flex items-center gap-1.5 text-xs text-text-soft hover:text-text">
              <Icone nom="balance" className="h-3.5 w-3.5" />
              Comparer {fiche.nom} à une autre ville
            </Link>
          </>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold">Bons plans</h2>
        {lieux.length === 0 ? (
          <p className="mt-3 text-sm text-text-soft">
            Pas encore de lieux recensés pour cette ville. <Link href="/recherche" className="underline">Explore la recherche</Link> pour être le premier à en ajouter.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {lieux.map((l) => (
              <div key={l.id} className="rounded-2xl border border-card-edge bg-card p-3">
                <Icone nom={iconeTypeLieu(l.type)} className="h-4 w-4 text-text-soft" />
                <p className="mt-1.5 text-sm font-semibold">{l.nom}</p>
                <p className="mt-0.5 text-[11px] text-text-soft">{labelTypeLieu(l.type)}</p>
                {(l.note_moyenne ?? l.noteMoyenne) > 0 && (
                  <p className="mt-1 font-mono text-xs text-amber-ink">
                    {l.note_moyenne ?? l.noteMoyenne}/5 ({l.nb_avis ?? l.nbAvis} avis)
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold">Quartiers à découvrir</h2>
        {quartiers.length === 0 ? (
          <p className="mt-3 text-sm text-text-soft">Pas encore de quartiers recensés pour cette ville.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {quartiers.map((q) => (
              <span key={q.id} className="rounded-full border border-card-edge bg-card px-3 py-1.5 text-xs">
                {q.nom}
              </span>
            ))}
          </div>
        )}
        <Link href="/decouvrir" className="mt-3 inline-flex items-center gap-1.5 text-xs text-text-soft hover:text-text">
          <Icone nom="carte" className="h-3.5 w-3.5" />
          Noter un quartier sur la carte
        </Link>
      </div>
    </div>
  )
}

function LigneBudget({ label, valeur, unite }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-card-edge bg-card px-4 py-3">
      <p className="text-sm">{label}</p>
      <p className="font-mono text-sm font-bold text-amber-ink">
        {Number(valeur).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {unite}
      </p>
    </div>
  )
}
