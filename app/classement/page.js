import { createClient } from "@/lib/supabase/server";
import ClassementTabs from "@/components/ClassementTabs";
import EtablissementsClassement from "@/components/EtablissementsClassement";
import { isDemoMode } from "@/lib/demo/session";
import { demoClassementResidents, demoClassementVoyageurs } from "@/lib/demo/data";

export default async function ClassementPage() {
  const demo = await isDemoMode();

  const [residents, voyageurs] = demo
    ? [demoClassementResidents, demoClassementVoyageurs]
    : await (async () => {
        const supabase = await createClient();
        const [{ data: r }, { data: v }] = await Promise.all([
          supabase.from("v_classement_residents").select("*").limit(20),
          supabase.from("v_classement_voyageurs").select("*").limit(20),
        ]);
        return [r ?? [], v ?? []];
      })();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold">Ça matche où en ce moment</h1>
      <p className="mt-1 text-sm text-text-soft">Deux classements, deux réalités.</p>

      <div className="mt-8">
        <ClassementTabs residents={residents} voyageurs={voyageurs} />
      </div>

      <div className="mt-12 border-t border-card-edge pt-8">
        <h2 className="text-xl font-extrabold">Les mieux notés de France</h2>
        <p className="mt-1 text-sm text-text-soft">
          Hôpitaux, gares, services publics, écoles — classés par les avis de la communauté, à partir de 3
          avis.
        </p>
        <div className="mt-5">
          <EtablissementsClassement />
        </div>
      </div>
    </div>
  );
}
