// Types d'établissement public notés dans le classement national
// (/classement) : hôpitaux, gares, services publics, écoles... Même
// convention que lib/lieux.js (une seule liste, icone résolue par
// components/Icone.js) mais pour des établissements rattachés à une
// ville entière plutôt qu'à un quartier -- un hôpital ou une gare
// dessert toute une ville, pas un seul quartier.
export const TYPES_ETABLISSEMENT = [
  { valeur: 'hopital', label: 'Hôpital', icone: 'hopital' },
  { valeur: 'gare', label: 'Gare', icone: 'gare' },
  { valeur: 'service_public', label: 'Service public', icone: 'batiment' },
  { valeur: 'ecole', label: 'École', icone: 'ecole' },
  { valeur: 'autre', label: 'Autre', icone: 'lieu' },
]

export function labelTypeEtablissement(type) {
  return TYPES_ETABLISSEMENT.find((t) => t.valeur === type)?.label ?? 'Autre'
}

export function iconeTypeEtablissement(type) {
  return TYPES_ETABLISSEMENT.find((t) => t.valeur === type)?.icone ?? 'lieu'
}
