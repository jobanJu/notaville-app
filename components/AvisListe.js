import { Star } from 'lucide-react'

// Liste d'avis individuels (pseudo, note, commentaire, tags) pour une
// ville -- à la différence des cartes "note_habitants/note_touristes"
// de la page ville, qui ne montrent qu'une moyenne, ici chaque avis est
// affiché tel quel, avec son auteur (voir avis_ville() côté SQL,
// migration 27 : public dès la publication, pas de seuil d'anonymat).
export default function AvisListe({ avis }) {
  if (!avis || avis.length === 0) {
    return (
      <p className="mt-3 text-sm text-text-soft">
        Pas encore d&apos;avis pour cette ville. Sois le premier à en laisser un !
      </p>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {avis.map((a) => (
        <div key={a.id} className="rounded-2xl border border-card-edge bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{a.pseudo}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-text-soft">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    a.est_resident
                      ? 'border-mint/40 text-mint-ink'
                      : 'border-card-edge text-text-soft'
                  }`}
                >
                  {a.est_resident ? 'Habitant' : 'Visiteur'}
                </span>
                {new Date(a.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="flex shrink-0 gap-0.5 text-amber-ink">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className="h-3.5 w-3.5" fill={n <= a.note ? 'currentColor' : 'none'} strokeWidth={1.5} />
              ))}
            </div>
          </div>

          {a.commentaire && <p className="mt-2 text-sm">{a.commentaire}</p>}

          {(a.points_forts?.length > 0 || a.points_faibles?.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {a.points_forts?.map((p, i) => (
                <span key={`f${i}`} className="rounded-full bg-mint/10 px-2.5 py-1 text-[11px] text-mint-ink">
                  + {p}
                </span>
              ))}
              {a.points_faibles?.map((p, i) => (
                <span key={`d${i}`} className="rounded-full bg-coral/10 px-2.5 py-1 text-[11px] text-coral-ink">
                  − {p}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
