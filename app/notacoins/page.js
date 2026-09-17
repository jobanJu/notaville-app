import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/session";
import { demoBaremeNotacoins } from "@/lib/demo/data";
import Icone from "@/components/Icone";

// Page publique de transparence sur les Notacoins, listée à côté des
// CGU (voir Footer.js) : comment on les gagne, combien, et les
// plafonds anti-abus -- lit directement la vue v_bareme_notacoins
// (supabase/23_notacoins_jeux.sql), qui reflète en temps réel la
// config admin (parametres_recompenses / limites_anti_abus), jamais un
// barème recopié à la main qui pourrait se désynchroniser du vrai.
export default async function NotacoinsPage() {
  const demo = await isDemoMode();

  const bareme = demo
    ? demoBaremeNotacoins
    : await (async () => {
        const supabase = await createClient();
        const { data } = await supabase.from("v_bareme_notacoins").select("*");
        return data ?? [];
      })();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-ink">
        <Icone nom="pieces" className="h-4 w-4" />
        Les Notacoins
      </p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Comment gagner des Notacoins</h1>
      <p className="mt-2 text-sm text-text-soft">
        Chaque contribution réelle au site (avis, défis, votes) et chaque partie gagnée dans l&apos;espace{" "}
        <a href="/jeux" className="underline hover:text-text">Jeux</a> rapporte des Notacoins. Un plafond quotidien
        s&apos;applique à chaque action pour éviter les abus — il n&apos;empêche jamais de continuer à contribuer,
        seul le gain s&apos;arrête une fois le plafond atteint pour la journée.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-card-edge">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 bg-bg-soft px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-soft sm:grid-cols-[1fr_auto_auto]">
          <span>Action</span>
          <span className="text-right">Notacoins</span>
          <span className="hidden text-right sm:block">Plafond / jour</span>
        </div>
        {bareme.map((ligne) => (
          <div
            key={ligne.cle}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-t border-card-edge px-5 py-3.5 sm:grid-cols-[1fr_auto_auto]"
          >
            <p className="text-sm">{ligne.description}</p>
            <span className="text-right font-mono text-sm font-bold text-amber-ink">+{ligne.valeur}</span>
            <span className="col-span-2 text-xs text-text-soft sm:col-span-1 sm:text-right">
              {ligne.max_par_jour ? `${ligne.max_par_jour} / jour` : "Sans plafond"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-card-edge bg-card p-5 text-sm text-text-soft">
        <p className="font-display font-bold text-text">Bon à savoir</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Les jeux rapportent volontairement moins que les vraies contributions (avis, défis) : ce sont un bonus ludique, pas le moyen principal de progresser.</li>
          <li>Les défis avec photo ne créditent leurs Notacoins qu&apos;une fois validés par un administrateur.</li>
          <li>Ces montants peuvent évoluer avec le temps, pour garder l&apos;équilibre du jeu — cette page reflète toujours le barème réellement en vigueur.</li>
        </ul>
      </div>
    </div>
  );
}
