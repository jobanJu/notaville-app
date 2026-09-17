import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/session";
import { demoProfil, demoBadges } from "@/lib/demo/data";
import Icone from "@/components/Icone";

// Une seule icône de badge (récompense), coloré par niveau plutôt
// qu'une médaille emoji différente par palier -- plus sobre, et la
// couleur seule suffit à distinguer les niveaux.
const COULEUR_NIVEAU = {
  bronze: "text-[#B08D57]",
  argent: "text-[#9CA3AF]",
  or: "text-[#D4AF37]",
  platine: "text-[#7EC8D6]",
  legendaire: "text-[#B88CE0]",
};

export default async function ProfilPage() {
  const demo = await isDemoMode();

  let profil, nbNotes, nbAvis, nbVotesDuels, nbContributionsValidees, mesBadges;

  if (demo) {
    profil = { pseudo: demoProfil.pseudo, notacoins: demoProfil.notacoins, villes: { nom: demoProfil.villeNom } };
    nbNotes = 12;
    nbAvis = 3;
    nbVotesDuels = 1;
    nbContributionsValidees = 4;
    mesBadges = demoBadges.map((b) => ({ badges: { nom: b.nom, icone: b.icone }, badge_niveaux: { niveau: b.niveau } }));
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const results = await Promise.all([
      supabase
        .from("profiles")
        .select("pseudo, notacoins, ville_origine_code, villes(nom)")
        .eq("id", user.id)
        .single(),
      supabase.from("notes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("avis").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("votes_duels")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("contributions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("statut", "validee"),
      supabase
        .from("profil_badges")
        .select("obtenu_le, badges(nom, icone), badge_niveaux(niveau)")
        .eq("user_id", user.id)
        .order("obtenu_le", { ascending: false }),
    ]);

    profil = results[0].data;
    nbNotes = results[1].count;
    nbAvis = results[2].count;
    nbVotesDuels = results[3].count;
    nbContributionsValidees = results[4].count;
    mesBadges = results[5].data;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold">{profil?.pseudo}</h1>
      <p className="mt-1 text-sm text-text-soft">
        {profil?.villes?.nom ? `Ville d'origine : ${profil.villes.nom}` : "Aucune ville choisie"}
      </p>

      <div className="mt-8 rounded-3xl border border-card-edge bg-card p-6 text-center">
        <p className="flex items-center justify-center gap-2 font-mono text-4xl font-bold text-amber-ink">
          {profil?.notacoins ?? 0}
          <Icone nom="pieces" className="h-8 w-8" strokeWidth={1.5} />
        </p>
        <p className="mt-1 text-sm text-text-soft">Notacoins cumulés</p>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-2xl border border-card-edge p-3">
          <p className="font-mono text-lg font-bold">{nbNotes ?? 0}</p>
          <p className="text-[11px] text-text-soft">quartiers notés</p>
        </div>
        <div className="rounded-2xl border border-card-edge p-3">
          <p className="font-mono text-lg font-bold">{nbAvis ?? 0}</p>
          <p className="text-[11px] text-text-soft">avis</p>
        </div>
        <div className="rounded-2xl border border-card-edge p-3">
          <p className="font-mono text-lg font-bold">{nbVotesDuels ?? 0}</p>
          <p className="text-[11px] text-text-soft">duels votés</p>
        </div>
        <div className="rounded-2xl border border-card-edge p-3">
          <p className="font-mono text-lg font-bold">{nbContributionsValidees ?? 0}</p>
          <p className="text-[11px] text-text-soft">contributions</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-soft">Badges</h2>
        {!mesBadges || mesBadges.length === 0 ? (
          <p className="mt-3 text-sm text-text-soft">
            Pas encore de badge. Complète des défis pour en débloquer.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-3">
            {mesBadges.map((b, i) => (
              <li
                key={i}
                className="flex flex-col items-center gap-1 rounded-2xl border border-card-edge p-3 text-center"
              >
                <Icone
                  nom={b.badges?.icone}
                  className={`h-6 w-6 ${COULEUR_NIVEAU[b.badge_niveaux?.niveau] ?? "text-amber-ink"}`}
                  strokeWidth={1.5}
                />
                <span className="text-xs font-semibold">{b.badges?.nom}</span>
                <span className={`text-[11px] capitalize ${COULEUR_NIVEAU[b.badge_niveaux?.niveau] ?? "text-text-soft"}`}>
                  {b.badge_niveaux?.niveau}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
