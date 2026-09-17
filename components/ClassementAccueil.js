import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/session";
import { demoClassementResidents } from "@/lib/demo/data";
import ImageVille from "@/components/ImageVille";

// Classement en direct sur la page d'accueil : donne tout de suite un
// aperçu concret de l'activité réelle de la communauté à un visiteur
// qui arrive pour la première fois, plutôt que de le renvoyer vers une
// page à part pour le voir. Reprend les 5 premières villes du
// classement "Vécu au quotidien" (résidents) -- la perspective la plus
// proche du concept de base de Notaville. Le classement complet (avec
// l'onglet voyageurs) reste sur /classement.
export default async function ClassementAccueil() {
  const demo = await isDemoMode();

  const villes = demo
    ? demoClassementResidents
    : await (async () => {
        const supabase = await createClient();
        const { data } = await supabase
          .from("v_classement_residents")
          .select("*")
          .limit(5);
        return data ?? [];
      })();

  if (villes.length === 0) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Le classement en direct</h2>
        <Link href="/classement" className="text-sm font-semibold text-mint-ink hover:underline">
          Voir tout
        </Link>
      </div>
      <p className="mt-1 text-sm text-text-soft">Les mieux notées par leurs habitants, en ce moment.</p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-card-edge">
        {villes.map((v, i) => (
          <Link
            key={v.code_insee}
            href={`/villes/${v.code_insee}`}
            className="flex items-center gap-4 border-b border-card-edge px-5 py-3.5 last:border-0 hover:bg-bg-soft"
          >
            <span className="w-6 font-mono text-sm text-text-soft">{i + 1}</span>
            <ImageVille nom={v.ville} className="h-10 w-10 flex-shrink-0 rounded-xl" />
            <div className="flex-1">
              <p className="font-semibold">{v.ville}</p>
              <p className="text-xs text-text-soft">{v.region}</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm">{v.note_moyenne}/5</span>
              <span className="block text-xs text-text-soft">{v.nb_avis} avis</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
