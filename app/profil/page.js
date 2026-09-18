import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/session";
import { demoProfil, demoBadges, demoVillesVisitees } from "@/lib/demo/data";
import Icone from "@/components/Icone";
import Avatar from "@/components/Avatar";

// Transforme les lignes de mes_equipements() (une par type équipé) en
// objet {type: {nom, valeur}} pour un accès direct dans le JSX.
function indexerEquipements(lignes) {
  const parType = {};
  for (const l of lignes ?? []) parType[l.type] = l;
  return parType;
}

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

  let profil, nbNotes, nbAvis, nbVotesDuels, nbContributionsValidees, mesBadges, nbVillesVisitees, equipements;

  if (demo) {
    profil = {
      pseudo: demoProfil.pseudo,
      notacoins: demoProfil.notacoins,
      notacoins_convertibles: demoProfil.notacoinsConvertibles ?? 0,
      avatar_emoji: demoProfil.avatarEmoji,
      avatar_couleur: demoProfil.avatarCouleur,
      villes: { nom: demoProfil.villeNom },
    };
    nbNotes = 12;
    nbAvis = 3;
    nbVotesDuels = 1;
    nbContributionsValidees = 4;
    mesBadges = demoBadges.map((b) => ({ badges: { nom: b.nom, icone: b.icone }, badge_niveaux: { niveau: b.niveau } }));
    nbVillesVisitees = demoVillesVisitees.length;
    equipements = indexerEquipements(demoProfil.equipements);
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const results = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "pseudo, notacoins, notacoins_convertibles, avatar_emoji, avatar_couleur, ville_origine_code, villes(nom)"
        )
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
      supabase.from("villes_visitees").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.rpc("mes_equipements"),
    ]);

    profil = results[0].data;
    nbNotes = results[1].count;
    nbAvis = results[2].count;
    nbVotesDuels = results[3].count;
    nbContributionsValidees = results[4].count;
    mesBadges = results[5].data;
    nbVillesVisitees = results[6].count;
    equipements = indexerEquipements(results[7].data);
  }

  const titreEquipe = equipements?.titre;
  const couleurEquipee = equipements?.couleur_pseudo;
  const cadreEquipe = equipements?.cadre_pseudo;
  const badgeEquipe = equipements?.badge_cosmetique;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="flex items-center gap-3">
        <Avatar emoji={profil?.avatar_emoji} couleur={profil?.avatar_couleur} taille="lg" />
        <div className="flex items-center gap-2">
          <h1
            className={`text-2xl font-extrabold ${couleurEquipee ? couleurEquipee.valeur : ""} ${
              cadreEquipe ? `rounded-full px-2 ${cadreEquipe.valeur}` : ""
            }`}
          >
            {profil?.pseudo}
          </h1>
          {badgeEquipe && <Icone nom={badgeEquipe.valeur} className="h-5 w-5 text-amber-ink" strokeWidth={1.75} />}
        </div>
      </div>
      {titreEquipe && <p className="mt-0.5 text-xs font-semibold text-amber-ink">{titreEquipe.valeur}</p>}
      <p className="mt-1 text-sm text-text-soft">
        {profil?.villes?.nom ? `Ville d'origine : ${profil.villes.nom}` : "Aucune ville choisie"}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-card-edge bg-card p-5 text-center">
          <p className="flex items-center justify-center gap-1.5 font-mono text-2xl font-bold text-amber-ink">
            {profil?.notacoins ?? 0}
            <Icone nom="pieces" className="h-5 w-5" strokeWidth={1.5} />
          </p>
          <p className="mt-1 text-xs text-text-soft">Notacoins (boutique)</p>
        </div>
        <div className="rounded-3xl border border-card-edge bg-card p-5 text-center">
          <p className="font-mono text-2xl font-bold text-mint-ink">
            {((profil?.notacoins_convertibles ?? 0) / 10000).toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            })}
          </p>
          <p className="mt-1 text-xs text-text-soft">Solde convertible</p>
        </div>
      </div>
      {(profil?.notacoins_convertibles ?? 0) > 0 && (profil?.notacoins_convertibles ?? 0) < 100000 && (
        <p className="mt-2 text-center text-[11px] text-text-soft">
          Retrait possible à partir de 100 000 Notacoins convertibles (10 €) — voir{" "}
          <Link href="/cgu" className="text-amber-ink hover:underline">
            CGU art. 4 bis
          </Link>
          .
        </p>
      )}

      <Link
        href="/boutique"
        className="mt-5 flex items-center justify-between rounded-2xl border border-card-edge bg-card p-4"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icone nom="boutique" className="h-5 w-5 text-amber-ink" strokeWidth={1.75} />
          Boutique
        </span>
        <span className="text-sm text-text-soft">→</span>
      </Link>

      <Link
        href="/mes-villes"
        className="mt-3 flex items-center justify-between rounded-2xl border border-card-edge bg-card p-4"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icone nom="valise" className="h-5 w-5 text-mint-ink" strokeWidth={1.75} />
          Mes villes visitées
        </span>
        <span className="font-mono text-sm text-text-soft">{nbVillesVisitees ?? 0} →</span>
      </Link>

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
