// Coordonnées (centre-ville, approximatives) des villes de la liste
// "populaires" de /villes -- saisies à la main, à partir de repères
// géographiques connus, PAS d'un relevé GPS ni d'un jeu de données
// officiel. Sert uniquement à la fonctionnalité "Près de moi".
//
// Pourquoi seulement ces ~20 villes et pas les 34 969 communes : aucune
// des sources de coordonnées par commune essayées (paquets npm
// codes-postaux, @etalab/decoupage-administratif, service pgeocode)
// n'était exploitable depuis l'environnement de build -- soit parce
// qu'elles ne contiennent pas de coordonnées du tout, soit parce
// qu'elles nécessitent un téléchargement réseau non autorisé. Plutôt
// que d'attendre une vraie source de données, on limite honnêtement la
// fonctionnalité à ces grandes villes déjà mises en avant sur la page,
// et on le dit à l'utilisateur dans l'interface.
export const COORDS_VILLES_POPULAIRES = {
  '75056': { lat: 48.8566, lon: 2.3522 }, // Paris
  '13055': { lat: 43.2965, lon: 5.3698 }, // Marseille
  '69123': { lat: 45.764, lon: 4.8357 }, // Lyon
  '31555': { lat: 43.6047, lon: 1.4442 }, // Toulouse
  '06088': { lat: 43.7102, lon: 7.262 }, // Nice
  '44109': { lat: 47.2184, lon: -1.5536 }, // Nantes
  '34172': { lat: 43.6108, lon: 3.8767 }, // Montpellier
  '67482': { lat: 48.5734, lon: 7.7521 }, // Strasbourg
  '33063': { lat: 44.8378, lon: -0.5792 }, // Bordeaux
  '59350': { lat: 50.6292, lon: 3.0573 }, // Lille
  '35238': { lat: 48.1173, lon: -1.6778 }, // Rennes
  '51454': { lat: 49.2583, lon: 4.0317 }, // Reims
  '42218': { lat: 45.4397, lon: 4.3872 }, // Saint-Étienne
  '83137': { lat: 43.1242, lon: 5.928 }, // Toulon
  '38185': { lat: 45.1885, lon: 5.7245 }, // Grenoble
  '21231': { lat: 47.322, lon: 5.0415 }, // Dijon
  '49007': { lat: 47.4784, lon: -0.5632 }, // Angers
  '30189': { lat: 43.8367, lon: 4.3601 }, // Nîmes
  '59599': { lat: 50.7236, lon: 3.1611 }, // Tourcoing
  '66136': { lat: 42.6986, lon: 2.8954 }, // Perpignan
}

// Distance à vol d'oiseau en km (formule de haversine).
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
