// Types d'évènements affichables (calendrier /evenements, ville page) --
// même convention que lib/lieux.js : une clé sobre en base, résolue en
// libellé + icône seulement à l'affichage.
export const TYPES_EVENEMENT = [
  { valeur: 'concert', label: 'Concert', icone: 'musique' },
  { valeur: 'marche', label: 'Marché', icone: 'boutique' },
  { valeur: 'festival', label: 'Festival', icone: 'fete' },
  { valeur: 'sport', label: 'Sport', icone: 'trophee' },
  { valeur: 'exposition', label: 'Exposition', icone: 'musee' },
  { valeur: 'spectacle', label: 'Spectacle', icone: 'ticket' },
  { valeur: 'autre', label: 'Évènement', icone: 'calendrier' },
]

export function labelTypeEvenement(type) {
  return TYPES_EVENEMENT.find((t) => t.valeur === type)?.label ?? 'Évènement'
}

export function iconeTypeEvenement(type) {
  return TYPES_EVENEMENT.find((t) => t.valeur === type)?.icone ?? 'calendrier'
}
