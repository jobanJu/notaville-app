import Link from 'next/link'
import { GUIDES_THEMATIQUES } from '@/lib/guides'
import GuideVilleSearch from '@/components/GuideVilleSearch'
import Icone from '@/components/Icone'

// Hub "Guides" du cahier des charges (comparateurs/guides/conseils,
// section 14) : public, sans compte requis, comme /villes et /comparer
// -- volontairement hors de pagesProtegees (voir README, "Règles non
// négociables"). Deux formats : un guide pratique par ville, généré à
// partir des données déjà collectées (budget, bons plans, quartiers),
// et des guides thématiques à contenu fixe (lib/guides.js).
export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-ink">
        <Icone nom="livre" className="h-4 w-4" />
        Guides
      </p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Des conseils, pas juste des chiffres</h1>
      <p className="mt-2 text-sm text-text-soft">
        Un guide pratique pour chaque ville du site, et des conseils plus généraux pour bien préparer une installation.
      </p>

      <div className="mt-6">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-soft">Guide d&apos;une ville</p>
        <GuideVilleSearch />
        <p className="mt-1.5 text-[11px] text-text-soft">
          Budget type, bons plans et quartiers à découvrir, à partir des données déjà collectées sur la ville.
        </p>
      </div>

      <div className="mt-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-soft">Guides pratiques</p>
        <div className="flex flex-col gap-3">
          {GUIDES_THEMATIQUES.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="flex items-start gap-3 rounded-2xl border border-card-edge bg-card p-4 transition hover:border-amber hover:shadow-sm"
            >
              <Icone nom={g.icone} className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-ink" />
              <div>
                <p className="font-display font-bold">{g.titre}</p>
                <p className="mt-1 text-xs text-text-soft">{g.resume}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
