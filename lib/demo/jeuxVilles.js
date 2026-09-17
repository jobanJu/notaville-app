// Pool de grandes villes françaises connues, partagé par les jeux
// /jeux/devine-la-ville, /jeux/quiz-eclair et /jeux/ville-mystere :
// assez grandes pour avoir presque toujours une photo Wikipédia
// exploitable (lib/wikimedia.js) et être reconnaissables dans un quiz,
// contrairement à une petite commune tirée au hasard parmi les
// 34 969. Codes INSEE, régions et population réels (source :
// public/data/villes-fr.json). Coordonnées (centre-ville,
// approximatives) saisies à la main à partir de repères géographiques
// connus -- même méthode et même limite honnête que
// lib/villesCoords.js -- utilisées par /jeux/ville-mystere pour
// indiquer une distance et une direction, pas pour du calcul précis.
export const VILLES_JEU = [
  { code_insee: '75056', nom: 'Paris', departement: 'Paris', region: 'Île-de-France', population: 2103778, latitude: 48.8566, longitude: 2.3522 },
  { code_insee: '13055', nom: 'Marseille', departement: 'Bouches-du-Rhône', region: "Provence-Alpes-Côte d'Azur", population: 886040, latitude: 43.2965, longitude: 5.3698 },
  { code_insee: '69123', nom: 'Lyon', departement: 'Rhône', region: 'Auvergne-Rhône-Alpes', population: 519127, latitude: 45.764, longitude: 4.8357 },
  { code_insee: '31555', nom: 'Toulouse', departement: 'Haute-Garonne', region: 'Occitanie', population: 514819, latitude: 43.6047, longitude: 1.4442 },
  { code_insee: '06088', nom: 'Nice', departement: 'Alpes-Maritimes', region: "Provence-Alpes-Côte d'Azur", population: 357737, latitude: 43.7102, longitude: 7.262 },
  { code_insee: '44109', nom: 'Nantes', departement: 'Loire-Atlantique', region: 'Pays de la Loire', population: 327734, latitude: 47.2184, longitude: -1.5536 },
  { code_insee: '34172', nom: 'Montpellier', departement: 'Hérault', region: 'Occitanie', population: 310240, latitude: 43.6108, longitude: 3.8767 },
  { code_insee: '67482', nom: 'Strasbourg', departement: 'Bas-Rhin', region: 'Grand Est', population: 293771, latitude: 48.5734, longitude: 7.7521 },
  { code_insee: '33063', nom: 'Bordeaux', departement: 'Gironde', region: 'Nouvelle-Aquitaine', population: 267991, latitude: 44.8378, longitude: -0.5792 },
  { code_insee: '59350', nom: 'Lille', departement: 'Nord', region: 'Hauts-de-France', population: 238246, latitude: 50.6292, longitude: 3.0573 },
  { code_insee: '35238', nom: 'Rennes', departement: 'Ille-et-Vilaine', region: 'Bretagne', population: 230890, latitude: 48.1173, longitude: -1.6778 },
  { code_insee: '83137', nom: 'Toulon', departement: 'Var', region: "Provence-Alpes-Côte d'Azur", population: 179116, latitude: 43.1242, longitude: 5.928 },
  { code_insee: '51454', nom: 'Reims', departement: 'Marne', region: 'Grand Est', population: 177674, latitude: 49.2583, longitude: 4.0317 },
  { code_insee: '42218', nom: 'Saint-Étienne', departement: 'Loire', region: 'Auvergne-Rhône-Alpes', population: 173136, latitude: 45.4397, longitude: 4.3872 },
  { code_insee: '76351', nom: 'Le Havre', departement: 'Seine-Maritime', region: 'Normandie', population: 166687, latitude: 49.4944, longitude: 0.1079 },
  { code_insee: '21231', nom: 'Dijon', departement: "Côte-d'Or", region: 'Bourgogne-Franche-Comté', population: 161830, latitude: 47.322, longitude: 5.0415 },
  { code_insee: '49007', nom: 'Angers', departement: 'Maine-et-Loire', region: 'Pays de la Loire', population: 159022, latitude: 47.4784, longitude: -0.5632 },
  { code_insee: '38185', nom: 'Grenoble', departement: 'Isère', region: 'Auvergne-Rhône-Alpes', population: 156140, latitude: 45.1885, longitude: 5.7245 },
  { code_insee: '30189', nom: 'Nîmes', departement: 'Gard', region: 'Occitanie', population: 151839, latitude: 43.8367, longitude: 4.3601 },
  { code_insee: '13001', nom: 'Aix-en-Provence', departement: 'Bouches-du-Rhône', region: "Provence-Alpes-Côte d'Azur", population: 149695, latitude: 43.5297, longitude: 5.4474 },
  { code_insee: '63113', nom: 'Clermont-Ferrand', departement: 'Puy-de-Dôme', region: 'Auvergne-Rhône-Alpes', population: 146351, latitude: 45.7772, longitude: 3.087 },
  { code_insee: '72181', nom: 'Le Mans', departement: 'Sarthe', region: 'Pays de la Loire', population: 146249, latitude: 48.0061, longitude: 0.1996 },
  { code_insee: '29019', nom: 'Brest', departement: 'Finistère', region: 'Bretagne', population: 142346, latitude: 48.3904, longitude: -4.4861 },
  { code_insee: '37261', nom: 'Tours', departement: 'Indre-et-Loire', region: 'Centre-Val de Loire', population: 139259, latitude: 47.3941, longitude: 0.6848 },
  { code_insee: '80021', nom: 'Amiens', departement: 'Somme', region: 'Hauts-de-France', population: 136449, latitude: 49.8941, longitude: 2.2958 },
  { code_insee: '74010', nom: 'Annecy', departement: 'Haute-Savoie', region: 'Auvergne-Rhône-Alpes', population: 132117, latitude: 45.8992, longitude: 6.1294 },
  { code_insee: '87085', nom: 'Limoges', departement: 'Haute-Vienne', region: 'Nouvelle-Aquitaine', population: 129937, latitude: 45.8336, longitude: 1.2611 },
  { code_insee: '57463', nom: 'Metz', departement: 'Moselle', region: 'Grand Est', population: 122572, latitude: 49.1193, longitude: 6.1757 },
  { code_insee: '66136', nom: 'Perpignan', departement: 'Pyrénées-Orientales', region: 'Occitanie', population: 121616, latitude: 42.6986, longitude: 2.8954 },
  { code_insee: '25056', nom: 'Besançon', departement: 'Doubs', region: 'Bourgogne-Franche-Comté', population: 118489, latitude: 47.2378, longitude: 6.0241 },
  { code_insee: '76540', nom: 'Rouen', departement: 'Seine-Maritime', region: 'Normandie', population: 117662, latitude: 49.4431, longitude: 1.0993 },
  { code_insee: '45234', nom: 'Orléans', departement: 'Loiret', region: 'Centre-Val de Loire', population: 116357, latitude: 47.9029, longitude: 1.9093 },
  { code_insee: '14118', nom: 'Caen', departement: 'Calvados', region: 'Normandie', population: 109400, latitude: 49.1829, longitude: -0.3707 },
]

export function melanger(tableau) {
  const copie = [...tableau]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copie[i], copie[j]] = [copie[j], copie[i]]
  }
  return copie
}

// n éléments aléatoires de `tableau` en excluant `exclu` (ex: la bonne
// réponse, pour construire des propositions fausses sans doublon).
export function tirerAutres(tableau, exclu, n) {
  const reste = tableau.filter((v) => v.code_insee !== exclu.code_insee)
  return melanger(reste).slice(0, n)
}

// Distance à vol d'oiseau en km (formule de haversine) -- dupliquée
// volontairement de lib/geoloc.js et lib/villesCoords.js : chaque
// module reste indépendant et déjà vérifié, plutôt que de créer une
// dépendance croisée entre trois petits utilitaires identiques.
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Direction (flèche à 8 points) de (lat1,lon1) vers (lat2,lon2), pour
// /jeux/ville-mystere ("la ville mystère est à 320 km au nord-ouest").
const FLECHES = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']
export function directionVers(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const cap = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
  return FLECHES[Math.round(cap / 45) % 8]
}
