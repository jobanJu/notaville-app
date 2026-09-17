'use client'

// Photos de ville à la demande, via l'API publique de Wikipédia (REST,
// gratuite, sans clé, CORS activé). On n'a pas de base de photos pour
// les 34 969 communes de France -- inutile d'en maintenir une : on
// cherche l'article Wikipédia de la commune et on prend son image
// principale. Beaucoup de petites communes n'ont pas d'image (ou pas
// d'article du tout) : ImageVille.js gère ce cas avec un dégradé +
// initiale, jamais une icône d'image cassée.
//
// Cache en mémoire (perdu au rechargement, comme le reste du mode
// démo) pour ne pas re-fetcher deux fois la même ville dans la session
// -- une fiche ville, une carte du comparateur et une ligne de
// classement peuvent demander la même ville dans la même page.

const cache = new Map()

async function chercherResume(titre) {
  const res = await fetch(
    `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titre)}`,
    { headers: { accept: 'application/json' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  // type === 'disambiguation' : page d'homonymie (plusieurs communes du
  // même nom), pas une vraie page de commune -- on ne devine pas.
  if (data.type === 'disambiguation' || !data.thumbnail?.source) return null
  return {
    url: data.originalimage?.source ?? data.thumbnail.source,
    pageUrl: data.content_urls?.desktop?.page ?? null,
  }
}

// Renvoie { url, pageUrl } ou null si aucune photo trouvée. Ne lève
// jamais d'exception (réseau coupé, ville introuvable...) -- l'appelant
// n'a qu'à afficher son repli dans les deux cas.
export function chargerImageVille(nom, departement) {
  const cle = `${nom}|${departement ?? ''}`
  if (cache.has(cle)) return cache.get(cle)

  const promesse = (async () => {
    try {
      const direct = await chercherResume(nom)
      if (direct) return direct
      // Convention Wikipédia pour les communes homonymes :
      // "Nom (Département)", ex. « Neuville (Puy-de-Dôme) ». Coup
      // d'essai supplémentaire, pas une garantie.
      if (departement) {
        const avecDepartement = await chercherResume(`${nom} (${departement})`)
        if (avecDepartement) return avecDepartement
      }
      return null
    } catch {
      return null
    }
  })()

  cache.set(cle, promesse)
  return promesse
}
