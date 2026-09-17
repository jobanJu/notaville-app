import { createClient } from "@/lib/supabase/server";
import QuartierCarte from "@/components/QuartierCarte";
import LieuxRecommandes from "@/components/LieuxRecommandes";
import Link from "next/link";
import { isDemoMode } from "@/lib/demo/session";
import { demoQuartiers, demoLieux } from "@/lib/demo/data";

export default async function DecouvrirPage() {
  const demo = await isDemoMode();
  if (demo) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-center text-2xl font-extrabold">Découvrir</h1>
        <p className="mt-1 text-center text-sm text-text-soft">
          Clique un quartier sur la carte pour le noter. (Mode démo : rien n&apos;est enregistré.)
        </p>
        <div className="mt-8">
          <QuartierCarte quartiers={demoQuartiers} demo />
        </div>

        <h2 className="mt-10 text-center font-display text-lg font-bold">Lieux recommandés pour toi</h2>
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

  // La carte se centre sur la ville d'origine : on récupère d'abord ses
  // quartiers (avec ou sans coordonnées -- ceux sans coordonnées seront
  // listés sous la carte par QuartierCarte).
  const { data: quartiersVille } = await supabase
    .from("quartiers")
    .select("id, nom, ville_code_insee, latitude, longitude, villes(nom)")
    .eq("ville_code_insee", profil.ville_origine_code)
    .limit(200);

  // Complété par un échantillon d'autres villes, pour continuer à
  // pouvoir noter des quartiers déjà visités ailleurs (comme avant, mais
  // ceux-ci n'ont pour l'instant pas de coordonnées et apparaissent donc
  // dans la liste, pas sur la carte).
  const { data: autresQuartiers } = await supabase
    .from("quartiers")
    .select("id, nom, ville_code_insee, latitude, longitude, villes(nom)")
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
      latitude: q.latitude,
      longitude: q.longitude,
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
      <p className="mt-1 text-center text-sm text-text-soft">
        Clique un quartier sur la carte pour le noter.
      </p>
      <div className="mt-8">
        {quartiers.length === 0 ? (
          <p className="text-center text-sm text-text-soft">
            Tu as déjà noté tous les quartiers disponibles pour l&apos;instant. Reviens plus tard !
          </p>
        ) : (
          <QuartierCarte quartiers={quartiers} />
        )}
      </div>

      <h2 className="mt-10 text-center font-display text-lg font-bold">Lieux recommandés pour toi</h2>
      <p className="mt-1 text-center text-sm text-text-soft">
        En fonction des quartiers que tu as aimés.
      </p>
      <div className="mt-4">
        <LieuxRecommandes lieux={recommandations ?? []} />
      </div>
    </div>
  );
}
