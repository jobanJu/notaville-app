import { createClient } from "@/lib/supabase/server";
import DefiActions from "@/components/DefiActions";
import Icone from "@/components/Icone";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/demo/session";
import { demoDefis, demoCategories, demoParticipantsParDefi, demoQuartiers } from "@/lib/demo/data";

const LABEL_DIFFICULTE = { facile: "Facile", moyen: "Moyen", difficile: "Difficile" };

function joursRestantsDepuis(dateFin) {
  if (!dateFin) return null;
  const ms = new Date(dateFin).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default async function DefiDetailPage({ params }) {
  const { id } = await params;
  const demo = await isDemoMode();

  if (demo) {
    const d = demoDefis.find((x) => String(x.id) === String(id));
    if (!d) notFound();
    const categorie = demoCategories.find((c) => c.id === d.categorie_id);
    const joursRestants = joursRestantsDepuis(d.date_fin);

    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-text-soft">
          <Icone nom={categorie?.icone} className="h-3.5 w-3.5" />
          {categorie?.nom}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">{d.titre}</h1>
        <p className="mt-2 text-sm text-text-soft">{d.description}</p>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-soft">
          <span>Difficulté : {LABEL_DIFFICULTE[d.difficulte] ?? "Facile"}</span>
          <span>{demoParticipantsParDefi[d.id] ?? 0} participants</span>
          {joursRestants != null && <span className="text-coral-ink">{joursRestants} j restants</span>}
        </div>

        {d.instructions && (
          <div className="mt-4 rounded-2xl border border-card-edge bg-card p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">Comment participer</p>
            <p className="mt-1.5">{d.instructions}</p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-card-edge px-4 py-3 text-sm">
          <Icone nom="trophee" className="h-4 w-4 text-amber-ink" />
          <span>
            Récompense : <strong>{d.recompense} Notacoins</strong>
            {d.type_participation === "multi_etapes" ? " par étape validée" : ""}
          </span>
        </div>

        <DefiActions
          defiId={d.id}
          typeParticipation={d.type_participation}
          cleRecompense={null}
          donneeCle={d.donnee_cle}
          etapes={d.etapes}
          palierCible={d.palier_cible}
          participationInitiale={null}
          contributionsInitiales={[]}
          quiz={d.quiz ? { question: d.quiz.question, choix: d.quiz.choix } : null}
          quartiers={demoQuartiers}
          demo
          demoQuiz={d.quiz}
        />

        <p className="mt-8 text-xs text-text-soft">
          Les contributions manifestement fausses, incohérentes ou frauduleuses peuvent entraîner
          l&apos;annulation des Notacoins associés.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: defi } = await supabase
    .from("defis")
    .select(
      "id, titre, description, instructions, type_participation, difficulte, palier_cible, date_fin, cle_recompense, donnee_cle, categories_defis(nom, icone), parametres_recompenses(valeur, description)"
    )
    .eq("id", id)
    .eq("actif", true)
    .maybeSingle();

  if (!defi) notFound();

  const [
    { data: etapes },
    { data: participation },
    { data: mesContributions },
    { data: quiz },
    { data: compteurs },
    { data: photosVotees },
    { data: profilPourLieu },
  ] = await Promise.all([
    supabase.from("defi_etapes").select("id, ordre, titre, description").eq("defi_id", id).order("ordre"),
    supabase.from("participations").select("*").eq("defi_id", id).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("contributions")
      .select("id, statut, motif_rejet, type_contribution, created_at")
      .eq("defi_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("defi_quiz").select("id, question, choix").eq("defi_id", id).maybeSingle(),
    supabase.from("v_defis_compteurs").select("nb_participants, nb_termines").eq("defi_id", id).maybeSingle(),
    defi.type_participation === "photo"
      ? supabase.from("v_classement_photos_defi").select("*").eq("defi_id", id).limit(10)
      : Promise.resolve({ data: null }),
    defi.type_participation === "lieu"
      ? supabase.from("profiles").select("ville_origine_code").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  // Pour le défi "Ajoute un lieu manquant" : quartiers de la ville
  // d'origine, pour le sélecteur du formulaire (voir supabase/11_lieux.sql).
  let quartiersPourLieu = [];
  if (defi.type_participation === "lieu" && profilPourLieu?.ville_origine_code) {
    const { data } = await supabase
      .from("quartiers")
      .select("id, nom")
      .eq("ville_code_insee", profilPourLieu.ville_origine_code)
      .order("nom");
    quartiersPourLieu = data ?? [];
  }

  const joursRestants = joursRestantsDepuis(defi.date_fin);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-text-soft">
        <Icone nom={defi.categories_defis?.icone} className="h-3.5 w-3.5" />
        {defi.categories_defis?.nom}
      </p>
      <h1 className="mt-1 text-2xl font-extrabold">{defi.titre}</h1>
      <p className="mt-2 text-sm text-text-soft">{defi.description}</p>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-soft">
        <span>Difficulté : {LABEL_DIFFICULTE[defi.difficulte] ?? "Facile"}</span>
        <span>{compteurs?.nb_participants ?? 0} participants</span>
        {joursRestants != null && <span className="text-coral-ink">{joursRestants} j restants</span>}
      </div>

      {defi.instructions && (
        <div className="mt-4 rounded-2xl border border-card-edge bg-card p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">Comment participer</p>
          <p className="mt-1.5">{defi.instructions}</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-card-edge px-4 py-3 text-sm">
        <Icone nom="trophee" className="h-4 w-4 text-amber-ink" />
        <span>
          Récompense : <strong>{defi.parametres_recompenses?.valeur ?? 0} Notacoins</strong>
          {defi.type_participation === "multi_etapes" ? " par étape validée" : ""}
        </span>
      </div>

      <DefiActions
        defiId={defi.id}
        typeParticipation={defi.type_participation}
        cleRecompense={defi.cle_recompense}
        donneeCle={defi.donnee_cle}
        etapes={etapes ?? []}
        palierCible={defi.palier_cible}
        participationInitiale={participation}
        contributionsInitiales={mesContributions ?? []}
        quiz={quiz ?? null}
        quartiers={quartiersPourLieu}
      />

      {defi.type_participation === "photo" && photosVotees && photosVotees.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">Top photos</p>
          <ol className="mt-2 flex flex-col gap-1.5">
            {photosVotees.map((p, i) => (
              <li key={p.contribution_id} className="flex items-center justify-between rounded-xl border border-card-edge px-3 py-2 text-xs">
                <span className="truncate">
                  {i + 1}. {p.photo_url}
                </span>
                <span className="shrink-0 text-amber-ink">{p.score} pts · {p.nb_votes} votes</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-8 text-xs text-text-soft">
        Les contributions manifestement fausses, incohérentes ou frauduleuses peuvent entraîner
        l&apos;annulation des Notacoins associés.
      </p>
    </div>
  );
}
