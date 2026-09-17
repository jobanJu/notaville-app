import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/demo/session";
import { demoFichesVilles } from "@/lib/demo/data";
import { trouverVilleFrParCode } from "@/lib/demo/villesFrServeur";
import { LABEL_DONNEE, LABEL_PROVENANCE } from "@/lib/villes/labels";
import ImageVille from "@/components/ImageVille";
import Icone from "@/components/Icone";

// Page publique, sans compte requis : les statistiques de ville restent
// gratuites et accessibles à tous, défis ou pas (cahier des charges,
// section 14). Toutes les données passent par la fonction
// `fiche_ville`, qui ne renvoie jamais de ligne individuelle.
export default async function VilleDetailPage({ params }) {
  const { code_insee } = await params;
  const demo = await isDemoMode();

  let fiche;
  if (demo) {
    // En vrai Supabase, fiche_ville() ne renvoie jamais null pour une
    // ville qui existe : au minimum nom/departement/population/notes,
    // stats: []. Le mode démo doit se comporter pareil -- sinon toute
    // ville hors Lille/Paris/Lyon (les 3 seules avec des stats "vie
    // quotidienne" simulées, ex. Perpignan) tombait en 404 alors
    // qu'elle existe bel et bien dans les 34 969 communes.
    fiche = demoFichesVilles[code_insee] ?? null;
    if (!fiche) {
      const ville = await trouverVilleFrParCode(code_insee);
      if (ville) {
        fiche = {
          code_insee: ville.code_insee,
          nom: ville.nom,
          departement: ville.departement,
          region: ville.region,
          population: ville.population,
          note_habitants: null,
          nb_avis_habitants: 0,
          note_touristes: null,
          nb_avis_touristes: 0,
          stats: [],
          derniere_maj: new Date().toISOString(),
        };
      }
    }
  } else {
    const supabase = await createClient();
    const { data } = await supabase.rpc("fiche_ville", { p_code_insee: code_insee });
    fiche = data;
  }

  if (!fiche) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <ImageVille
        nom={fiche.nom}
        departement={fiche.departement}
        className="h-44 w-full rounded-2xl"
        messageAbsent="Pas encore de photo — relève le défi « Plus belle vue » pour changer ça !"
      />
      <h1 className="mt-4 text-2xl font-extrabold">{fiche.nom}</h1>
      <p className="mt-1 text-sm text-text-soft">
        {fiche.departement} · {fiche.region}
        {fiche.population ? ` · ${fiche.population.toLocaleString("fr-FR")} habitants` : ""}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-card-edge bg-card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-amber-ink">{fiche.note_habitants ?? "—"}{fiche.note_habitants ? "/5" : ""}</p>
          <p className="mt-1 text-xs text-text-soft">Note habitants ({fiche.nb_avis_habitants} avis)</p>
        </div>
        <div className="rounded-2xl border border-card-edge bg-card p-4 text-center">
          <p className="font-mono text-2xl font-bold text-amber-ink">{fiche.note_touristes ?? "—"}{fiche.note_touristes ? "/5" : ""}</p>
          <p className="mt-1 text-xs text-text-soft">Note touristes ({fiche.nb_avis_touristes} avis)</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold">Coût de la vie</h2>
        {(!fiche.stats || fiche.stats.length === 0) ? (
          <p className="mt-3 text-sm text-text-soft">
            Pas encore assez de contributions pour cette ville. Sois le premier à répondre à un défi
            &laquo;&nbsp;Vie quotidienne&nbsp;&raquo; !
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {fiche.stats.map((s) => (
              <div key={s.donnee_cle} className="flex items-center justify-between rounded-2xl border border-card-edge bg-card p-4">
                <div>
                  <p className="font-semibold">{LABEL_DONNEE[s.donnee_cle] ?? s.donnee_cle}</p>
                  <p className="mt-1 text-[11px] text-text-soft">
                    {s.nb_contributions ? `${s.nb_contributions} contributions · ` : ""}
                    {s.date_maj_officielle ? `màj le ${new Date(s.date_maj_officielle).toLocaleDateString("fr-FR")}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-amber-ink">
                    {Number(s.valeur).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                      LABEL_PROVENANCE[s.provenance]?.classe ?? "border-card-edge text-text-soft"
                    }`}
                  >
                    {LABEL_PROVENANCE[s.provenance]?.texte ?? s.provenance}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/comparer?a=${code_insee}`}
        className="mt-6 flex items-center justify-center gap-2 rounded-full border border-card-edge px-4 py-2.5 text-sm hover:border-amber"
      >
        <Icone nom="balance" className="h-4 w-4" />
        Comparer {fiche.nom} à une autre ville
      </Link>

      <p className="mt-8 text-xs text-text-soft">
        Dernière mise à jour de cette page : {new Date(fiche.derniere_maj).toLocaleString("fr-FR")}
      </p>
    </div>
  );
}
