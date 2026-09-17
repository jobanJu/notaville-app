'use client'

import { useEffect, useState } from 'react'
import { Volume2 } from 'lucide-react'

const DUREE = 15

// Emplacement de pub réel, optionnel : tant que NEXT_PUBLIC_ADSENSE_SLOT_JEU
// n'est pas défini (créé depuis AdSense -> Annonces -> Par unité
// publicitaire -> Annonce display), on affiche un écran d'attente neutre
// à la place -- pas de <ins> sans data-ad-slot valide, ça ne diffuse rien
// et peut remonter comme une erreur d'implémentation côté AdSense.
const SLOT_JEU = process.env.NEXT_PUBLIC_ADSENSE_SLOT_JEU

function EmplacementPub() {
  useEffect(() => {
    if (!SLOT_JEU) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // Bloqueur de pub ou script non chargé -- l'écran d'attente reste
      // fonctionnel (le décompte continue) même sans annonce affichée.
    }
  }, [])

  if (SLOT_JEU) {
    return (
      <ins
        className="adsbygoogle block w-full"
        style={{ minHeight: '1px' }}
        data-ad-client="ca-pub-3838999182818443"
        data-ad-slot={SLOT_JEU}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    )
  }

  return <Volume2 className="h-10 w-10 text-text-soft" strokeWidth={1.5} />
}

// Écran d'attente avant de lancer un jeu : décompte de 15 secondes,
// impossible de passer avant la fin. Diffuse une vraie annonce AdSense
// si un emplacement a été créé et configuré (voir SLOT_JEU ci-dessus) ;
// sinon affiche un écran neutre -- jamais l'un sans l'autre, pour ne
// jamais laisser croire qu'une pub tourne alors que rien ne s'affiche.
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
        {SLOT_JEU ? 'Publicité' : 'Préparation du jeu'}
      </span>
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-bg-soft">
        <EmplacementPub />
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
        {SLOT_JEU
          ? 'Cette publicité finance les récompenses en Notacoins et permet de garder Notaville gratuit.'
          : 'Un court temps d’attente avant de jouer -- il finance les récompenses en Notacoins une fois les publicités branchées.'}
      </p>
    </div>
  )
}
