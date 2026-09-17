import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo/session'
import { demoOffresPartenaires, demoProfil } from '@/lib/demo/data'
import { iconePourType, labelPourType } from '@/lib/commerces'
import Icone from '@/components/Icone'

// Page publique, sans compte requis (comme /villes, /comparer,
// /partenaires) : les offres partenaires doivent être visibles par un
// visiteur de passage, pas seulement par un compte Notaville -- c'est
// justement ce qui donne de la valeur à un partenaire. Distincte de
// /partenaires (formulaire de contact commerçant) : ici, les offres
// réellement actives (supabase/15_offres_partenaires.sql).
export default async function ReductionsPage() {
  const demo = await isDemoMode()

  let offres = [];
  let villeOrigineCode = null;

  if (demo) {
    offres = demoOffresPartenaires.map((o) => ({ ...o }));
    villeOrigineCode = demoProfil.ville_origine_code;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from('offres_partenaires')
      .select('id, nom_commerce, type_commerce, ville_code_insee, reduction, description, conditions, date_fin, villes(nom)')
      .eq('actif', true)
      .order('ordre');
    offres = (data ?? []).map((o) => ({ ...o, ville_nom: o.villes?.nom ?? null }));

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profil } = await supabase
        .from('profiles')
        .select('ville_origine_code')
        .eq('id', user.id)
        .single();
      villeOrigineCode = profil?.ville_origine_code ?? null;
    }
  }

  const proches = villeOrigineCode ? offres.filter((o) => o.ville_code_insee === villeOrigineCode) : [];
  const autres = offres.filter((o) => !proches.some((p) => p.id === o.id));

  function CarteOffre({ o }) {
    return (
      <div className="rounded-2xl border border-card-edge bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-sm font-bold">{o.nom_commerce}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-text-soft">
              <Icone nom={iconePourType(o.type_commerce)} className="h-3.5 w-3.5" />
              {labelPourType(o.type_commerce)} · {o.ville_nom}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-gradient-to-r from-coral to-amber px-3 py-1 text-xs font-bold text-[#2A0F0F]">
            {o.reduction}
          </span>
        </div>
        {o.description && <p className="mt-2 text-sm">{o.description}</p>}
        {o.conditions && <p className="mt-1 text-xs text-text-soft">{o.conditions}</p>}
        {o.date_fin && (
          <p className="mt-2 text-[11px] text-coral-ink">
            Valable jusqu&apos;au {new Date(o.date_fin).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-card-edge px-3 py-1 text-xs font-semibold uppercase tracking-wide text-mint-ink">
        <Icone nom="cadeau" className="h-3.5 w-3.5" />
        Offres partenaires
      </span>
      <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
        Des <span className="gradient-text">réductions</span> chez les commerçants de ta ville
      </h1>
      <p className="mt-4 max-w-xl text-text-soft">
        Des bons plans chez des commerces partenaires, ville par ville. Une adresse à proposer ?{' '}
        <Link href="/partenaires" className="text-amber-ink hover:underline">
          Deviens partenaire
        </Link>
        .
      </p>

      {proches.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold">Près de chez toi</h2>
          <div className="mt-3 flex flex-col gap-3">
            {proches.map((o) => (
              <CarteOffre key={o.id} o={o} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold">{proches.length > 0 ? 'Autres villes' : 'Offres du moment'}</h2>
        {autres.length === 0 ? (
          <p className="mt-3 text-sm text-text-soft">Pas encore d&apos;offre ailleurs pour l&apos;instant.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {autres.map((o) => (
              <CarteOffre key={o.id} o={o} />
            ))}
          </div>
        )}
      </div>

      {offres.length === 0 && (
        <p className="mt-8 text-center text-sm text-text-soft">
          Pas encore d&apos;offre partenaire en ligne.{' '}
          <Link href="/partenaires" className="text-amber-ink hover:underline">
            Tu es commerçant ? Deviens le premier partenaire de ta ville.
          </Link>
        </p>
      )}
    </div>
  );
}
