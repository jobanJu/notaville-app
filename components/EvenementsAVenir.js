import Link from 'next/link'
import Icone from '@/components/Icone'
import { iconeTypeEvenement, labelTypeEvenement } from '@/lib/evenements'

// Version compacte (liste courte, pas de grille) pour la page ville --
// le vrai calendrier mensuel complet vit sur /evenements
// (components/CalendrierEvenements.js). Reçoit les évènements déjà
// filtrés/triés en props (chargés côté serveur avec le reste de la
// fiche ville).
export default function EvenementsAVenir({ evenements, codeInsee, nomVille }) {
  if (!evenements || evenements.length === 0) {
    return (
      <p className="mt-3 text-sm text-text-soft">
        Aucun évènement à venir connu pour {nomVille} pour l&apos;instant.
      </p>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {evenements.map((e) => (
        <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-card-edge bg-card p-3.5">
          <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-amber/10 text-center">
            <span className="font-mono text-[10px] uppercase text-amber-ink">
              {new Date(e.date_debut).toLocaleDateString('fr-FR', { month: 'short' })}
            </span>
            <span className="font-mono text-sm font-bold leading-none text-amber-ink">
              {new Date(e.date_debut).getDate()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{e.titre}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-text-soft">
              <Icone nom={iconeTypeEvenement(e.type_evenement)} className="h-3 w-3" />
              {labelTypeEvenement(e.type_evenement)}
              {e.lieu ? ` · ${e.lieu}` : ''}
            </p>
          </div>
        </div>
      ))}
      <Link
        href={`/evenements?ville=${codeInsee}`}
        className="mt-1 flex items-center justify-center gap-2 rounded-full border border-card-edge px-4 py-2.5 text-sm hover:border-amber"
      >
        Voir le calendrier complet de {nomVille}
      </Link>
    </div>
  )
}
