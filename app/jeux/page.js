import Link from 'next/link'
import Icone from '@/components/Icone'

// Espace jeux : trois façons ludiques de re-découvrir des villes et
// lieux déjà présents ailleurs sur le site (photos Wikipédia, fiches
// villes, lieux contribués par la communauté) -- rien de nouveau côté
// données, juste une autre porte d'entrée, sans compte requis pour
// jouer (comme /recherche ou /comparer).
const JEUX = [
  {
    href: '/jeux/devine-la-ville',
    icone: 'camera',
    nom: 'Devine la ville',
    description: "Une photo, quatre villes proposées. Un peu comme GeoGuessr, en plus facile.",
  },
  {
    href: '/jeux/quiz-eclair',
    icone: 'livre',
    nom: 'Quiz éclair',
    description: '10 questions par jour et par niveau, 50 niveaux à débloquer avec tes Notacoins.',
  },
  {
    href: '/jeux/chasse',
    icone: 'compass',
    nom: 'Chasse aux lieux',
    description: "Ta position live révèle les lieux contribués autour de toi -- approche-toi pour les attraper.",
  },
  {
    href: '/jeux/ville-mystere',
    icone: 'trophee',
    nom: 'Ville mystère',
    description: 'Une ville à deviner par jour, 6 essais, un indice à chaque tentative. Façon Wordle.',
  },
  {
    href: '/jeux/plus-cher-moins-cher',
    icone: 'wallet',
    nom: 'Plus cher ou moins cher ?',
    description: 'Loyer, salaire, prix d\'une bière... enchaîne les bonnes comparaisons entre deux villes.',
  },
]

export default function JeuxPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-ink">
        <Icone nom="jeu" className="h-4 w-4" />
        Espace jeux
      </p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Un peu de jeu, en plus de tes contributions</h1>
      <p className="mt-2 text-sm text-text-soft">
        Des jeux gratuits, sans engagement, pour re-découvrir les villes et les lieux du site autrement.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {JEUX.map((j) => (
          <Link
            key={j.href}
            href={j.href}
            className="flex flex-col gap-2 rounded-2xl border border-card-edge bg-card p-5 transition hover:border-amber hover:shadow-sm"
          >
            <Icone nom={j.icone} className="h-6 w-6 text-amber-ink" />
            <p className="font-display font-bold">{j.nom}</p>
            <p className="text-xs text-text-soft">{j.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
