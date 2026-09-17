// Types de lieu partagés entre le défi "Ajoute un lieu manquant"
// (components/DefiActions.js), les recommandations (LieuxRecommandes)
// et la recherche par mot-clé (/recherche) -- une seule liste à tenir à
// jour. icone : clé sobre résolue par components/Icone.js.
export const TYPES_LIEU = [
  { valeur: 'restaurant', label: 'Restaurant', icone: 'restaurant' },
  { valeur: 'bar', label: 'Bar', icone: 'bar' },
  { valeur: 'cafe', label: 'Café', icone: 'cafe' },
  { valeur: 'monument', label: 'Monument', icone: 'landmark' },
  { valeur: 'musee', label: 'Musée', icone: 'musee' },
  { valeur: 'parc', label: 'Parc', icone: 'parc' },
  { valeur: 'boutique', label: 'Boutique', icone: 'boutique' },
  { valeur: 'hotel', label: 'Hôtel', icone: 'hotel' },
  { valeur: 'autre', label: 'Autre', icone: 'lieu' },
]

export function labelTypeLieu(type) {
  return TYPES_LIEU.find((t) => t.valeur === type)?.label ?? 'Autre'
}

export function iconeTypeLieu(type) {
  return TYPES_LIEU.find((t) => t.valeur === type)?.icone ?? 'lieu'
}

// Recherche insensible aux accents/casse (dupliqué depuis
// app/recherche/page.js volontairement, pour ne pas faire dépendre
// cette page déjà vérifiée d'un import partagé -- voir lib/geoloc.js
// pour la même convention sur distanceKm).
export function normaliser(texte) {
  return (texte ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
