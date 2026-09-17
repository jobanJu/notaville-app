// Petits calculs de budget partagés entre /comparer et /guides/ville/[code_insee]
// -- extraits de app/comparer/page.js pour ne pas dupliquer la logique
// financière (un "reste à vivre" qui diverge entre deux pages serait
// pire qu'un bug d'affichage). Fonctions pures, utilisables aussi bien
// côté serveur (guide, composant serveur) que client (comparateur).
export const SURFACE_T2 = 45 // m², hypothèse affichée telle quelle -- pas une moyenne mesurée.

// Pour la plupart des données "Vie quotidienne", moins cher = mieux --
// sauf le salaire, où c'est l'inverse.
export const PLUS_HAUT_EST_MIEUX = new Set(['salaire_net_mensuel'])

export function statValeur(fiche, cle) {
  return fiche?.stats?.find((s) => s.donnee_cle === cle)?.valeur ?? null
}

export function statProvenance(fiche, cle) {
  return fiche?.stats?.find((s) => s.donnee_cle === cle)?.provenance ?? null
}

// Ne calcule le loyer que si une donnée existe pour la ville -- sinon
// on affichait un loyer de 0€, ce qui fausse tout calcul en aval.
// Le loyer utilisé est le vrai loyer T2 déclaré (donnee_cle loyer_t2)
// quand il existe -- plus fiable qu'une estimation au m² -- et
// l'estimation loyer_m2 × surface sert de repli sinon.
export function loyerT2Estime(fiche) {
  const loyerT2 = statValeur(fiche, 'loyer_t2')
  if (loyerT2 != null) return { valeur: loyerT2, estime: false }
  const loyerM2 = statValeur(fiche, 'loyer_m2')
  if (loyerM2 != null) return { valeur: loyerM2 * SURFACE_T2, estime: true }
  return null
}

// Ne calcule le "reste à vivre" que si toutes les composantes sont
// connues pour la ville -- sinon on comparait un loyer réel à un
// panier de courses silencieusement mis à 0. Mieux vaut ne rien
// afficher qu'un chiffre faux.
export function resteAVivre(fiche) {
  const salaire = statValeur(fiche, 'salaire_net_mensuel')
  const loyer = loyerT2Estime(fiche)
  const courses = statValeur(fiche, 'panier_courses')
  const transport = statValeur(fiche, 'abonnement_transport')
  if (salaire == null || loyer == null || courses == null || transport == null) return null
  return salaire - loyer.valeur - courses - transport
}
