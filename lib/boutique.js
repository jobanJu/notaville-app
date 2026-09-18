// Libellés/aides pour la boutique cosmétique (badges, cadres, couleurs
// de pseudo, titres achetables en Notacoins -- voir supabase/32).
export const LABEL_TYPE_ARTICLE = {
  badge_cosmetique: 'Badge',
  cadre_pseudo: 'Cadre',
  couleur_pseudo: 'Couleur',
  titre: 'Titre',
}

export function labelTypeArticle(type) {
  return LABEL_TYPE_ARTICLE[type] ?? type
}
