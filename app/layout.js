import "./globals.css";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import VillesVisiteesTracker from "@/components/VillesVisiteesTracker";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/session";

export const metadata = {
  metadataBase: new URL("https://notaville-app.vercel.app"),
  title: {
    default: "Notaville — Note ta ville, quartier par quartier",
    template: "%s · Notaville",
  },
  description:
    "Note ta ville et celles que tu visites, quartier par quartier. Défis, duels de quartier, classements communautaires et Notacoins à gagner.",
  // "et débloque des cartes cadeaux" retiré : cette fonctionnalité n'est
  // pas encore branchée (en attente de vrais partenariats, voir
  // README) -- une promesse non tenue dans la description publique du
  // site aurait été trompeuse pour les visiteurs et les moteurs de
  // recherche.
  openGraph: {
    title: "Notaville — Note ta ville, quartier par quartier",
    description:
      "Une communauté qui note ses villes et quartiers, relève des défis et compare le coût de la vie sur les 34 969 communes de France.",
    url: "https://notaville-app.vercel.app",
    siteName: "Notaville",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Notaville — Note ta ville, quartier par quartier",
    description: "Note ta ville, quartier par quartier. Défis, duels, classements et Notacoins.",
  },
};

export const viewport = {
  themeColor: "#0A0E22",
};

export default async function RootLayout({ children }) {
  // Duplique volontairement la vérification connecté/démo de Navbar.js
  // (convention du projet) : seul layout.js sait s'il faut réserver de
  // la place en bas de page pour la barre de navigation mobile fixe.
  const demo = await isDemoMode();
  let connecte = demo;

  if (!demo) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    connecte = Boolean(user);
  }

  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col">
        {/* Google AdSense -- script de vérification/activation du site,
            chargé une seule fois ici pour tout le site. Placé dans <body>
            (pas dans un <head> ajouté à la main, qui entre en conflit
            avec le <head> que Next.js génère déjà à partir de l'export
            "metadata" ci-dessus) -- next/script l'injecte quand même
            dans le <head> final envoyé au navigateur et aux robots.
            Un identifiant d'emplacement (data-ad-slot) est ajouté
            séparément là où une pub doit vraiment s'afficher (voir
            components/PubGate.js). */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3838999182818443"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <Navbar />
        <main className={`flex-1 ${connecte ? "pb-16 sm:pb-0" : ""}`}>{children}</main>
        <Footer />
        {connecte && <BottomNav />}
        {connecte && <VillesVisiteesTracker demo={demo} />}
      </body>
    </html>
  );
}
