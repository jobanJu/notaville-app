'use client'

// Leaflet touche `window` dès son import : on ne peut donc pas le
// charger côté serveur. On isole tout ce qui dépend de la lib dans
// QuartierCarteInterne.js et on le charge en dynamique, ssr: false.
import dynamic from 'next/dynamic'

const CarteInterne = dynamic(() => import('./QuartierCarteInterne'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-3xl border border-card-edge bg-card text-sm text-text-soft">
      Chargement de la carte…
    </div>
  ),
})

export default function QuartierCarte(props) {
  return <CarteInterne {...props} />
}
