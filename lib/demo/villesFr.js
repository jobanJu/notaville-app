'use client'

// Les 34 969 communes de France (source Etalab/INSEE, même jeu de
// données que supabase/00_villes_quartiers.sql), pour que la recherche
// de ville fonctionne à l'identique en mode démo et en vrai Supabase --
// et pas seulement sur les 3-6 villes qu'on avait fabriquées à la main
// jusqu'ici. Servi en JSON statique (public/data/villes-fr.json) et
// chargé à la demande (uniquement quand on cherche vraiment une ville en
// démo), plutôt qu'embarqué dans le bundle JS de chaque page.
let promesseChargement = null

export function chargerVillesFr() {
  if (!promesseChargement) {
    promesseChargement = fetch('/data/villes-fr.json')
      .then((res) => res.json())
      .then((rows) =>
        rows.map(([code_insee, nom, departement, region, population]) => ({
          code_insee,
          nom,
          departement,
          region,
          population,
        }))
      )
      .catch((err) => {
        promesseChargement = null // permet de réessayer si le fetch a échoué
        throw err
      })
  }
  return promesseChargement
}
