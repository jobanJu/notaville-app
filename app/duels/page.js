import { createClient } from "@/lib/supabase/server";
import BattleCard from "@/components/BattleCard";
import { isDemoMode } from "@/lib/demo/session";
import { demoDuel } from "@/lib/demo/data";

// Anciennement /defis : duel de quartier (Wazemmes vs Moulins). Renommé
// en /duels pour libérer /defis, qui devient le hub du nouveau système
// de gamification (voir app/defis/page.js).
export default async function DuelsPage() {
  const demo = await isDemoMode();

  if (demo) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-extrabold">Duel de quartier</h1>
        <p className="mt-1 text-sm text-text-soft">
          Vote pour celui qui a le plus d&apos;ambiance à tes yeux. (Mode démo)
        </p>
        <div className="mt-8">
          <BattleCard
            duelId={demoDuel.id}
            quartierA={demoDuel.quartierA}
            quartierB={demoDuel.quartierB}
            votesInitiauxA={demoDuel.votesA}
            votesInitiauxB={demoDuel.votesB}
            voteInitial={null}
            demo
          />
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: duel } = await supabase
    .from("duels_quartier")
    .select("id, quartier_a_id, quartier_b_id, termine_le")
    .eq("resolu", false)
    .gt("termine_le", new Date().toISOString())
    .order("debute_le", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!duel) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-text-soft">
        Aucun duel en cours pour le moment. Reviens bientôt !
      </div>
    );
  }

  const [{ data: quartierA }, { data: quartierB }, { data: monVote }] = await Promise.all([
    supabase.from("quartiers").select("id, nom, villes(nom)").eq("id", duel.quartier_a_id).single(),
    supabase.from("quartiers").select("id, nom, villes(nom)").eq("id", duel.quartier_b_id).single(),
    supabase.from("votes_duels").select("quartier_choisi_id").eq("duel_id", duel.id).eq("user_id", user.id).maybeSingle(),
  ]);

  const { count: votesA } = await supabase
    .from("votes_duels")
    .select("*", { count: "exact", head: true })
    .eq("duel_id", duel.id)
    .eq("quartier_choisi_id", duel.quartier_a_id);

  const { count: votesB } = await supabase
    .from("votes_duels")
    .select("*", { count: "exact", head: true })
    .eq("duel_id", duel.id)
    .eq("quartier_choisi_id", duel.quartier_b_id);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold">Duel de quartier</h1>
      <p className="mt-1 text-sm text-text-soft">
        Vote pour celui qui a le plus d&apos;ambiance à tes yeux.
      </p>

      <div className="mt-8">
        <BattleCard
          duelId={duel.id}
          quartierA={{ id: quartierA.id, nom: quartierA.nom, ville: quartierA.villes?.nom }}
          quartierB={{ id: quartierB.id, nom: quartierB.nom, ville: quartierB.villes?.nom }}
          votesInitiauxA={votesA ?? 0}
          votesInitiauxB={votesB ?? 0}
          voteInitial={monVote?.quartier_choisi_id ?? null}
        />
      </div>
    </div>
  );
}
