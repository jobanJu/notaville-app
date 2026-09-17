import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/session";
import { demoVillesVisitees } from "@/lib/demo/data";
import Icone from "@/components/Icone";

function formaterDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Historique "façon Google Maps" des villes où l'utilisateur a été
// repéré (voir components/VillesVisiteesTracker.js) -- construit
// automatiquement, avec juste un lien vers la fiche de chaque ville
// pour pouvoir la noter "en direct" (avis détaillé, quartiers...) dès
// qu'elle apparaît ici. Page réservée aux comptes connectés : sans
// consentement ni connexion, il n'y a de toute façon rien à afficher.
export default async function MesVillesPage() {
  const demo = await isDemoMode();

  let villes = [];
  if (demo) {
    villes = demoVillesVisitees.map((v) => ({
      code_insee: v.codeInsee,
      ville_nom: v.villeNom,
      premiere_visite: v.premiereVisite,
      derniere_visite: v.derniereVisite,
      nb_visites: v.nbVisites,
    }));
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("villes_visitees")
      .select("code_insee, ville_nom, premiere_visite, derniere_visite, nb_visites")
      .eq("user_id", user.id)
      .order("derniere_visite", { ascending: false });
    villes = data ?? [];
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold">Mes villes visitées</h1>
      <p className="mt-1 text-sm text-text-soft">
        Construit automatiquement à partir de ta position, une fois que tu l&apos;as activé. + Notacoins à chaque
        nouvelle ville.
      </p>

      {villes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-card-edge bg-card p-6 text-center">
          <Icone nom="valise" className="mx-auto h-8 w-8 text-text-soft" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-text-soft">
            Pas encore de ville dans ton historique. Active le suivi automatique depuis la bannière proposée à
            l&apos;ouverture de l&apos;appli (ou reviens ici après ton prochain déplacement).
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {villes.map((v) => (
            <li key={v.code_insee} className="rounded-2xl border border-card-edge bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{v.ville_nom ?? `Commune ${v.code_insee}`}</p>
                  <p className="mt-0.5 text-xs text-text-soft">
                    Repérée pour la première fois le {formaterDate(v.premiere_visite)}
                  </p>
                  <p className="text-xs text-text-soft">
                    {v.nb_visites} passage{v.nb_visites > 1 ? "s" : ""} · dernier le {formaterDate(v.derniere_visite)}
                  </p>
                </div>
                <Icone nom="lieu" className="mt-0.5 h-5 w-5 shrink-0 text-mint-ink" />
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/villes/${v.code_insee}`}
                  className="rounded-full border border-card-edge px-3 py-1.5 text-xs font-semibold hover:border-amber"
                >
                  Voir la ville
                </Link>
                <Link
                  href="/avis"
                  className="rounded-full border border-card-edge px-3 py-1.5 text-xs font-semibold text-mint-ink hover:border-mint"
                >
                  Noter en direct
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
