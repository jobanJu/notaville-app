import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminEvenements from "@/components/AdminEvenements";
import { isDemoMode } from "@/lib/demo/session";

// Administration minimale des évènements, pilotable depuis l'app (en
// plus du Table editor Supabase, toujours utilisable) -- même principe
// que /admin/defis (migration 06). Création réservée à l'admin/aux
// partenaires (décision produit, migration 30) : pas de soumission
// communautaire pour les évènements.
export default async function AdminEvenementsPage() {
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

  const { data: evenements } = await supabase
    .from("evenements")
    .select("id, titre, description, ville_code_insee, lieu, type_evenement, date_debut, date_fin, lien_externe, actif, villes(nom)")
    .order("date_debut", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold">Administration des évènements</h1>
      <p className="mt-1 text-sm text-text-soft">
        Pour les opérations en masse ou l&apos;édition fine, le Table editor Supabase reste disponible.
      </p>

      <AdminEvenements evenementsInitiaux={evenements ?? []} />
    </div>
  );
}
