import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/session";
import JeuPopulation from "@/components/JeuPopulation";
import FondHero from "@/components/FondHero";
import Icone from "@/components/Icone";
import ClassementAccueil from "@/components/ClassementAccueil";
import HomeCitySearch from "@/components/HomeCitySearch";

// Raccourcis affichés en grille sous la recherche -- les 4 portes
// d'entrée principales de l'appli une fois connecté, façon icônes
// d'accueil (voir composants/ClassementAccueil pour "Villes populaires"
// juste en dessous).
const RACCOURCIS = [
  { href: "/decouvrir", icone: "compass", label: "Explorer" },
  { href: "/defis", icone: "trophee", label: "Défis" },
  { href: "/duels", icone: "flamme", label: "Duels" },
  { href: "/notacoins", icone: "pieces", label: "Notacoins" },
];

// icone : clé sobre résolue par components/Icone.js -- un jeu
// d'icônes trait simple (lucide-react), une seule couleur héritée du
// texte, plutôt que des émojis multicolores qui donnent tout de suite
// un genre "site fait par une IA".
const CONCEPT = [
  {
    icone: "batiment",
    titre: "Deux regards sur chaque ville",
    texte:
      "Note de vécu au quotidien par les habitants, note d'impression de passage par les voyageurs — deux réalités qu'on ne mélange jamais.",
  },
  {
    icone: "trophee",
    titre: "Des défis, pas juste des notes",
    texte:
      "Photo, prix du quotidien, quiz, lieu manquant... chaque contribution rapporte des Notacoins et fait avancer les statistiques de ta ville.",
  },
  {
    icone: "balance",
    titre: "Compare deux villes",
    texte:
      "Salaire, loyer, panier de courses, transport — un reste à vivre estimé, sur les 34 969 communes de France.",
  },
  {
    icone: "cadeau",
    titre: "Des réductions chez les commerçants",
    texte:
      "Des bons plans réels chez des commerces partenaires, ville par ville, en plus des défis.",
  },
];

export default async function Home() {
  const demo = await isDemoMode();
  let connecte = demo;

  if (!demo) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    connecte = Boolean(user);
  }

  return (
    <>
    <FondHero nom="Le Puy-en-Velay" departement="Haute-Loire">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <span className="mb-4 inline-block rounded-full border border-card-edge px-3 py-1 text-xs font-semibold uppercase tracking-wide text-mint-ink">
          Version de développement
        </span>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
          Note ta ville.{" "}
          <span className="gradient-text">Quartier par quartier.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-text-soft">
          Explore ta ville sur la carte, note les quartiers que tu connais,
          vote dans les duels de quartier, relève des défis, et cumule des
          Notacoins.
        </p>

        <div className="mx-auto mt-7 max-w-md">
          <HomeCitySearch />
        </div>

        <div className="mx-auto mt-4 grid max-w-md grid-cols-4 gap-2">
          {RACCOURCIS.map((r) => (
            <Link
              key={r.href}
              href={connecte ? r.href : "/login"}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-card-edge bg-card px-2 py-3 text-center transition hover:border-amber"
            >
              <Icone nom={r.icone} className="h-5 w-5 text-amber-ink" strokeWidth={1.75} />
              <span className="text-[11px] font-semibold text-text-soft">{r.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-6 flex justify-center gap-3">
          {connecte ? (
            <Link href="/classement" className="btn-primary">
              Continuer à noter
            </Link>
          ) : (
            <Link href="/inscription" className="btn-primary">
              Créer un compte
            </Link>
          )}
        </div>

        <JeuPopulation />
      </div>
    </FondHero>

    <ClassementAccueil />

    <div className="mx-auto max-w-4xl px-4 pb-16">
      <h2 className="text-center font-display text-xl font-bold sm:text-2xl">Le concept, en bref</h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-text-soft">
        Notaville n&apos;est pas qu&apos;un outil pour noter sa ville : c&apos;est aussi un guide
        touristique participatif, qui met en avant le patrimoine sous une forme ludique.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CONCEPT.map((c) => (
          <div key={c.titre} className="rounded-2xl border border-card-edge bg-card p-5">
            <Icone nom={c.icone} className="h-6 w-6 text-amber-ink" strokeWidth={1.5} />
            <p className="mt-2 font-display text-sm font-bold">{c.titre}</p>
            <p className="mt-1 text-sm text-text-soft">{c.texte}</p>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
