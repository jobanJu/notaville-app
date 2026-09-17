// Libellés partagés entre la fiche ville (/villes/[code_insee]) et le
// comparateur (/comparer), pour rester cohérent partout où une donnée
// "Vie quotidienne" est affichée.
export const LABEL_DONNEE = {
  prix_biere: "Prix moyen d'une bière",
  prix_cafe: "Prix moyen d'un café",
  prix_plein: "Prix moyen d'un plein",
  panier_courses: "Panier de courses moyen",
  abonnement_transport: "Abonnement transport moyen",
  loyer_m2: "Loyer moyen (au m²)",
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
