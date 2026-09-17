// Manifest PWA -- permet d'installer Notaville sur l'écran d'accueil
// (mobile et desktop) comme une vraie application, plutôt qu'un
// raccourci de navigateur. Next.js sert ce fichier à /manifest.webmanifest
// et le lie automatiquement dans le <head>.
export default function manifest() {
  return {
    name: "Notaville — Note ta ville, quartier par quartier",
    short_name: "Notaville",
    description:
      "Note ta ville et celles que tu visites, quartier par quartier. Défis, duels, classements et Notacoins.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0E22",
    theme_color: "#0A0E22",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
