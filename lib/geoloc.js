'use client'

import { useCallback, useState } from 'react'

// Distance à vol d'oiseau en km (formule de haversine) -- utilitaire pur,
// réutilisable par toute fonctionnalité géolocalisée du site.
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Hook partagé pour demander la position live du visiteur (geolocation
// navigateur), utilisé par /recherche (recherche géolocalisée) et
// réutilisable ailleurs. Rien n'est stocké au-delà de la session de
// navigation ni envoyé à un serveur tiers : la position ne sert qu'au
// calcul de distance, en local, dans le navigateur.
export function useMaPosition() {
  const [statut, setStatut] = useState('idle') // idle | chargement | trouve | erreur
  const [position, setPosition] = useState(null)
  const [erreur, setErreur] = useState(null)

  const demander = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatut('erreur')
      setErreur("La géolocalisation n'est pas disponible sur cet appareil.")
      return
    }
    setStatut('chargement')
    setErreur(null)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition({ lat: p.coords.latitude, lon: p.coords.longitude })
        setStatut('trouve')
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Position refusée. Tu peux l'autoriser dans les réglages de ton navigateur."
            : "Impossible de récupérer ta position pour le moment."
        setStatut('erreur')
        setErreur(message)
      },
      { timeout: 10000 }
    )
  }, [])

  return { statut, position, erreur, demander }
}
