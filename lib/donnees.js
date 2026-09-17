// Bornes de plausibilité pour les contributions "Vie quotidienne"
// (défis de type contribution_donnee). Objectif : bloquer une saisie
// absurde ou une tentative de fausser les moyennes (ex: 0€ ou
// 999999€ de loyer), sans jamais bloquer une vraie valeur, même rare.
// Les bornes sont volontairement larges -- ce n'est pas un contrôle
// fiscal, juste un garde-fou anti-abus. Reflété côté base par une
// contrainte CHECK (voir supabase/18_bornes_contributions.sql), donc
// même un appel direct à l'API Supabase (hors de cette interface) ne
// peut pas les contourner.
export const BORNES_DONNEE = {
  salaire_net_mensuel: { min: 200, max: 15000, unite: '€/mois' },
  loyer_m2: { min: 2, max: 60, unite: '€/m²' },
  loyer_t2: { min: 200, max: 3000, unite: '€/mois' },
  prix_biere: { min: 0.5, max: 15, unite: '€' },
  prix_cafe: { min: 0.5, max: 8, unite: '€' },
  prix_plein: { min: 15, max: 150, unite: '€' },
  prix_resto: { min: 5, max: 100, unite: '€' },
  prix_cinema: { min: 3, max: 25, unite: '€' },
  panier_courses: { min: 5, max: 300, unite: '€' },
  abonnement_transport: { min: 3, max: 150, unite: '€/mois' },
  abonnement_sport: { min: 5, max: 200, unite: '€/mois' },
}

// Retourne un message d'erreur si la valeur est hors bornes pour cette
// donnee_cle, ou null si tout va bien (donnee_cle inconnue = pas de
// contrôle, pour ne jamais bloquer un futur type de donnée par erreur).
export function erreurBorneDonnee(donneeCle, valeur) {
  const bornes = BORNES_DONNEE[donneeCle]
  if (!bornes) return null
  const n = Number(valeur)
  if (Number.isNaN(n)) return 'Merci de saisir un nombre.'
  if (n < bornes.min || n > bornes.max) {
    return `Valeur peu plausible : entre ${bornes.min} et ${bornes.max} ${bornes.unite} attendus.`
  }
  return null
}
