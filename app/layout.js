import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/session";

export const metadata = {
  title: "Notaville",
  description: "Note ta ville, quartier par quartier, et débloque des cartes cadeaux.",
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
        <Navbar />
        <main className={`flex-1 ${connecte ? "pb-16 sm:pb-0" : ""}`}>{children}</main>
        <Footer />
        {connecte && <BottomNav />}
      </body>
    </html>
  );
}
