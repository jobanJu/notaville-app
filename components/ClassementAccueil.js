import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/session";
import { demoClassementResidents } from "@/lib/demo/data";
import ImageVille from "@/components/ImageVille";
import Icone from "@/components/Icone";

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
    <div className="mx-auto max-w-4xl px-4 pb-16">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-0">
        <div>
          <h2 className="font-display text-xl font-bold sm:text-2xl">Villes populaires</h2>
          <p className="mt-1 text-sm text-text-soft">Les mieux notées par leurs habitants, en ce moment.</p>
        </div>
        <Link href="/classement" className="shrink-0 text-sm font-semibold text-mint-ink hover:underline">
          Voir tout
        </Link>
      </div>

      <div className="mt-5 flex gap-3 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:px-0">
        {villes.map((v) => (
          <Link
            key={v.code_insee}
            href={`/villes/${v.code_insee}`}
            className="group relative aspect-[3/4] w-36 shrink-0 overflow-hidden rounded-2xl border border-card-edge sm:w-auto"
          >
            <ImageVille nom={v.ville} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="truncate font-display text-sm font-bold text-white">{v.ville}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-amber-ink">
                <Icone nom="trophee" className="h-3 w-3" />
                {v.note_moyenne}/5
                <span className="font-normal text-white/70">· {v.nb_avis} avis</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
