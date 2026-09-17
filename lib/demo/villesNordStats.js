'use client'

// Statistiques "vie quotidienne" pour les ~650 communes du Nord (hors
// Lille et Douai, déjà détaillées à la main dans lib/demo/data.js --
// ces deux gardent toujours la priorité sur ce fichier). Chiffres
// simulés, dérivés de la population de chaque commune (voir le script
// qui a produit public/data/nord-vie-quotidienne.json) -- pas de
// vraies moyennes déclarées, comme le reste du mode démo. Servi en
// JSON statique et chargé à la demande (uniquement quand on compare
// vraiment une commune du Nord), plutôt qu'embarqué dans le bundle de
// chaque page -- même principe que villesFr.js pour les 34 969 communes.
let promesseChargement = null

export function chargerStatsNord() {
  if (!promesseChargement) {
    promesseChargement = fetch('/data/nord-vie-quotidienne.json')
      .then((res) => res.json())
      .then((rows) => {
        const map = new Map()
        for (const [codeInsee, stats] of rows) {
          map.set(
            codeInsee,
            stats.map(([donnee_cle, valeur, nb_contributions]) => ({
              donnee_cle,
              valeur,
              provenance: 'communaute',
              nb_contributions,
              source_url: null,
              date_maj_officielle: null,
            }))
          )
        }
        return map
      })
      .catch((err) => {
        promesseChargement = null // permet de réessayer si le fetch a échoué
        throw err
      })
  }
  return promesseChargement
}
