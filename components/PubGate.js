'use client'

import { useEffect, useState } from 'react'
import { Volume2 } from 'lucide-react'

const DUREE = 30

// Écran "publicité" avant de lancer un jeu : simule une vidéo de 30
// secondes (décompte, impossible de passer avant la fin). C'est un
// espace réservé -- tant qu'aucune régie publicitaire n'est vraiment
// branchée (AdSense ou autre, voir README), ça mime le comportement
// attendu et teste le flux/l'UX. Le jour où une régie est choisie,
// remplacer le contenu de l'écran par son SDK vidéo, en gardant la
// même logique de décompte pour débloquer `children`.
export default function PubGate({ children }) {
  const [restant, setRestant] = useState(DUREE)
  const [terminee, setTerminee] = useState(false)

  useEffect(() => {
    if (terminee) return
    if (restant <= 0) {
      setTerminee(true)
      return
    }
    const t = setTimeout(() => setRestant((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [restant, terminee])

  if (terminee) return children

  const progression = ((DUREE - restant) / DUREE) * 100

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-card-edge px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-soft">
        Publicité
      </span>
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-bg-soft">
        <Volume2 className="h-10 w-10 text-text-soft" strokeWidth={1.5} />
      </div>
      <p className="mt-5 text-sm text-text-soft">
        Ton jeu commence dans <span className="font-mono font-semibold text-text">{restant}s</span>
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-card-edge">
        <div
          className="h-full rounded-full bg-mint-ink transition-[width] duration-1000 ease-linear"
          style={{ width: `${progression}%` }}
        />
      </div>
      <p className="mt-6 text-xs text-text-soft">
        Cette publicité finance les récompenses en Notacoins et permet de garder Notaville gratuit.
      </p>
    </div>
  )
}
