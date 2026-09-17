// Recherche d'adresse française -- API Adresse du gouvernement
// (api-adresse.data.gouv.fr, service public de la Base Adresse
// Nationale) : gratuite, sans clé, pas d'inscription, et faite pour
// être appelée directement depuis le navigateur (CORS ouvert). Sert
// d'alternative à la géolocalisation live (lib/geoloc.js) -- utile sur
// ordinateur (pas de GPS) ou pour chercher "autour d'une adresse" sans
// y être physiquement. Rien n'est stocké côté Notaville, l'adresse
// tapée part directement de l'appareil vers l'API du gouvernement.
export async function rechercherAdresses(terme, limite = 5) {
  if (!terme || terme.trim().length < 3) return []
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(terme)}&limit=${limite}`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.features ?? []).map((f) => ({
      label: f.properties.label,
      contexte: f.properties.context,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }))
  } catch {
    // API indisponible ou hors-ligne -- la géolocalisation live reste
    // utilisable, ce n'est qu'une méthode alternative.
    return []
  }
}

// Géocodage inverse : position GPS -> commune française (code INSEE).
// Même service, même politique de confidentialité -- la position part
// directement de l'appareil vers l'API du gouvernement, Notaville ne
// voit jamais les coordonnées elles-mêmes, seulement le code INSEE
// renvoyé (voir components/VillesVisiteesTracker.js, seul appelant).
export async function inverserAdresse(lat, lon) {
  if (lat == null || lon == null) return null
  const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const f = (data.features ?? [])[0]
    if (!f) return null
    return {
      codeInsee: f.properties.citycode,
      ville: f.properties.city ?? f.properties.name,
    }
  } catch {
    return null
  }
}
