// Guides thématiques (contenu éditorial fixe, écrit une fois pour
// toutes) -- distincts des guides par ville (app/guides/ville/[code_insee],
// générés à partir des données déjà collectées). Un guide thématique
// n'a pas besoin de base de données : c'est un article de conseils,
// pas un agrégat de contributions.
export const GUIDES_THEMATIQUES = [
  {
    slug: 'choisir-son-quartier',
    icone: 'compass',
    titre: 'Comment bien choisir son quartier avant de t’installer',
    resume: 'Une bonne ville ne veut pas dire un bon quartier pour toi. Ce qui compte vraiment, et comment le vérifier avant de t’engager.',
    sections: [
      {
        titre: 'Ne te fie pas qu’à la carte',
        paragraphes: [
          'Un quartier qui a l’air central et vivant sur une carte peut être bruyant, cher ou mal desservi une fois sur place -- et inversement. Les avis des habitants, notés directement depuis leur quotidien plutôt qu’une visite touristique, en disent souvent plus qu’un plan.',
          'C’est tout l’intérêt de distinguer, sur Notaville, la note « vécu au quotidien » de la note « impression de passage » : un centre-ville peut plaire à un visiteur de passage et lasser quelqu’un qui y habite depuis deux ans.',
        ],
      },
      {
        titre: 'Teste le quotidien, pas juste le monument',
        paragraphes: [
          'Un bon quartier, c’est d’abord une boulangerie à côté, un arrêt de transport fiable, un bar où traîner sans faire trente minutes de trajet. Regarde les lieux déjà recensés dans le quartier qui t’intéresse (bars, cafés, commerces, parcs) : leur nombre et leurs notes donnent une bonne idée de la vie de quartier, bien avant d’y avoir mis les pieds.',
        ],
      },
      {
        titre: 'Le budget se joue aussi à l’échelle du quartier',
        paragraphes: [
          'Le loyer moyen d’une ville cache parfois de grands écarts d’un quartier à l’autre -- un centre-ville et une périphérie n’ont presque jamais le même prix au m². Les données « vie quotidienne » de Notaville sont pour l’instant à l’échelle de la ville : utile pour une première comparaison, mais à affiner en demandant directement aux habitants du quartier visé.',
        ],
      },
      {
        titre: 'Un bon compromis n’est pas toujours le même quartier',
        paragraphes: [
          'Le quartier le mieux noté par les touristes n’est pas forcément celui où les habitants sont le plus heureux d’habiter -- et c’est normal, ils n’y cherchent pas la même chose. Si tu déménages pour de bon, pars des avis résidents en priorité ; si tu cherches juste où sortir le temps d’un week-end, l’inverse est plus utile.',
        ],
      },
    ],
  },
  {
    slug: 'demenager-checklist',
    icone: 'valise',
    titre: 'Déménager dans une nouvelle ville : la checklist avant de signer le bail',
    resume: 'Le loyer n’est qu’une ligne du budget. Ce qu’il faut vérifier avant de s’engager, dans l’ordre.',
    sections: [
      {
        titre: 'Le vrai budget, pas juste le loyer affiché',
        paragraphes: [
          'Un loyer qui semble raisonnable peut devenir serré une fois les charges, le transport et les courses ajoutés. Le « reste à vivre » du comparateur Notaville (salaire net moyen moins loyer, courses et transport) donne une estimation concrète plutôt qu’une comparaison brute de loyers.',
          'Vérifie aussi si le chiffre affiché est un loyer T2 déclaré par des habitants ou une estimation à partir du prix au m² -- l’app le précise toujours, la nuance compte.',
        ],
      },
      {
        titre: 'Le trajet domicile-travail, pas la distance à vol d’oiseau',
        paragraphes: [
          'Deux villes à 20 km l’une de l’autre peuvent représenter 15 minutes de train ou une heure de bouchons selon les liaisons réelles. Regarde l’abonnement transport moyen de la ville visée : un chiffre élevé est souvent le signe d’un réseau peu pratique ou d’une ville qui suppose une voiture.',
        ],
      },
      {
        titre: 'Les à-côtés qui pèsent sur le quotidien',
        paragraphes: [
          'Prix d’un café, d’un repas au restaurant, d’une place de cinéma, d’un abonnement salle de sport : ce sont de petites sommes prises une par une, mais elles changent le rythme de vie qu’on peut se permettre sur place. Les fiches ville de Notaville les affichent quand la communauté les a renseignées.',
        ],
      },
      {
        titre: 'La checklist avant de signer',
        paragraphes: [
          'Compare le reste à vivre estimé, pas juste le loyer. Regarde la note des habitants du quartier visé, pas seulement celle de la ville entière. Vérifie le prix d’un abonnement transport si tu n’auras pas de voiture. Et si un chiffre te semble décisif mais absent, c’est peut-être l’occasion de répondre toi-même à un défi « vie quotidienne » une fois sur place, pour la prochaine personne dans ton cas.',
        ],
      },
    ],
  },
  {
    slug: 'comparer-cout-de-la-vie',
    icone: 'wallet',
    titre: 'Comparer le coût de la vie entre deux villes : ce qu’il faut regarder',
    resume: 'Au-delà du loyer au m², les chiffres qui donnent une vraie idée du coût de la vie -- et comment les lire sans se tromper.',
    sections: [
      {
        titre: 'Le loyer au m² ne dit pas tout',
        paragraphes: [
          'Un loyer au m² plus bas peut être compensé par des logements plus petits en moyenne, ou au contraire signaler un vrai écart de budget. Le loyer T2 déclaré directement par des habitants (quand il existe) est une donnée plus concrète que le prix au m² multiplié par une surface type.',
        ],
      },
      {
        titre: 'Regarde le salaire local, pas seulement les prix',
        paragraphes: [
          'Une ville moins chère n’est un bon plan que si les salaires n’y sont pas encore plus bas en proportion. C’est pour ça que le comparateur calcule un « reste à vivre » plutôt que d’afficher les prix seuls : ça remet chaque ville dans son propre contexte de salaire.',
        ],
      },
      {
        titre: 'Les petits plaisirs du quotidien comptent',
        paragraphes: [
          'Le prix d’une bière, d’un resto ou d’une place de cinéma ne change pas le calcul du loyer, mais il change la vie qu’on peut mener sur place avec ce qu’il reste. Deux villes à budget logement identique peuvent avoir un coût de sorties très différent.',
        ],
      },
      {
        titre: 'Comment lire les données du comparateur',
        paragraphes: [
          'Chaque donnée affiche sa provenance : Officiel (source type Insee), Communauté (moyenne des contributions des habitants) ou Estimation (calculée, comme le loyer T2 à partir du prix au m²). Une donnée manquante n’est pas mise à zéro : Notaville préfère ne rien afficher plutôt qu’inventer un chiffre, surtout pour les petites villes avec encore peu de contributions.',
          'Le plus simple reste d’ouvrir le comparateur avec les deux villes qui t’intéressent, et de regarder ligne par ligne laquelle l’emporte -- l’app fait déjà le calcul du reste à vivre pour toi.',
        ],
      },
    ],
  },
]

export function trouverGuideThematique(slug) {
  return GUIDES_THEMATIQUES.find((g) => g.slug === slug) ?? null
}
