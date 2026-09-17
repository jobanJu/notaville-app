import Link from 'next/link'
import { notFound } from 'next/navigation'
import { trouverGuideThematique } from '@/lib/guides'
import Icone from '@/components/Icone'

// Article de conseils, public et sans compte requis -- même principe
// que les fiches ville et le comparateur (cahier des charges, section
// 14). Contenu fixe (lib/guides.js), pas de données à charger.
export default async function GuideThematiquePage({ params }) {
  const { slug } = await params
  const guide = trouverGuideThematique(slug)
  if (!guide) notFound()

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/guides" className="text-xs text-text-soft hover:text-text">← Tous les guides</Link>

      <div className="mt-3 flex items-center gap-2">
        <Icone nom={guide.icone} className="h-6 w-6 text-amber-ink" />
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-ink">Guide pratique</p>
      </div>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{guide.titre}</h1>
      <p className="mt-2 text-sm text-text-soft">{guide.resume}</p>

      <div className="mt-8 flex flex-col gap-6">
        {guide.sections.map((s) => (
          <div key={s.titre}>
            <h2 className="font-display text-lg font-bold">{s.titre}</h2>
            {s.paragraphes.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-text-soft">{p}</p>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-2 rounded-2xl border border-card-edge bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">Envie de mettre ça en pratique sur une ville précise ?</p>
        <Link href="/comparer" className="btn-primary justify-center text-sm">
          Ouvrir le comparateur
        </Link>
      </div>
    </div>
  )
}
