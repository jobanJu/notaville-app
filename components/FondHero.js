'use client'

import { useEffect, useState } from 'react'
import { chargerImageVille } from '@/lib/wikimedia'

// Bannière plein écran avec une vraie photo (Wikipédia, comme
// ImageVille.js) en arrière-plan, adoucie par un voile clair pour que
// le texte reste lisible -- pas de fond avant le montage (le fetch ne
// se fait que côté client), donc rien à désynchroniser entre serveur
// et client : le HTML serveur n'a simplement pas encore l'image.
export default function FondHero({ nom, departement, children }) {
  const [image, setImage] = useState(null)

  useEffect(() => {
    let annule = false
    chargerImageVille(nom, departement).then((res) => {
      if (!annule && res) setImage(res)
    })
    return () => {
      annule = true
    }
  }, [nom, departement])

  return (
    <div className="relative overflow-hidden">
      {image && (
        <>
          <img src={image.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-bg/80" />
        </>
      )}
      <div className="relative">{children}</div>
    </div>
  )
}
