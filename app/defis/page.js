import { createClient } from "@/lib/supabase/server";
import DefisHub from "@/components/DefisHub";
import Icone from "@/components/Icone";
import { isDemoMode } from "@/lib/demo/session";
import { demoCategories, demoDefis, demoParticipantsParDefi, demoTopNotacoins, demoProfil } from "@/lib/demo/data";

export default async function DefisPage() {
  const demo = await isDemoMode();

  let categories, defis, mesParticipations, compteurs, topNotacoins, villeOrigineCode;

  if (demo) {
    categories = demoCategories;
    defis = demoDefis;
    mesParticipations = [];
    compteurs = Object.entries(demoParticipantsParDefi).map(([defi_id, nb_participants]) => ({
      defi_id: Number(defi_id),
      nb_participants,
    }));
    topNotacoins = demoTopNotacoins;
    villeOrigineCode = demoProfil.ville_origine_code;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const nowIso = new Date().toISOString();

    const results = await Promise.all([
      supabase
        .from("categories_defis")
        .select("id, cle, nom, description, icone, type, ordre")
        .eq("actif", true)
        .order("ordre"),
      supabase
        .from("defis")
        .select(
          "id, categorie_id, titre, description, type_participation, difficulte, image_url, ville_code_insee, portee_temporelle, date_debut, date_fin, palier_cible"
        )
        .eq("actif", true)
        .or(`date_fin.is.null,date_fin.gt.${nowIso}`)
        .order("ordre"),
      supabase.from("participations").select("defi_id, statut, etape_courante").eq("user_id", user.id),
      supabase.from("v_defis_compteurs").select("defi_id, nb_participants"),
      supabase.from("v_classement_notacoins").select("pseudo, notacoins").limit(5),
      supabase.from("profiles").select("ville_origine_code").eq("id", user.id).single(),
    ]);

    categories = results[0].data ?? [];
    defis = results[1].data ?? [];
    mesParticipations = results[2].data ?? [];
    compteurs = results[3].data ?? [];
    topNotacoins = results[4].data ?? [];
    villeOrigineCode = results[5].data?.ville_origine_code ?? null;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold">Défis</h1>
      <p className="mt-1 text-sm text-text-soft">
        Gagne des Notacoins en contribuant à Notaville. Les défis sont
        optionnels : tu peux utiliser Notaville sans jamais en faire.
      </p>

      <DefisHub
        categories={categories}
        defis={defis}
        participations={mesParticipations}
        compteurs={compteurs}
        villeOrigineCode={villeOrigineCode}
      />

      {topNotacoins && topNotacoins.length > 0 && (
        <div className="mt-10 border-t border-card-edge pt-6">
          <h2 className="font-display text-lg font-bold">Top Notacoins</h2>
          <ol className="mt-3 flex flex-col gap-1.5">
            {topNotacoins.map((p, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-card-edge px-3 py-2 text-sm">
                <span>
                  <span className="mr-2 font-mono text-text-soft">{i + 1}.</span>
                  {p.pseudo}
                </span>
                <span className="flex items-center gap-1 font-mono text-amber-ink">
                  {p.notacoins}
                  <Icone nom="pieces" className="h-3.5 w-3.5" />
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
