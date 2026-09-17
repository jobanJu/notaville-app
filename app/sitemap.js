// Sitemap des pages statiques publiques (sans compte requis). Les
// fiches ville (/villes/[code_insee], 34 969 communes) ne sont pas
// listées une par une ici : les générer toutes au build serait lourd et
// peu utile (Google les découvre déjà via les liens internes depuis
// /villes) -- amélioration possible plus tard avec un sitemap dédié,
// généré par lots.
const BASE_URL = "https://notaville-app.vercel.app";

const PAGES_PUBLIQUES = [
  "",
  "/villes",
  "/recherche",
  "/comparer",
  "/guides",
  "/reductions",
  "/notacoins",
  "/partenaires",
  "/cgu",
  "/mentions-legales",
  "/login",
];

export default function sitemap() {
  const maintenant = new Date();
  return PAGES_PUBLIQUES.map((chemin) => ({
    url: `${BASE_URL}${chemin}`,
    lastModified: maintenant,
    changeFrequency: chemin === "" ? "daily" : "weekly",
    priority: chemin === "" ? 1 : 0.6,
  }));
}
