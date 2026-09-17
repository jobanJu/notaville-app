// Types de commerce utilisés sur /reductions (offres publiques).
// icone : clé sobre résolue par components/Icone.js.
export const TYPES_COMMERCE = [
  { valeur: 'restaurant', label: 'Restaurant', icone: 'restaurant' },
  { valeur: 'bar', label: 'Bar', icone: 'bar' },
  { valeur: 'cafe', label: 'Café / boulangerie', icone: 'cafe' },
  { valeur: 'boutique', label: 'Boutique', icone: 'boutique' },
  { valeur: 'hotel', label: 'Hôtel / hébergement', icone: 'hotel' },
  { valeur: 'activite_loisir', label: 'Activité / loisir / visite', icone: 'ticket' },
  { valeur: 'autre', label: 'Autre', icone: 'etiquette' },
]

export function iconePourType(type) {
  return TYPES_COMMERCE.find((t) => t.valeur === type)?.icone ?? 'etiquette'
}

export function labelPourType(type) {
  return TYPES_COMMERCE.find((t) => t.valeur === type)?.label ?? 'Autre'
}
