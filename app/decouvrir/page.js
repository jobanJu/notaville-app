import { createClient } from "@/lib/supabase/server";
import QuartierListe from "@/components/QuartierListe";
import LieuxProchesRecherche from "@/components/LieuxProchesRecherche";
import LieuxRecommandes from "@/components/LieuxRecommandes";
import Link from "next/link";
import { isDemoMode } from "@/lib/demo/session";
import { demoQuartiers, demoLieux } from "@/lib/demo/data";

// Ancienne carte Leaflet retirée (elle ne couvrait de toute façon que
// les 12 quartiers de Lille avec de vraies coordonnées, voir
// supabase/10_quartiers_coordonnees.sql, et prenait toute la page sur
// mobile) : la notation de quartier passe en liste simple
// (QuartierListe, même mécanique), et la découverte de lieux précis
// passe en recherche géolocalisée par mot-clé (LieuxProchesRecherche,
// voir supabase/24_lieux_prix.sql) -- "bière" retrouve tous les bars
// autour de toi, triés par distance, avec leur fourchette de prix.
export default async function DecouvrirPage() {
  const demo = await isDemoMode();
  if (demo) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-center text-2xl font-extrabold">Découvrir</h1>

        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">Trouve un lieu près de toi</h2>
          <p className="mt-1 text-sm text-text-soft">
            Un plat, une boisson, une ambiance... tape un mot-clé, on te propose ce qu&apos;il y a autour de toi.
          </p>
          <div className="mt-4">
            <LieuxProchesRecherche />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-lg font-bold">Note tes quartiers</h2>
          <p className="mt-1 text-sm text-text-soft">
            (Mode démo : rien n&apos;est enregistré.)
          </p>
          <div className="mt-4">
            <QuartierListe quartiers={demoQuartiers} demo />
          </div>
        </section>

        <h2 className="mt-12 text-center font-display text-lg font-bold">Lieux recommandés pour toi</h2>
        <p className="mt-1 text-center text-sm text-text-soft">
          En fonction des quartiers que tu as aimés.
        </p>
        <div className="mt-4">
          <LieuxRecommandes lieux={demoLieux} demo />
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profil } = await supabase
    .from("profiles")
    .select("ville_origine_code")
    .eq("id", user.id)
    .single();

  if (!profil?.ville_origine_code) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-text-soft">
          Choisis d&apos;abord ta ville pour commencer à noter.
        </p>
        <Link href="/onboarding" className="btn-primary mt-4 inline-flex">
          Choisir ma ville
        </Link>
      </div>
    );
  }

  // Quartiers déjà notés par cette personne, à exclure.
  const { data: dejaNotes } = await supabase
    .from("notes")
    .select("quartier_id")
    .eq("user_id", user.id);
  const idsExclus = new Set((dejaNotes ?? []).map((n) => n.quartier_id));

  const { data: quartiersVille } = await supabase
    .from("quartiers")
    .select("id, nom, ville_code_insee, villes(nom)")
    .eq("ville_code_insee", profil.ville_origine_code)
    .limit(200);

  // Complété par un échantillon d'autres villes, pour continuer à
  // pouvoir noter des quartiers déjà visités ailleurs.
  const { data: autresQuartiers } = await supabase
    .from("quartiers")
    .select("id, nom, ville_code_insee, villes(nom)")
    .neq("ville_code_insee", profil.ville_origine_code)
    .limit(300);

  // Lieux précis (resto, monument...) recommandés à partir des
  // quartiers déjà aimés sur la carte, ou à défaut de la ville
  // d'origine -- voir supabase/11_lieux.sql.
  const { data: recommandations } = await supabase.rpc("recommander_lieux", {
    p_user_id: user.id,
    p_limite: 6,
  });

  function mapper(q) {
    return {
      id: q.id,
      nom: q.nom,
      villeCode: q.ville_code_insee,
      villeNom: q.villes?.nom ?? "",
    };
  }

  const dejaExclus = (q) => !idsExclus.has(q.id);
  const villeQuartiers = (quartiersVille ?? []).filter(dejaExclus).map(mapper);

  let autres = (autresQuartiers ?? []).filter(dejaExclus).map(mapper);
  for (let i = autres.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [autres[i], autres[j]] = [autres[j], autres[i]];
  }
  autres = autres.slice(0, 20);

  const quartiers = [...villeQuartiers, ...autres];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-center text-2xl font-extrabold">Découvrir</h1>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">Trouve un lieu près de toi</h2>
        <p className="mt-1 text-sm text-text-soft">
          Un plat, une boisson, une ambiance... tape un mot-clé, on te propose ce qu&apos;il y a autour de toi.
        </p>
        <div className="mt-4">
          <LieuxProchesRecherche />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-lg font-bold">Note tes quartiers</h2>
        <p className="mt-1 text-sm text-text-soft">
          J&apos;aime / je ne connais pas -- chaque quartier noté rapporte des Notacoins.
        </p>
        <div className="mt-4">
          {quartiers.length === 0 ? (
            <p className="text-center text-sm text-text-soft">
              Tu as déjà noté tous les quartiers disponibles pour l&apos;instant. Reviens plus tard !
            </p>
          ) : (
            <QuartierListe quartiers={quartiers} />
          )}
        </div>
      </section>

      <h2 className="mt-12 text-center font-display text-lg font-bold">Lieux recommandés pour toi</h2>
      <p className="mt-1 text-center text-sm text-text-soft">
        En fonction des quartiers que tu as aimés.
      </p>
      <div className="mt-4">
        <LieuxRecommandes lieux={recommandations ?? []} />
      </div>
    </div>
  );
}
