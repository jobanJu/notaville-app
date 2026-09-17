'use client'

import { useEffect, useState } from 'react'
import { chargerImageVille } from '@/lib/wikimedia'

// Un seul dégradé (celui de l'identité Notaville, déjà utilisé sur les
// boutons et badges) pour toutes les villes sans photo -- une couleur
// différente par ville rendait la grille de vignettes hétéroclite.

// Vignette/bannière photo d'une ville, chargée à la demande depuis
// Wikipédia (voir lib/wikimedia.js). Pendant le chargement : fond
// neutre qui pulse. Si aucune photo n'est trouvée : dégradé de couleur
// + initiale de la ville, cohérent avec l'identité visuelle -- jamais
// d'icône d'image cassée. `messageAbsent` (optionnel) affiche un texte
// dans le dégradé quand il n'y a pas de photo (ex. inviter à en
// ajouter une via un défi photo).
export default function ImageVille({ nom, departement, className = '', messageAbsent }) {
  const cle = `${nom}|${departement ?? ''}`
  // On garde le résultat associé à la clé qui l'a produit : si `nom`/
  // `departement` changent avant que la promesse ne résolve, le rendu
  // retombe sur "en cours" (undefined) sans jamais appeler setState
  // directement dans le corps de l'effet (juste dans le .then()).
  const [etat, setEtat] = useState({ cle: null, image: undefined })
  const image = etat.cle === cle ? etat.image : undefined

  useEffect(() => {
    let annule = false
    chargerImageVille(nom, departement).then((res) => {
      if (!annule) setEtat({ cle, image: res ?? null })
    })
    return () => {
      annule = true
    }
  }, [cle, nom, departement])

  if (image) {
    // Pas de mention "Wikipédia" affichée sur la photo elle-même : la
    // source des images (Wikipédia + contributions des utilisateurs)
    // est indiquée globalement dans les mentions légales plutôt que
    // répétée sur chaque vignette.
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img src={image.url} alt={`Photo de ${nom}`} loading="lazy" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 ${className}`}
      style={image === undefined ? { background: 'var(--bg-soft)' } : { background: 'linear-gradient(135deg, #FF5A56, #FFA726)' }}
    >
      {image === undefined ? (
        <span className="h-6 w-6 animate-pulse rounded-full bg-card-edge" />
      ) : (
        <>
          <span className="font-display text-3xl font-extrabold text-white/90">{nom[0]}</span>
          {messageAbsent && <p className="px-3 text-center text-[11px] text-white/90">{messageAbsent}</p>}
        </>
      )}
    </div>
  )
}
