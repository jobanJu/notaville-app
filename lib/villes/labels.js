// Libellés partagés entre la fiche ville (/villes/[code_insee]) et le
// comparateur (/comparer), pour rester cohérent partout où une donnée
// "Vie quotidienne" est affichée.
export const LABEL_DONNEE = {
  prix_biere: "Prix moyen d'une bière",
  prix_cafe: "Prix moyen d'un café",
  prix_plein: "Prix moyen d'un plein",
  panier_courses: "Panier de courses moyen",
  abonnement_transport: "Abonnement transport moyen",
  loyer_t2: "Loyer moyen d'un T2",
  prix_resto: "Prix moyen d'un repas au restaurant",
  prix_cinema: "Prix moyen d'une place de cinéma",
  abonnement_sport: "Abonnement salle de sport moyen",
  salaire_net_mensuel: "Salaire net moyen",
}

export const LABEL_PROVENANCE = {
  officiel: { texte: 'Officiel', classe: 'border-mint text-mint-ink' },
  communaute: { texte: 'Communauté', classe: 'border-amber text-amber-ink' },
  estimation: { texte: 'Estimation Notaville', classe: 'border-text-soft text-text-soft' },
}

// loyer_m2 existe toujours en base (contributions, données officielles)
// mais ne doit plus jamais apparaître comme sa propre ligne affichée ou
// comparable : depuis l'ajout de loyer_t2 (vrai loyer d'un T2), l'afficher
// en plus serait redondant. On le garde uniquement comme repli interne
// pour estimer un loyer de T2 quand la donnée réelle manque (voir
// loyerT2Estime() dans lib/villes/budget.js) -- jamais montré tel quel.
export const DONNEES_MASQUEES = new Set(['loyer_m2'])

// À utiliser partout où `fiche.stats` est énuméré pour un affichage ou
// une comparaison (page ville, comparateur, jeu "plus cher/moins cher") --
// pas dans budget.js, qui doit continuer à lire loyer_m2 pour son repli.
export function statsAffichables(stats) {
  return (stats ?? []).filter((s) => !DONNEES_MASQUEES.has(s.donnee_cle))
}
