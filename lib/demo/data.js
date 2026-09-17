// Données 100% factices pour le mode démo (compte de test Test1/1234).
// Aucun appel réseau, aucune persistance : tout revit à zéro au
// rechargement de la page. Sert uniquement à cliquer dans l'interface
// sans avoir de projet Supabase branché. La vraie app (avec un vrai
// Supabase) n'utilise jamais ce fichier.

// La recherche de ville en démo (CitySearch, /villes, /comparer) porte
// désormais sur les 34 969 communes réelles -- voir lib/demo/villesFr.js
// (chargées à la demande depuis public/data/villes-fr.json, pas
// embarquées ici). L'ancienne liste de 6 villes fabriquées à la main
// avait une erreur de code INSEE (59512 = Roubaix, pas Tourcoing).

// latitude/longitude : repères approximatifs (centre de quartier), pas
// un relevé GPS -- suffisants pour afficher des punaises cliquables à la
// bonne échelle sur la carte de /decouvrir.
export const demoQuartiers = [
  { id: 'q1', nom: 'Vieux-Lille', villeCode: '59350', villeNom: 'Lille', latitude: 50.6407, longitude: 3.0603 },
  { id: 'q2', nom: 'Wazemmes', villeCode: '59350', villeNom: 'Lille', latitude: 50.6229, longitude: 3.0454 },
  { id: 'q3', nom: 'Lille-Moulins', villeCode: '59350', villeNom: 'Lille', latitude: 50.6231, longitude: 3.0653 },
  { id: 'q4', nom: 'Vauban-Esquermes', villeCode: '59350', villeNom: 'Lille', latitude: 50.6255, longitude: 3.0500 },
  { id: 'q5', nom: 'Fives', villeCode: '59350', villeNom: 'Lille', latitude: 50.6339, longitude: 3.0827 },
  { id: 'q6', nom: 'Bois-Blancs', villeCode: '59350', villeNom: 'Lille', latitude: 50.6420, longitude: 3.0295 },
  { id: 'q7', nom: 'Lille-Centre', villeCode: '59350', villeNom: 'Lille', latitude: 50.6365, longitude: 3.0635 },
  { id: 'q8', nom: 'Faubourg de Béthune', villeCode: '59350', villeNom: 'Lille', latitude: 50.6155, longitude: 3.0400 },
  { id: 'q9', nom: 'Lille-Sud', villeCode: '59350', villeNom: 'Lille', latitude: 50.6091, longitude: 3.0503 },
  { id: 'q10', nom: 'Saint-Maurice Pellevoisin', villeCode: '59350', villeNom: 'Lille', latitude: 50.6420, longitude: 3.0750 },
  { id: 'q11', nom: 'Hellemmes', villeCode: '59350', villeNom: 'Lille', latitude: 50.6280, longitude: 3.1000 },
  { id: 'q12', nom: 'Lomme', villeCode: '59350', villeNom: 'Lille', latitude: 50.6396, longitude: 3.0102 },
]

// Recommandations démo : fixes, pas recalculées à partir des clics sur
// la carte (le mode démo n'a pas d'état partagé entre composants) --
// simule ce que renverrait recommander_lieux() une fois quelques
// quartiers aimés.
// latitude/longitude reprises du quartier du lieu (voir demoQuartiers
// ci-dessus) -- servent à la recherche géolocalisée (/recherche).
export const demoLieux = [
  { id: 1, niveauPrix: 1, nom: 'Le Vivat', type: 'bar', description: 'Bar de quartier convivial près de la place, quelques bières pression et une terrasse au soleil.', quartierNom: 'Wazemmes', villeNom: 'Lille', noteMoyenne: 4.3, nbAvis: 28, latitude: 50.6229, longitude: 3.0454 },
  { id: 2, nom: 'Marché de Wazemmes', type: 'autre', description: 'Marché couvert et de plein air, tous les matins.', quartierNom: 'Wazemmes', villeNom: 'Lille', noteMoyenne: 4.7, nbAvis: 112, latitude: 50.6229, longitude: 3.0454 },
  { id: 3, nom: 'Meert', type: 'boutique', description: 'Pâtisserie historique, célèbre pour ses gaufres fourrées à la vanille.', quartierNom: 'Vieux-Lille', villeNom: 'Lille', noteMoyenne: 4.6, nbAvis: 89, latitude: 50.6407, longitude: 3.0603 },
  { id: 4, niveauPrix: 2, nom: 'La Chicorée', type: 'restaurant', description: 'Brasserie historique, spécialités du Nord.', quartierNom: 'Vieux-Lille', villeNom: 'Lille', noteMoyenne: 4.1, nbAvis: 54, latitude: 50.6407, longitude: 3.0603 },
  { id: 5, nom: 'Citadelle de Lille', type: 'monument', description: "Fortification Vauban du XVIIe siècle, en partie boisée et ouverte au public.", quartierNom: 'Vauban-Esquermes', villeNom: 'Lille', noteMoyenne: 4.8, nbAvis: 201, latitude: 50.6255, longitude: 3.0500 },
  { id: 6, niveauPrix: 1, nom: 'Brasserie Théâtre', type: 'bar', description: 'Grande sélection de bières belges et locales à la pression, terrasse animée en soirée.', quartierNom: 'Lille-Centre', villeNom: 'Lille', noteMoyenne: 4.4, nbAvis: 76, latitude: 50.6365, longitude: 3.0635 },
  { id: 7, niveauPrix: 1, nom: 'Au Blé d\'Or', type: 'bar', description: 'Bar à bières artisanales, une trentaine de références du Nord et de Belgique.', quartierNom: 'Vauban-Esquermes', villeNom: 'Lille', noteMoyenne: 4.6, nbAvis: 143, latitude: 50.6255, longitude: 3.0500 },
  { id: 8, nom: 'Palais des Beaux-Arts', type: 'musee', description: "Un des plus grands musées de France hors Paris : peinture, sculpture et céramique du XVe au XXe siècle.", quartierNom: 'Lille-Centre', villeNom: 'Lille', noteMoyenne: 4.7, nbAvis: 312, latitude: 50.6365, longitude: 3.0635 },
  { id: 9, niveauPrix: 2, nom: 'Le Comptoir des Moulins', type: 'restaurant', description: 'Petit restaurant familial, cuisine du Maghreb et plats mijotés faits maison.', quartierNom: 'Lille-Moulins', villeNom: 'Lille', noteMoyenne: 4.5, nbAvis: 63, latitude: 50.6231, longitude: 3.0653 },
  { id: 10, nom: 'Épicerie des Moulins', type: 'boutique', description: 'Épicerie fine et produits du monde, petits producteurs locaux.', quartierNom: 'Lille-Moulins', villeNom: 'Lille', noteMoyenne: 4.3, nbAvis: 29, latitude: 50.6231, longitude: 3.0653 },
  { id: 11, niveauPrix: 1, nom: 'Fives Café', type: 'cafe', description: 'Café associatif, concerts le soir et brunch le dimanche.', quartierNom: 'Fives', villeNom: 'Lille', noteMoyenne: 4.2, nbAvis: 47, latitude: 50.6339, longitude: 3.0827 },
  { id: 12, nom: "L'Atelier Fives", type: 'autre', description: 'Lieu culturel associatif : ateliers, expositions et fablab ouvert au public.', quartierNom: 'Fives', villeNom: 'Lille', noteMoyenne: 4.4, nbAvis: 22, latitude: 50.6339, longitude: 3.0827 },
  { id: 13, niveauPrix: 2, nom: 'Le Canal', type: 'restaurant', description: 'Cuisine bistrot, terrasse au bord de la Deûle aux beaux jours.', quartierNom: 'Bois-Blancs', villeNom: 'Lille', noteMoyenne: 4.3, nbAvis: 58, latitude: 50.6420, longitude: 3.0295 },
  { id: 14, nom: 'Jardin des Bois-Blancs', type: 'parc', description: 'Promenade arborée au bord de l\'eau, aire de jeux pour enfants.', quartierNom: 'Bois-Blancs', villeNom: 'Lille', noteMoyenne: 4.5, nbAvis: 71, latitude: 50.6420, longitude: 3.0295 },
  { id: 15, nom: 'Marché du Faubourg', type: 'autre', description: 'Petit marché de quartier, produits frais et locaux le week-end.', quartierNom: 'Faubourg de Béthune', villeNom: 'Lille', noteMoyenne: 4.1, nbAvis: 34, latitude: 50.6155, longitude: 3.0400 },
  { id: 16, niveauPrix: 1, nom: 'Le Petit Béthune', type: 'restaurant', description: 'Cuisine familiale, plat du jour et ardoise qui change chaque semaine.', quartierNom: 'Faubourg de Béthune', villeNom: 'Lille', noteMoyenne: 4.2, nbAvis: 41, latitude: 50.6155, longitude: 3.0400 },
  { id: 17, nom: 'Parc Sud', type: 'parc', description: 'Grand espace vert avec aire de jeux et terrain de sport en accès libre.', quartierNom: 'Lille-Sud', villeNom: 'Lille', noteMoyenne: 4.0, nbAvis: 52, latitude: 50.6091, longitude: 3.0503 },
  { id: 18, niveauPrix: 1, nom: 'Boulangerie du Sud', type: 'boutique', description: 'Boulangerie artisanale, pain au levain cuit au feu de bois.', quartierNom: 'Lille-Sud', villeNom: 'Lille', noteMoyenne: 4.6, nbAvis: 87, latitude: 50.6091, longitude: 3.0503 },
  { id: 19, nom: 'Café Pellevoisin', type: 'cafe', description: 'Petit café de quartier, terrasse calme et service à l\'ancienne.', quartierNom: 'Saint-Maurice Pellevoisin', villeNom: 'Lille', noteMoyenne: 4.3, nbAvis: 26, latitude: 50.6420, longitude: 3.0750 },
  { id: 20, nom: 'Brocante Pellevoisin', type: 'boutique', description: 'Meubles et objets vintage chinés, brocante permanente.', quartierNom: 'Saint-Maurice Pellevoisin', villeNom: 'Lille', noteMoyenne: 4.4, nbAvis: 19, latitude: 50.6420, longitude: 3.0750 },
  { id: 21, niveauPrix: 2, nom: 'Le Hellemmois', type: 'restaurant', description: 'Bistrot de quartier, cuisine traditionnelle et plats généreux.', quartierNom: 'Hellemmes', villeNom: 'Lille', noteMoyenne: 4.4, nbAvis: 49, latitude: 50.6280, longitude: 3.1000 },
  { id: 22, nom: "Marché d'Hellemmes", type: 'autre', description: 'Marché de quartier le dimanche matin, producteurs locaux.', quartierNom: 'Hellemmes', villeNom: 'Lille', noteMoyenne: 4.5, nbAvis: 38, latitude: 50.6280, longitude: 3.1000 },
  { id: 23, nom: 'Parc de la Deûle', type: 'parc', description: 'Grand parc familial avec vue sur le canal, idéal pour le vélo et le jogging.', quartierNom: 'Lomme', villeNom: 'Lille', noteMoyenne: 4.6, nbAvis: 94, latitude: 50.6396, longitude: 3.0102 },
  { id: 24, niveauPrix: 2, nom: 'Hôtel du Moulin', type: 'hotel', description: 'Petit hôtel calme en bord de Lomme, chambres simples et accueil familial.', quartierNom: 'Lomme', villeNom: 'Lille', noteMoyenne: 4.2, nbAvis: 33, latitude: 50.6396, longitude: 3.0102 },
]

// Établissements publics notés (classement national par type,
// /classement) : hôpitaux, gares, services publics, écoles. Rattachés
// à une ville entière (pas un quartier, contrairement à demoLieux) --
// un hôpital ou une gare dessert toute la ville. Réparti sur plusieurs
// villes démo pour que le classement soit réellement national plutôt
// que Lille uniquement.
export const demoEtablissements = [
  { id: 1, nom: 'CHU de Lille', type: 'hopital', villeNom: 'Lille', departement: 'Nord', noteMoyenne: 3.6, nbAvis: 78 },
  { id: 2, nom: 'CHU Lyon Sud', type: 'hopital', villeNom: 'Lyon', departement: 'Rhône', noteMoyenne: 3.8, nbAvis: 54 },
  { id: 3, nom: 'Hôpital Saint-Louis', type: 'hopital', villeNom: 'Paris', departement: 'Paris', noteMoyenne: 3.9, nbAvis: 112 },
  { id: 4, nom: 'Centre Hospitalier de Douai', type: 'hopital', villeNom: 'Douai', departement: 'Nord', noteMoyenne: 3.4, nbAvis: 22 },
  { id: 5, nom: 'Gare de Lille Flandres', type: 'gare', villeNom: 'Lille', departement: 'Nord', noteMoyenne: 4.0, nbAvis: 203 },
  { id: 6, nom: 'Gare de Lyon Part-Dieu', type: 'gare', villeNom: 'Lyon', departement: 'Rhône', noteMoyenne: 3.9, nbAvis: 167 },
  { id: 7, nom: 'Gare de Paris Nord', type: 'gare', villeNom: 'Paris', departement: 'Paris', noteMoyenne: 3.5, nbAvis: 289 },
  { id: 8, nom: 'Gare de Douai', type: 'gare', villeNom: 'Douai', departement: 'Nord', noteMoyenne: 4.1, nbAvis: 34 },
  { id: 9, nom: 'Mairie de Lille', type: 'service_public', villeNom: 'Lille', departement: 'Nord', noteMoyenne: 3.7, nbAvis: 41 },
  { id: 10, nom: 'Préfecture du Nord', type: 'service_public', villeNom: 'Lille', departement: 'Nord', noteMoyenne: 3.2, nbAvis: 29 },
  { id: 11, nom: 'CAF de Paris', type: 'service_public', villeNom: 'Paris', departement: 'Paris', noteMoyenne: 3.0, nbAvis: 56 },
  { id: 12, nom: 'Mairie de Pierrelatte', type: 'service_public', villeNom: 'Pierrelatte', departement: 'Drôme', noteMoyenne: 4.2, nbAvis: 12 },
  { id: 13, nom: 'Université de Lille', type: 'ecole', villeNom: 'Lille', departement: 'Nord', noteMoyenne: 4.0, nbAvis: 88 },
  { id: 14, nom: 'Lycée Faidherbe', type: 'ecole', villeNom: 'Lille', departement: 'Nord', noteMoyenne: 4.3, nbAvis: 19 },
]

export const demoProfil = {
  pseudo: 'Test1',
  notacoins: 235,
  ville_origine_code: '59350',
  villeNom: 'Lille',
}

// icone : clé sobre résolue par components/Icone.js (plus d'émoji ici,
// voir la note dans app/page.js sur ce choix).
export const demoBadges = [
  { nom: 'Contributeur', icone: 'recompense', niveau: 'bronze' },
  { nom: 'Explorateur', icone: 'compass', niveau: 'argent' },
  { nom: 'Gourmet', icone: 'restaurant', niveau: 'bronze' },
]

export const demoVillesVisitees = [
  { codeInsee: '59350', villeNom: 'Lille', premiereVisite: '2026-01-12T09:00:00Z', derniereVisite: '2026-09-15T18:30:00Z', nbVisites: 42 },
  { codeInsee: '75056', villeNom: 'Paris', premiereVisite: '2026-03-02T14:00:00Z', derniereVisite: '2026-08-20T11:00:00Z', nbVisites: 5 },
  { codeInsee: '35238', villeNom: 'Rennes', premiereVisite: '2026-06-18T10:00:00Z', derniereVisite: '2026-06-18T10:00:00Z', nbVisites: 1 },
]

export const demoClassementResidents = [
  { code_insee: '59350', ville: 'Lille', region: 'Hauts-de-France', note_moyenne: 4.2, nb_avis: 812 },
  { code_insee: '44109', ville: 'Nantes', region: 'Pays de la Loire', note_moyenne: 4.1, nb_avis: 654 },
  { code_insee: '33063', ville: 'Bordeaux', region: 'Nouvelle-Aquitaine', note_moyenne: 3.9, nb_avis: 701 },
]

export const demoClassementVoyageurs = [
  { code_insee: '75056', ville: 'Paris', region: 'Île-de-France', note_moyenne: 4.5, nb_avis: 2140 },
  { code_insee: '69123', ville: 'Lyon', region: 'Auvergne-Rhône-Alpes', note_moyenne: 4.3, nb_avis: 980 },
  { code_insee: '59350', ville: 'Lille', region: 'Hauts-de-France', note_moyenne: 4.0, nb_avis: 430 },
]

// Miroir de la table parametres_recompenses + limites_anti_abus (voir
// supabase/03_renommage_duels_notacoins.sql et
// supabase/23_notacoins_jeux.sql) -- pour que /notacoins affiche le même
// tableau en mode démo qu'en vrai, sans requête réseau.
export const demoBaremeNotacoins = [
  { cle: 'defi_global_palier', valeur: 30, description: 'Atteindre un palier d\'un défi global/long terme', max_par_jour: null },
  { cle: 'avis_detaille', valeur: 25, description: 'Publier un avis détaillé avec points forts/faibles', max_par_jour: 20 },
  { cle: 'defi_action_simple', valeur: 20, description: 'Compléter un défi à action simple', max_par_jour: 8 },
  { cle: 'duel_gagnant_bonus', valeur: 15, description: 'Bonus si le camp voté remporte le duel', max_par_jour: null },
  { cle: 'defi_photo', valeur: 15, description: 'Soumettre une photo pour un défi photo, une fois validée', max_par_jour: 20 },
  { cle: 'jeu_ville_mystere_gagnee', valeur: 15, description: 'Deviner la Ville mystère du jour', max_par_jour: 1 },
  { cle: 'swipe_note', valeur: 10, description: 'Noter un quartier en swipant (j\'aime ou passe)', max_par_jour: 100 },
  { cle: 'defi_etape', valeur: 10, description: 'Valider une étape d\'un défi multi-étapes', max_par_jour: 100 },
  { cle: 'jeu_capture_lieu', valeur: 3, description: 'Attraper un lieu en vrai dans la Chasse aux lieux', max_par_jour: 20 },
  { cle: 'vote_duel', valeur: 5, description: 'Voter à un duel de quartier', max_par_jour: 30 },
  { cle: 'jeu_bonne_reponse', valeur: 2, description: 'Bonne réponse dans un jeu de culture générale (Devine la ville, Quiz éclair, Plus cher ou moins cher)', max_par_jour: 60 },
  { cle: 'vote_photo', valeur: 2, description: 'Voter pour une photo d\'un défi photo', max_par_jour: 100 },
]

export const demoDuel = {
  id: 'duel1',
  quartierA: { id: 'q2', nom: 'Wazemmes', ville: 'Lille' },
  quartierB: { id: 'q3', nom: 'Lille-Moulins', ville: 'Lille' },
  votesA: 148,
  votesB: 121,
}

export const demoCategories = [
  { id: 1, cle: 'decouverte', nom: 'Découverte', icone: 'compass', type: 'ville', description: 'Explore ta ville sous un nouvel angle' },
  { id: 2, cle: 'photo', nom: 'Photo', icone: 'camera', type: 'contribution', description: 'La communauté vote pour les meilleurs clichés' },
  { id: 3, cle: 'patrimoine', nom: 'Patrimoine', icone: 'landmark', type: 'patrimoine', description: 'Monuments et curiosités architecturales' },
  { id: 4, cle: 'gastronomie', nom: 'Gastronomie', icone: 'restaurant', type: 'gastronomie', description: 'Bonnes adresses et prix réels' },
  { id: 5, cle: 'vie_quotidienne', nom: 'Vie quotidienne', icone: 'wallet', type: 'contribution', description: 'Prix, loyers, salaires anonymisés' },
  { id: 6, cle: 'connaissances', nom: 'Connaissances', icone: 'livre', type: 'connaissance', description: 'Quiz sur les villes' },
  { id: 7, cle: 'voyage', nom: 'Voyage', icone: 'carte', type: 'voyage', description: 'Note les villes que tu traverses' },
  { id: 8, cle: 'communaute', nom: 'Communauté', icone: 'utilisateurs', type: 'communaute', description: 'Améliore les fiches de Notaville' },
  { id: 9, cle: 'evenementiel', nom: 'Défis événementiels', icone: 'flamme', type: 'evenementiel', description: 'Défis du moment' },
  { id: 10, cle: 'partenaires', nom: 'Offres partenaires', icone: 'cadeau', type: 'partenaire', description: 'Bons plans ponctuels' },
]

const dansUneSemaine = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const dansUnJour = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

export const demoDefis = [
  {
    id: 1, categorie_id: 1, titre: 'Découvre ta ville', description: 'Note 10 quartiers sur la carte de ta ville.',
    instructions: 'Va dans Découvrir et note 10 quartiers.', type_participation: 'multi_etapes',
    difficulte: 'facile', image_url: null, ville_code_insee: '59350', portee_temporelle: 'permanent',
    date_fin: null, palier_cible: 10, recompense: 10,
    etapes: [1, 2, 3, 4, 5].map((n) => ({ id: n, ordre: n, titre: `Quartier ${n}` })),
  },
  {
    id: 2, categorie_id: 2, titre: 'Plus belle vue', description: 'Montre-nous ta plus belle vue sur ta ville.',
    instructions: 'Ajoute une photo. La communauté vote, le top 10 est mis en avant.', type_participation: 'photo',
    difficulte: 'facile', image_url: null, ville_code_insee: null, portee_temporelle: 'permanent',
    date_fin: null, palier_cible: null, recompense: 100, etapes: [],
  },
  {
    id: 3, categorie_id: 3, titre: 'Découvrir un monument', description: "Ajoute une photo d'un monument de ta ville.",
    instructions: 'Photo + nom du monument.', type_participation: 'photo', difficulte: 'facile', image_url: null,
    ville_code_insee: null, portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 100, etapes: [],
  },
  {
    id: 4, categorie_id: 4, titre: "Renseigne le prix d'une bière", description: 'Combien coûte une bière pression dans ton bar habituel ?',
    instructions: 'Indique le prix en euros.', type_participation: 'contribution_donnee', difficulte: 'facile',
    image_url: null, ville_code_insee: null, portee_temporelle: 'permanent', date_fin: null, palier_cible: null,
    recompense: 50, donnee_cle: 'prix_biere', etapes: [],
  },
  {
    id: 5, categorie_id: 5, titre: 'Quel est ton loyer ?', description: 'Donnée anonyme, jamais montrée individuellement.',
    instructions: 'Indique ton loyer en euros. Affiché en moyenne à partir de 5 contributions.',
    type_participation: 'contribution_donnee', difficulte: 'facile', image_url: null, ville_code_insee: null,
    portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 50, donnee_cle: 'loyer_m2', etapes: [],
  },
  {
    id: 6, categorie_id: 5, titre: 'Quel est ton salaire net mensuel ?', description: 'Strictement anonyme, jamais affiché à ton nom.',
    instructions: "Seule une moyenne par ville est publiée, à partir de 5 contributions.",
    type_participation: 'contribution_donnee', difficulte: 'facile', image_url: null, ville_code_insee: null,
    portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 100, donnee_cle: 'salaire_net_mensuel', etapes: [],
  },
  {
    id: 7, categorie_id: 6, titre: 'Quiz de la ville', description: 'Un quiz express sur ta ville.',
    instructions: 'Réponds à la question. Correction automatique.', type_participation: 'quiz', difficulte: 'facile',
    image_url: null, ville_code_insee: null, portee_temporelle: 'permanent', date_fin: null, palier_cible: null,
    recompense: 15, etapes: [],
    quiz: { question: 'Lille se situe dans quelle région ?', choix: ['Hauts-de-France', 'Normandie', 'Grand Est', 'Île-de-France'], bonneReponse: 0 },
  },
  {
    id: 8, categorie_id: 7, titre: 'Première ville étrangère', description: 'Note ta première ville visitée hors de France.',
    instructions: 'Ajoute un avis détaillé sur une ville étrangère.', type_participation: 'action_simple', difficulte: 'facile',
    image_url: null, ville_code_insee: null, portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 25, etapes: [],
  },
  {
    id: 9, categorie_id: 8, titre: 'Ajouter un conseil', description: 'Un conseil utile pour visiter ou vivre dans ta ville.',
    instructions: 'Rédige un conseil en quelques lignes.', type_participation: 'action_simple', difficulte: 'facile',
    image_url: null, ville_code_insee: null, portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 20, etapes: [],
  },
  {
    id: 10, categorie_id: 9, titre: 'Défi du jour', description: "Ajoute une photo aujourd'hui pour un bonus rapide.",
    instructions: 'Ajoute une photo avant minuit.', type_participation: 'photo', difficulte: 'facile', image_url: null,
    ville_code_insee: null, portee_temporelle: 'jour', date_fin: dansUnJour, palier_cible: null, recompense: 15, etapes: [],
  },
  {
    id: 11, categorie_id: 9, titre: 'Défi de la semaine', description: 'Renseigne 3 prix du quotidien cette semaine.',
    instructions: 'Complète 3 défis "Vie quotidienne" avant dimanche.', type_participation: 'multi_etapes', difficulte: 'moyen',
    image_url: null, ville_code_insee: null, portee_temporelle: 'semaine', date_fin: dansUneSemaine, palier_cible: 3, recompense: 10,
    etapes: [1, 2, 3].map((n) => ({ id: n, ordre: n, titre: `Prix n°${n}` })),
  },
  {
    id: 12, categorie_id: 3, titre: 'Grand Explorateur du patrimoine', description: 'Défi complet sur le patrimoine de ta ville.',
    instructions: 'Complète les étapes ci-dessous.', type_participation: 'multi_etapes', difficulte: 'difficile', image_url: null,
    ville_code_insee: null, portee_temporelle: 'permanent', date_fin: null, palier_cible: 4, recompense: 250,
    etapes: [
      { id: 1, ordre: 1, titre: 'Ajouter 1 photo de monument' },
      { id: 2, ordre: 2, titre: 'Découvrir 1 lieu méconnu' },
      { id: 3, ordre: 3, titre: 'Répondre au quiz patrimoine' },
      { id: 4, ordre: 4, titre: 'Ajouter 1 information historique' },
    ],
  },
  {
    id: 13, categorie_id: 10, titre: 'Bon plan partenaire', description: 'Des réductions chez des commerçants partenaires, ville par ville.',
    instructions: 'Va voir les offres actives sur la page Réductions.', type_participation: 'externe', difficulte: 'facile',
    image_url: null, ville_code_insee: null, portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 0, etapes: [],
  },
  {
    id: 14, categorie_id: 8, titre: 'Ajoute un lieu manquant', description: "Un resto, un bar, un monument... qui n'est pas encore sur Notaville ?",
    instructions: 'Indique son nom, son type, son quartier et une courte description. Vérifié avant de créditer les Notacoins.',
    type_participation: 'lieu', difficulte: 'facile', image_url: null, ville_code_insee: null, portee_temporelle: 'permanent',
    date_fin: null, palier_cible: null, recompense: 40, etapes: [],
  },
  // Défis précis, propres à une ville (voir supabase/13_defis_villes_precises.sql) :
  // contrairement au catalogue générique ci-dessus, le nom de la ville est écrit
  // en toutes lettres dans le titre et ville_code_insee est renseigné, ce qui les
  // fait remonter dans "Près de chez toi" pour un utilisateur de cette ville.
  {
    id: 15, categorie_id: 2, titre: 'La plus belle vue en hauteur de Lille', description: 'Beffroi, toit-terrasse, étage élevé... montre-nous Lille vue de haut.',
    instructions: 'Ajoute une photo prise en hauteur, avec le point de vue en légende. La communauté vote, le top est mis en avant.',
    type_participation: 'photo', difficulte: 'facile', image_url: null, ville_code_insee: '59350', portee_temporelle: 'permanent',
    date_fin: null, palier_cible: null, recompense: 15, etapes: [],
  },
  {
    id: 16, categorie_id: 3, titre: 'Sur les traces du Vieux-Lille', description: "Une façade, une rue pavée, un détail d'architecture du Vieux-Lille qui mérite d'être vu.",
    instructions: "Photo + un mot sur l'endroit exact.", type_participation: 'photo', difficulte: 'moyen', image_url: null,
    ville_code_insee: '59350', portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 100, etapes: [],
  },
  {
    id: 17, categorie_id: 4, titre: 'Ta meilleure adresse gourmande à Lille', description: 'Un estaminet, une pâtisserie, une spécialité du Nord... ton coup de cœur lillois.',
    instructions: "Photo du plat ou du lieu + le nom de l'adresse.", type_participation: 'photo', difficulte: 'facile', image_url: null,
    ville_code_insee: '59350', portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 15, etapes: [],
  },
  {
    id: 18, categorie_id: 8, titre: 'Une sortie culturelle à Lille', description: 'Musée, expo, concert, marché... partage une sortie que tu recommandes à Lille.',
    instructions: 'Rédige un avis détaillé sur cette sortie.', type_participation: 'action_simple', difficulte: 'facile', image_url: null,
    ville_code_insee: '59350', portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 25, etapes: [],
  },
  {
    id: 19, categorie_id: 2, titre: 'La plus belle vue en hauteur de Tourcoing', description: 'Un point haut, un toit, une terrasse... montre-nous Tourcoing vue de haut.',
    instructions: 'Ajoute une photo prise en hauteur, avec le point de vue en légende. La communauté vote, le top est mis en avant.',
    type_participation: 'photo', difficulte: 'facile', image_url: null, ville_code_insee: '59599', portee_temporelle: 'permanent',
    date_fin: null, palier_cible: null, recompense: 15, etapes: [],
  },
  {
    id: 20, categorie_id: 3, titre: 'Sur les traces du patrimoine textile de Tourcoing', description: 'Une ancienne filature, une façade industrielle, une trace du passé textile de la ville.',
    instructions: "Photo + un mot d'histoire si tu la connais.", type_participation: 'photo', difficulte: 'moyen', image_url: null,
    ville_code_insee: '59599', portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 100, etapes: [],
  },
  {
    id: 21, categorie_id: 4, titre: 'Ta meilleure adresse gourmande à Tourcoing', description: 'Un resto, une friterie, une boulangerie... ton coup de cœur tourquennois.',
    instructions: "Photo du plat ou du lieu + le nom de l'adresse.", type_participation: 'photo', difficulte: 'facile', image_url: null,
    ville_code_insee: '59599', portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 15, etapes: [],
  },
  {
    id: 22, categorie_id: 8, titre: 'Une sortie culturelle à Tourcoing', description: 'Expo, spectacle, événement local... partage une sortie que tu recommandes à Tourcoing.',
    instructions: 'Rédige un avis détaillé sur cette sortie.', type_participation: 'action_simple', difficulte: 'facile', image_url: null,
    ville_code_insee: '59599', portee_temporelle: 'permanent', date_fin: null, palier_cible: null, recompense: 25, etapes: [],
  },
]

export const demoParticipantsParDefi = { 1: 812, 2: 2438, 3: 340, 7: 190, 12: 95, 14: 63, 15: 47, 16: 22, 17: 34, 18: 12, 19: 8, 20: 5, 21: 9, 22: 3 }

// Offres partenaires (voir supabase/15_offres_partenaires.sql) : mêmes
// noms d'exemple qu'en base, pour que /reductions soit testable en
// démo. De vrais noms de commerces remplaceront ça une fois des
// partenaires réellement démarchés.
export const demoOffresPartenaires = [
  { id: 1, nom_commerce: 'Café du Beffroi (exemple)', type_commerce: 'cafe', ville_code_insee: '59350', ville_nom: 'Lille', reduction: '-10 %', description: "Sur l'addition, tous les jours avant 11h.", conditions: "Présente l'appli Notaville en caisse.", date_fin: null },
  { id: 2, nom_commerce: 'Table Vieux-Lille (exemple)', type_commerce: 'restaurant', ville_code_insee: '59350', ville_nom: 'Lille', reduction: '1 dessert offert', description: 'Pour toute formule midi du lundi au vendredi.', conditions: 'Non cumulable avec une autre offre.', date_fin: null },
  { id: 3, nom_commerce: 'Atelier Nord Style (exemple)', type_commerce: 'boutique', ville_code_insee: '59350', ville_nom: 'Lille', reduction: '-15 %', description: "Sur une sélection d'articles en boutique.", conditions: 'Dans la limite des stocks disponibles.', date_fin: null },
  { id: 4, nom_commerce: 'Friterie du Broutteux (exemple)', type_commerce: 'restaurant', ville_code_insee: '59599', ville_nom: 'Tourcoing', reduction: '-10 %', description: 'Sur toute commande à emporter.', conditions: "Présente l'appli Notaville en caisse.", date_fin: null },
  { id: 5, nom_commerce: 'Le Repaire Textile (exemple)', type_commerce: 'bar', ville_code_insee: '59599', ville_nom: 'Tourcoing', reduction: '2ème boisson à -50 %', description: 'Du jeudi au samedi, à partir de 18h.', conditions: 'Une offre par personne et par soirée.', date_fin: null },
]

export const demoTopNotacoins = [
  { pseudo: 'Camille_L', notacoins: 4120 },
  { pseudo: 'Yanis59', notacoins: 3870 },
  { pseudo: 'Test1', notacoins: 235 },
  { pseudo: 'MarieV', notacoins: 210 },
]

// Une fiche par ville démo, pour que /villes/[code] et le comparateur
// /comparer fonctionnent avec plus d'une ville en mode démo.
export const demoFichesVilles = {
  '59350': {
    code_insee: '59350',
    nom: 'Lille',
    departement: 'Nord',
    region: 'Hauts-de-France',
    population: 238246,
    note_habitants: 4.2,
    nb_avis_habitants: 812,
    note_touristes: 4.0,
    nb_avis_touristes: 430,
    stats: [
      { donnee_cle: 'salaire_net_mensuel', valeur: 2340, provenance: 'communaute', nb_contributions: 842, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_m2', valeur: 13.4, provenance: 'communaute', nb_contributions: 512, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_t2', valeur: 650, provenance: 'communaute', nb_contributions: 187, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_biere', valeur: 5.2, provenance: 'communaute', nb_contributions: 96, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_resto', valeur: 18.5, provenance: 'communaute', nb_contributions: 74, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_cinema', valeur: 9.5, provenance: 'communaute', nb_contributions: 58, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'panier_courses', valeur: 62, provenance: 'officiel', nb_contributions: null, source_url: 'https://www.insee.fr', date_maj_officielle: '2026-06-01' },
      { donnee_cle: 'abonnement_transport', valeur: 34.4, provenance: 'communaute', nb_contributions: 201, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'abonnement_sport', valeur: 34.9, provenance: 'communaute', nb_contributions: 45, source_url: null, date_maj_officielle: null },
    ],
    derniere_maj: new Date().toISOString(),
  },
  '75056': {
    code_insee: '75056',
    nom: 'Paris',
    departement: 'Paris',
    region: 'Île-de-France',
    population: 2145906,
    note_habitants: 3.7,
    nb_avis_habitants: 2140,
    note_touristes: 4.6,
    nb_avis_touristes: 3560,
    stats: [
      { donnee_cle: 'salaire_net_mensuel', valeur: 2890, provenance: 'communaute', nb_contributions: 3012, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_m2', valeur: 29.3, provenance: 'communaute', nb_contributions: 1840, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_t2', valeur: 1450, provenance: 'communaute', nb_contributions: 622, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_biere', valeur: 7.6, provenance: 'communaute', nb_contributions: 410, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_resto', valeur: 26, provenance: 'communaute', nb_contributions: 288, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_cinema', valeur: 12.5, provenance: 'communaute', nb_contributions: 201, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'panier_courses', valeur: 78, provenance: 'officiel', nb_contributions: null, source_url: 'https://www.insee.fr', date_maj_officielle: '2026-06-01' },
      { donnee_cle: 'abonnement_transport', valeur: 84, provenance: 'officiel', nb_contributions: null, source_url: 'https://www.iledefrance-mobilites.fr', date_maj_officielle: '2026-01-01' },
      { donnee_cle: 'abonnement_sport', valeur: 54.9, provenance: 'communaute', nb_contributions: 133, source_url: null, date_maj_officielle: null },
    ],
    derniere_maj: new Date().toISOString(),
  },
  '69123': {
    code_insee: '69123',
    nom: 'Lyon',
    departement: 'Rhône',
    region: 'Auvergne-Rhône-Alpes',
    population: 522969,
    note_habitants: 4.1,
    nb_avis_habitants: 980,
    note_touristes: 4.3,
    nb_avis_touristes: 720,
    stats: [
      { donnee_cle: 'salaire_net_mensuel', valeur: 2470, provenance: 'communaute', nb_contributions: 690, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_m2', valeur: 16.1, provenance: 'communaute', nb_contributions: 405, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_t2', valeur: 780, provenance: 'communaute', nb_contributions: 156, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_biere', valeur: 6.1, provenance: 'communaute', nb_contributions: 150, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_resto', valeur: 20, provenance: 'communaute', nb_contributions: 92, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_cinema', valeur: 10.5, provenance: 'communaute', nb_contributions: 67, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'panier_courses', valeur: 66, provenance: 'officiel', nb_contributions: null, source_url: 'https://www.insee.fr', date_maj_officielle: '2026-06-01' },
    ],
    derniere_maj: new Date().toISOString(),
  },
  // Petits villages, ajoutés pour que le comparateur ne montre pas que
  // des grandes villes -- utile pour comparer "grande ville vs. village"
  // (ex. un projet de vie plus tranquille). Champs volontairement
  // absents quand ils n'ont pas de sens ou pas de données en vrai pour
  // un village de cette taille (pas d'abonnement transport en commun
  // hors ville, pas de cinéma...) plutôt que d'inventer un chiffre.
  '58065': {
    code_insee: '58065',
    nom: 'Châtillon-en-Bazois',
    departement: 'Nièvre',
    region: 'Bourgogne-Franche-Comté',
    population: 795,
    note_habitants: 4.4,
    nb_avis_habitants: 38,
    note_touristes: 3.6,
    nb_avis_touristes: 22,
    stats: [
      { donnee_cle: 'salaire_net_mensuel', valeur: 1850, provenance: 'communaute', nb_contributions: 21, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_m2', valeur: 6.8, provenance: 'communaute', nb_contributions: 15, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_t2', valeur: 380, provenance: 'communaute', nb_contributions: 12, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_biere', valeur: 3.2, provenance: 'communaute', nb_contributions: 9, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_resto', valeur: 14, provenance: 'communaute', nb_contributions: 8, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'panier_courses', valeur: 58, provenance: 'communaute', nb_contributions: 11, source_url: null, date_maj_officielle: null },
    ],
    derniere_maj: new Date().toISOString(),
  },
  '84050': {
    code_insee: '84050',
    nom: 'Gordes',
    departement: 'Vaucluse',
    region: "Provence-Alpes-Côte d'Azur",
    population: 1661,
    note_habitants: 4.0,
    nb_avis_habitants: 19,
    note_touristes: 4.8,
    nb_avis_touristes: 340,
    stats: [
      { donnee_cle: 'loyer_m2', valeur: 15.5, provenance: 'communaute', nb_contributions: 14, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_t2', valeur: 780, provenance: 'communaute', nb_contributions: 10, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_biere', valeur: 6.5, provenance: 'communaute', nb_contributions: 22, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_resto', valeur: 32, provenance: 'communaute', nb_contributions: 28, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'panier_courses', valeur: 68, provenance: 'communaute', nb_contributions: 9, source_url: null, date_maj_officielle: null },
    ],
    derniere_maj: new Date().toISOString(),
  },
  '46240': {
    code_insee: '46240',
    nom: 'Rocamadour',
    departement: 'Lot',
    region: 'Occitanie',
    population: 597,
    note_habitants: 4.1,
    nb_avis_habitants: 12,
    note_touristes: 4.6,
    nb_avis_touristes: 512,
    stats: [
      { donnee_cle: 'loyer_m2', valeur: 9.2, provenance: 'communaute', nb_contributions: 8, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_t2', valeur: 460, provenance: 'communaute', nb_contributions: 6, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_biere', valeur: 5.5, provenance: 'communaute', nb_contributions: 15, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_resto', valeur: 24, provenance: 'communaute', nb_contributions: 19, source_url: null, date_maj_officielle: null },
    ],
    derniere_maj: new Date().toISOString(),
  },
  '59178': {
    code_insee: '59178',
    nom: 'Douai',
    departement: 'Nord',
    region: 'Hauts-de-France',
    population: 40250,
    note_habitants: 3.9,
    nb_avis_habitants: 145,
    note_touristes: 3.5,
    nb_avis_touristes: 62,
    stats: [
      { donnee_cle: 'salaire_net_mensuel', valeur: 2050, provenance: 'communaute', nb_contributions: 96, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_m2', valeur: 9.8, provenance: 'communaute', nb_contributions: 71, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_t2', valeur: 480, provenance: 'communaute', nb_contributions: 54, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_biere', valeur: 4.3, provenance: 'communaute', nb_contributions: 38, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_resto', valeur: 16, provenance: 'communaute', nb_contributions: 29, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_cinema', valeur: 8, provenance: 'communaute', nb_contributions: 21, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'panier_courses', valeur: 58, provenance: 'officiel', nb_contributions: null, source_url: 'https://www.insee.fr', date_maj_officielle: '2026-06-01' },
      { donnee_cle: 'abonnement_transport', valeur: 25, provenance: 'communaute', nb_contributions: 33, source_url: null, date_maj_officielle: null },
    ],
    derniere_maj: new Date().toISOString(),
  },
  // Trois communes d'Ardèche/Drôme, tailles très différentes -- pour
  // que le comparateur montre aussi une petite ville (Le Cheylard,
  // Pierrelatte) et un très petit village (moins de 500 habitants,
  // Gilhoc-sur-Ormèze) à côté des grandes villes ci-dessus.
  '07095': {
    code_insee: '07095',
    nom: 'Gilhoc-sur-Ormèze',
    departement: 'Ardèche',
    region: 'Auvergne-Rhône-Alpes',
    population: 470,
    note_habitants: 4.5,
    nb_avis_habitants: 14,
    note_touristes: 3.9,
    nb_avis_touristes: 6,
    // Trop peu de contributions pour publier plus que ces 3 moyennes
    // (seuil de 5 contributions minimum, comme partout ailleurs) --
    // un très petit village a honnêtement moins de données, pas de
    // chiffres inventés pour compléter le tableau.
    stats: [
      { donnee_cle: 'loyer_m2', valeur: 5.9, provenance: 'communaute', nb_contributions: 6, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_biere', valeur: 3.0, provenance: 'communaute', nb_contributions: 5, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'panier_courses', valeur: 55, provenance: 'communaute', nb_contributions: 5, source_url: null, date_maj_officielle: null },
    ],
    derniere_maj: new Date().toISOString(),
  },
  '07064': {
    code_insee: '07064',
    nom: 'Le Cheylard',
    departement: 'Ardèche',
    region: 'Auvergne-Rhône-Alpes',
    population: 2803,
    note_habitants: 4.3,
    nb_avis_habitants: 22,
    note_touristes: 3.7,
    nb_avis_touristes: 9,
    stats: [
      { donnee_cle: 'loyer_m2', valeur: 6.5, provenance: 'communaute', nb_contributions: 9, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_t2', valeur: 360, provenance: 'communaute', nb_contributions: 7, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_biere', valeur: 3.5, provenance: 'communaute', nb_contributions: 8, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_resto', valeur: 15, provenance: 'communaute', nb_contributions: 6, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'panier_courses', valeur: 56, provenance: 'communaute', nb_contributions: 7, source_url: null, date_maj_officielle: null },
    ],
    derniere_maj: new Date().toISOString(),
  },
  '26235': {
    code_insee: '26235',
    nom: 'Pierrelatte',
    departement: 'Drôme',
    region: 'Auvergne-Rhône-Alpes',
    population: 13756,
    note_habitants: 3.8,
    nb_avis_habitants: 41,
    note_touristes: 3.4,
    nb_avis_touristes: 18,
    stats: [
      { donnee_cle: 'salaire_net_mensuel', valeur: 2180, provenance: 'communaute', nb_contributions: 34, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_m2', valeur: 8.9, provenance: 'communaute', nb_contributions: 27, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'loyer_t2', valeur: 430, provenance: 'communaute', nb_contributions: 19, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_biere', valeur: 4.1, provenance: 'communaute', nb_contributions: 15, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'prix_resto', valeur: 17, provenance: 'communaute', nb_contributions: 12, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'panier_courses', valeur: 59, provenance: 'communaute', nb_contributions: 14, source_url: null, date_maj_officielle: null },
      { donnee_cle: 'abonnement_transport', valeur: 20, provenance: 'communaute', nb_contributions: 8, source_url: null, date_maj_officielle: null },
    ],
    derniere_maj: new Date().toISOString(),
  },
}

export const demoFicheVille = demoFichesVilles['59350']
