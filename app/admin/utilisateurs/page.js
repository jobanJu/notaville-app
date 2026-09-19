import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminUtilisateurs from "@/components/AdminUtilisateurs";
import { isDemoMode } from "@/lib/demo/session";

// Administration des rôles (modérateur / admin), pilotable depuis
// l'app -- même principe que /admin/defis et /admin/evenements.
// Réservée aux comptes profiles.est_admin = true (les fonctions
// SECURITY DEFINER appelées ici, migration 40, font aussi respecter
// cette règle côté base, cette page n'est qu'un confort d'usage).
export default async function AdminUtilisateursPage() {
  if (await isDemoMode()) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-lg font-bold">Administration</p>
        <p className="mt-2 text-sm text-text-soft">
          Pas disponible en mode démo : cette page agit sur une vraie base de données, qu&apos;il
          n&apos;y a pas ici. Branche un vrai projet Supabase pour l&apos;utiliser.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profil } = await supabase.from("profiles").select("est_admin").eq("id", user.id).single();
  if (!profil?.est_admin) redirect("/");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold">Administration des comptes</h1>
      <p className="mt-1 text-sm text-text-soft">
        Cherche un compte par pseudo pour lui donner (ou retirer) le rôle modérateur ou administrateur.
      </p>

      <AdminUtilisateurs />
    </div>
  );
}
