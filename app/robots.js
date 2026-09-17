export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/profil", "/onboarding"],
    },
    sitemap: "https://notaville-app.vercel.app/sitemap.xml",
  };
}
