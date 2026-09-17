import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminDefis from "@/components/AdminDefis";
import { isDemoMode } from "@/lib/demo/session";

// Administration minimale, pilotable depuis l'app (en plus du Table
// editor Supabase, toujours utilisable) : créer/activer-désactiver des
// défis, et valider/rejeter les contributions en attente. Réservée aux
// comptes profiles.est_admin = true (RLS en base fait aussi respecter
// cette règle, cette page n'est qu'un confort d'usage).
export default async function AdminDefisPage() {
  // Le mode démo n'a pas de base derrière : pas de contributions à
  // valider ni de vraie table à modifier, donc pas de simulation ici
  // (contrairement au reste du mode démo) — juste une explication.
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

  const [{ data: categories }, { data: defis }, { data: recompenses }, { data: contributionsEnAttente }] =
    await Promise.all([
      supabase.from("categories_defis").select("id, nom, icone").order("ordre"),
      supabase
        .from("defis")
        .select("id, titre, categorie_id, type_participation, difficulte, actif, cle_recompense, date_fin")
        .order("id", { ascending: false }),
      supabase.from("parametres_recompenses").select("cle, valeur, description").order("cle"),
      supabase
        .from("contributions")
        .select("id, user_id, defi_id, type_contribution, contenu, photo_url, donnee_valeur, donnee_cle, created_at, defis(titre), profiles(pseudo)")
        .eq("statut", "en_attente")
        .order("created_at"),
    ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold">Administration des défis</h1>
      <p className="mt-1 text-sm text-text-soft">
        Pour les opérations en masse ou l&apos;édition fine, le Table editor Supabase reste disponible.
      </p>

      <AdminDefis
        categories={categories ?? []}
        defisInitiaux={defis ?? []}
        recompenses={recompenses ?? []}
        contributionsInitiales={contributionsEnAttente ?? []}
      />
    </div>
  );
}
