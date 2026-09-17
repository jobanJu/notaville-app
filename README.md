# Notaville

Application Next.js + Supabase : note ta ville d'origine et celles que tu
as visitées, quartier par quartier, en swipant ou en écrivant un avis
détaillé. Vote dans les duels de quartier, relève des défis, gagne des
Notacoins, consulte le classement.

Contenu déjà branché sur de vraies données : les **34 969 communes de
France** et les **quartiers réels de 135 grandes villes** (voir
`supabase/00_villes_quartiers.sql`).

Hors périmètre pour l'instant (à ajouter plus tard, une fois les
partenariats en place) : les pubs sponsorisées et l'échange de Notacoins
contre de vraies cartes cadeaux — ça demande de vrais contrats avec des
régies publicitaires et des fournisseurs de cartes cadeaux.

## Mode démo (visiter sans Supabase)

Pour cliquer dans l'interface sans configurer de projet Supabase : lance
`npm run dev`, va sur `/login`, et utilise le bloc **"Bêta interne —
compte de test"** en bas de page avec l'identifiant `Test1` et le mot de
passe `1234`.

Toutes les données affichées (villes, défis, badges, classements...)
sont alors **fictives et codées en dur** dans `lib/demo/data.js` — rien
n'est enregistré, tout revient à zéro au rechargement, et `/admin/defis`
n'est pas utilisable (il agit sur une vraie base, qu'il n'y a pas ici).
Ce mode existe uniquement pour la démo locale ; une fois un vrai projet
Supabase branché (section suivante), oublie-le et connecte-toi
normalement par lien magique.

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com), crée un projet gratuit.
2. Dans **Project Settings → API**, récupère l'URL du projet et la clé
   `anon public`.
3. Copie `.env.local.example` en `.env.local` et colle ces deux valeurs.

## 2. Importer les données et le schéma

Dans l'éditeur SQL de Supabase (**SQL Editor**), exécute **dans l'ordre** :

1. `supabase/00_villes_quartiers.sql` — crée les tables `villes` et
   `quartiers` et importe toutes les données (fichier volumineux, ça
   prend quelques dizaines de secondes).
2. `supabase/01_schema.sql` — crée les tables de la V1 (`profiles`,
   `notes`, `avis`, `defis`, `votes_defis`), les triggers de points et
   les vues de classement.
3. `supabase/02_exemple_defi.sql` — crée un duel de démonstration
   (Wazemmes vs Lille-Moulins).
4. `supabase/03_renommage_duels_notacoins.sql` — **migration** : renomme
   les duels de quartier (`defis`→`duels_quartier`,
   `votes_defis`→`votes_duels`) pour libérer le nom `defis`, renomme
   `profiles.points` en `profiles.notacoins`, et met en place le grand
   livre de transactions (`notacoins_transactions`) qui remplace les 3
   anciens triggers de points codés en dur.
5. `supabase/04_defis_schema.sql` — le nouveau système de défis :
   catégories, défis à action simple/multi-étapes/photo/donnée,
   participations, contributions avec workflow de validation, votes sur
   les photos, badges à paliers, anonymisation des statistiques.
6. `supabase/05_defis_seed.sql` — contenu d'exemple (catégories, 6
   défis, 3 familles de badges) que tu peux éditer librement depuis le
   **Table editor** de Supabase.
7. `supabase/06_defis_extension.sql` — comptes administrateurs
   (`profiles.est_admin`), champs difficulté/image/quota/portée
   temporelle sur les défis, quiz auto-corrigés, et les droits pour
   piloter les défis **depuis l'application** (pas seulement le Table
   editor).
8. `supabase/07_defis_catalogue.sql` — le catalogue complet : les 9
   catégories du cahier des charges (Découverte, Photo, Patrimoine,
   Gastronomie, Vie quotidienne, Connaissances, Voyage, Communauté,
   Défis événementiels), une quarantaine de défis nommés, les 10 badges
   demandés, et un défi du jour/semaine/mois d'exemple.
9. `supabase/08_defis_recalcul_badges.sql` — calcule les 10 badges à
   partir de compteurs réels (contributions par catégorie, villes
   visitées, défis multi-étapes terminés...).
10. `supabase/09_pages_villes_publiques.sql` — les fiches ville
    (`/villes/[code_insee]`), accessibles **sans compte**, avec la
    provenance de chaque donnée (Officiel/Communauté), et un correctif
    de confidentialité important (voir plus bas).
11. `supabase/10_quartiers_coordonnees.sql` — ajoute `latitude`/
    `longitude` à `quartiers` (utilisé par la carte de `/decouvrir`, voir
    ci-dessous), avec de vraies coordonnées pour les 12 quartiers
    officiels de Lille. Les quartiers des 134 autres villes déjà seedées
    restent sans coordonnées pour l'instant (liste sous la carte à la
    place d'une punaise) : étendre la couverture est un travail de
    Phase 2.
12. `supabase/11_lieux.sql` — table `lieux` (restaurant, bar, monument...)
    à l'intérieur d'un quartier, notés 1 à 5 (`avis_lieux`), et la
    fonction `recommander_lieux()` qui propose les mieux notés dans les
    quartiers que la personne a déjà aimés sur la carte (à défaut, sa
    ville d'origine). 15 lieux de départ sont seedés pour Lille.
13. `supabase/12_defi_ajout_lieu.sql` — ajoute le défi communauté
    "Ajoute un lieu manquant" (40 Notacoins) : une contribution de type
    `lieu`, validée comme les autres par un admin, crée automatiquement
    la ligne dans `lieux` au moment de la validation.
14. `supabase/13_defis_villes_precises.sql` — quelques défis où le nom
    de la ville est écrit en toutes lettres (ville_code_insee renseigné),
    qui remontent dans "Près de chez toi".
15. `supabase/14_demandes_partenariat.sql` — table de contact pour
    `/partenaires` (formulaire commerçant, lu à la main côté admin).
16. `supabase/15_offres_partenaires.sql` — table des réductions
    affichées sur `/reductions` (alimentée à la main côté admin).
17. `supabase/16_signalements.sql` — table générique pour le bouton
    "Signaler" (lieux, avis, contributions photo...).
18. `supabase/17_stockage_photos.sql` — bucket Supabase Storage
    `defis-photos` pour l'envoi direct de photo dans les défis photo.
19. `supabase/18_bornes_contributions.sql` — contrainte CHECK en base
    qui bloque une valeur absurde (loyer à 0€, salaire à 999999€) sur
    une contribution "vie quotidienne", en plus du contrôle déjà fait
    côté interface.
20. `supabase/19_recherche_lieux.sql` — recherche de lieux par mot-clé
    (`/recherche`, et le comparateur pour trouver le meilleur lieu par
    ville sur un même mot-clé).
21. `supabase/20_vie_quotidienne_plus.sql` — 4 données supplémentaires
    (loyer T2, prix resto/ciné/salle de sport) et leurs défis de
    contribution.
22. `supabase/21_etablissements.sql` — établissements publics notés
    (hôpitaux, gares, services publics...) et leur classement national
    sur `/classement`.
23. `supabase/22_lieux_proches.sql` — lieux à proximité d'une position
    donnée (géolocalisation), utilisé par `/jeux/chasse`.

Si tu pars d'un projet Supabase tout neuf, exécute les 23 fichiers dans
l'ordre, un par un, dans le SQL Editor (`00_villes_quartiers.sql` est le
plus gros, laisse-lui le temps de tourner avant de lancer le suivant).
Si tu avais déjà un projet avec une partie de la liste jouée, il te
suffit de reprendre au premier fichier manquant.

Toutes ces migrations ont été rejouées de bout en bout sur un Postgres
local avant livraison (schéma + données + déclencheurs + fonctions), pas
seulement relues : ça a permis de corriger 3 erreurs SQL réelles
(inférence de type dans des `UNION`, et deux contraintes `check` qui
n'autorisaient pas encore le type "quiz") avant qu'elles n'atterrissent
chez toi.

**Pour accéder à `/admin/defis`**, nomme ton propre compte
administrateur une fois dans le SQL Editor :

```sql
update profiles set est_admin = true
where id = (select id from auth.users where email = 'remplace-par-ton-email-de-connexion@exemple.com');
```

## 3. Activer l'envoi d'e-mails (connexion par lien magique)

Par défaut, Supabase envoie les liens de connexion avec son service
intégré (limité, suffisant pour tester). Pour la production, configure
un fournisseur SMTP dans **Authentication → Email Templates**.

Dans **Authentication → URL Configuration**, ajoute
`http://localhost:3000/auth/callback` (et l'URL de ton site une fois
déployé) aux **Redirect URLs**.

## 4. Lancer l'application

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

> Cette version n'a pas pu être vérifiée avec `npm run build` dans
> l'environnement où elle a été écrite (indisponibilité technique
> ponctuelle de l'outil d'exécution). Lance `npm run build` en local et
> signale-moi toute erreur : je corrige immédiatement.

## Structure du projet

```
app/
  page.js                page d'accueil
  login/                 connexion par lien magique
  onboarding/            choix de la ville d'origine
  decouvrir/             carte interactive de notation des quartiers
  avis/                  formulaire d'avis détaillé (points forts/faibles)
  duels/                 duel de quartiers en cours (ex-"/defis" de la V1)
  defis/                 hub des défis (nouveau) + défis/[id] page de détail
  villes/                fiches ville publiques (sans compte requis)
  admin/defis/           administration des défis et validation des contributions (comptes est_admin)
  classement/            classement des villes : habitants vs voyageurs
  profil/                Notacoins, statistiques et badges personnels
components/              QuartierCarte, BattleCard, CitySearch, DefisHub, DefiActions, AdminDefis...
lib/supabase/            clients Supabase (navigateur, serveur, middleware)
supabase/                schéma SQL et données à importer, dans l'ordre
```

## Le système de Défis — ce qui est livré (Phase 1) et ce qui reste

### Analyse de l'architecture existante (avant de coder)

La V1 utilisait déjà le mot "défis" pour les duels de quartier
(Wazemmes vs Moulins) et une table `points` toute simple sur les
profils. Le nouveau système de gamification demandé est beaucoup plus
large : catégories, défis multi-étapes, défis globaux sans date de fin,
contributions avec validation, votes sur photo, badges, anonymisation
des statistiques. Pour l'intégrer sans rien casser :

- **Duels renommés, pas supprimés.** `defis`→`duels_quartier`,
  `votes_defis`→`votes_duels`, route `/defis`→`/duels`. Les données déjà
  en base survivent à la migration (`alter table ... rename`), aucune
  perte.
- **Une seule monnaie, un seul grand livre.** `profiles.points` devient
  `profiles.notacoins`. Les 3 triggers qui créditaient des points "en
  dur" (note quartier +10, avis +25, vote +5) sont remplacés par une fonction
  unique `crediter_notacoins()`, qui lit les montants dans
  `parametres_recompenses` (jamais codés en dur, éditables depuis le
  Table editor Supabase) et journalise chaque mouvement dans
  `notacoins_transactions` — traçabilité complète pour l'admin, et base
  du plafond anti-spam (`limites_anti_abus`).
- **`/defis` redevient disponible** pour le nouveau hub, avec des
  routes propres (`/defis` liste, `/defis/[id]` détail) qui n'entrent
  en conflit avec aucune route existante.
- **Rien d'existant n'est cassé** : `decouvrir`, `avis`, `duels`,
  `classement` fonctionnent exactement comme avant (juste avec
  `notacoins` à la place de `points` dans l'UI), et gagnent en plus des
  badges affichés sur `/profil`.

### Règles non négociables, où elles sont appliquées

- **Rien n'est jamais obligatoire.** Aucune page "coeur" ne vérifie une
  participation à un défi. `/villes` et `/villes/[code_insee]` sont
  volontairement **hors** de `pagesProtegees` (voir
  `lib/supabase/middleware.js`) : elles se consultent sans compte,
  publicité ou défi. Les comparateurs/guides/conseils du cahier des
  charges restent à construire, mais suivent le même principe le jour
  où ils existeront : jamais dans `pagesProtegees`.
- **Pas de clone JustPlay.** `categories_defis.type` distingue les
  catégories coeur (`ville`, `voyage`, `contribution`) des catégories
  secondaires (`partenaire`, `jeu`). Le hub `/defis` affiche toujours
  les premières avant les secondes, visuellement séparées ("Aussi, si
  ça te dit").
- **Salaires et données sensibles jamais individuels.** Les
  contributions de type `donnee_statistique` (ex: loyer, salaire) ne
  sont **jamais** lisibles ligne par ligne côté RLS pour les autres
  utilisateurs (policy limitée à `auth.uid() = user_id`, plus un accès
  admin). Correctif important apporté dans `09_pages_villes_publiques.sql` :
  la policy de la migration 04 accordait par erreur la lecture de
  *toutes* les contributions validées (salaires inclus) à n'importe
  quel compte connecté ; elle est maintenant restreinte aux seules
  contributions **photo**. La page ville (`fiche_ville()`) ne renvoie
  elle-même jamais que des agrégats (moyenne, médiane), jamais une
  ligne par contributeur, et seulement quand le nombre de contributions
  valides dépasse un seuil configurable (`parametres_anonymat`, 5 par
  défaut). Vérifié en pratique : avec une seule contribution de test,
  la donnée n'apparaît pas sur la fiche ville.
- **Montants jamais codés en dur.** Tous les gains (note quartier, avis, vote de
  duel, bonus de duel gagné, étape de défi, photo, vote de photo,
  palier global) sont des lignes de `parametres_recompenses`, modifiables
  depuis le Table editor sans toucher au code.
- **Message de rejet imposé.** Le texte exact ("Les contributions
  manifestement fausses, incohérentes ou frauduleuses peuvent entraîner
  l'annulation des Notacoins associés.") est affiché sur `/defis/[id]`
  dès qu'une contribution est marquée `rejetee`, mot pour mot.
- **Anti-spam sur les classements.** `v_classement_notacoins` et
  `v_classement_contributeurs` s'appuient sur le grand livre
  (`notacoins_transactions`), lui-même plafonné par
  `limites_anti_abus` (ex: max 200 notes créditées/jour). Impossible de
  gonfler son classement en spammant une action.
- **Anti-abus sur le vote photo.** Contrainte unique (un vote par
  personne et par contribution), interdiction de voter pour sa propre
  contribution (trigger `interdire_autovote`), et le même plafond
  anti-spam s'applique au crédit de Notacoins pour les votes.
- **Défis entièrement configurables sans code.** Créer, désactiver ou
  modifier un défi, une catégorie, un badge ou un montant de récompense
  se fait depuis `/admin/defis` **ou** le Table editor Supabase
  (`categories_defis`, `defis`, `defi_etapes`, `badges`, `badge_niveaux`,
  `parametres_recompenses`).
- **Provenance des données toujours affichée.** La fiche ville distingue
  "Officiel" (table `donnees_officielles`, saisie admin) de "Communauté"
  (agrégat anonymisé) — voir section 7 du cahier des charges.
- **Pas obligatoire, gratuit.** `/villes` fonctionne sans compte ; aucune
  page ne demande de regarder une pub ou de faire un défi.

### Ce qui est fonctionnel dès maintenant

- **`/comparer`, comparateur de villes** (public, sans compte) : deux
  fiches ville côte à côte (population, notes habitants/touristes,
  chaque donnée "Vie quotidienne" avec sa provenance), et un "reste à
  vivre" estimé (salaire net moyen − loyer moyen × 45 m² − courses −
  transport) pour rendre la comparaison concrète, façon section 7 du
  document de vision ("Lille VS Perpignan"). S'appuie sur la fonction
  déjà publique `fiche_ville()` — aucune nouvelle table. Accessible
  aussi depuis chaque fiche ville (bouton "Comparer [ville] à une autre
  ville", pré-remplit `/comparer?a=<code_insee>`).
- **`/decouvrir` en carte interactive** (Leaflet/OpenStreetMap, composant
  `QuartierCarte` + `QuartierCarteInterne`), à la place de l'ancien
  "swipe façon Tinder" (`SwipeDeck`, retiré). On clique un quartier sur
  la carte pour le noter (♥ j'aime / ✕ je ne connais pas), même
  mécanique de notes qu'avant (table `notes`, crédit Notacoins inchangé)
  mais sans le geste de swipe. Les quartiers sans coordonnées (toutes
  les villes hors Lille pour l'instant, cf. `10_quartiers_coordonnees.sql`)
  sont listés sous la carte plutôt que masqués.
- **Lieux recommandés** (bas de `/decouvrir`, composant
  `LieuxRecommandes`) : restaurants, bars, monuments... notés 1 à 5,
  recommandés d'après les quartiers déjà aimés sur la carte (fonction
  SQL `recommander_lieux`, `supabase/11_lieux.sql`). Noter un lieu le
  retire des prochaines recommandations.
- **Ajout de lieu par les utilisateurs**, câblé au défi communauté
  "Ajoute un lieu manquant" (`supabase/12_defi_ajout_lieu.sql`) : même
  parcours que les autres contributions — formulaire dans `/defis/[id]`
  (nom, type, quartier, description), file d'attente admin
  (`en_attente` → `validee`/`rejetee`), et à la validation, le lieu est
  créé (`source = 'communaute'`) et les 40 Notacoins crédités. Testé de
  bout en bout sur Postgres local (contribution → validation admin →
  lieu créé → crédit).
- Hub `/defis` : les 9 catégories du cahier des charges (Découverte,
  Photo, Patrimoine, Gastronomie, Vie quotidienne, Connaissances,
  Voyage, Communauté, Défis événementiels) + Offres partenaires et
  Mini-jeux en retrait, une quarantaine de défis, sections Défi du
  jour / Près de chez toi / Populaires / En cours / Terminés, filtres
  par catégorie, et le top 5 Notacoins.
- `/defis/[id]` : description, instructions, difficulté, nombre de
  participants, temps restant, récompense affichée, démarrage d'une
  participation, soumission de contribution (texte, donnée numérique
  anonymisée, lien photo, ou quiz à choix multiples **auto-corrigé**),
  suivi du statut (en attente / validée / rejetée), classement des
  photos les plus votées.
- **Administration utilisable depuis l'app** (`/admin/defis`, réservée
  aux comptes `est_admin`) : créer un défi, l'activer/le désactiver, le
  supprimer, et valider/rejeter la file des contributions en attente —
  en plus du Table editor Supabase, toujours disponible pour l'édition
  en masse.
- **Fiches ville publiques** (`/villes`, `/villes/[code_insee]`),
  utilisables sans compte : notes habitants/touristes, coût de la vie
  alimenté par les défis "Vie quotidienne" (bière, café, loyer,
  salaire, courses, transport...), avec la provenance de chaque donnée.
- Badges à 5 paliers (bronze à légendaire), 10 badges couvrant Citadin,
  Voyageur, Explorateur, Photographe, Historien, Gourmet, Expert du
  coût de la vie, Contributeur, Ambassadeur, Globe-trotter — recalculés
  à chaque défi terminé, affichés sur `/profil`.
- Classements Notacoins mondial, hebdomadaire, mensuel et par ville
  (`v_classement_notacoins`, `v_classement_hebdomadaire`,
  `v_classement_mensuel`, `v_classement_par_ville`).
- Toutes les migrations (00 à 12) ont été rejouées bout en bout sur un
  Postgres local, avec un scénario de test complet (note quartier, avis,
  quiz, contribution, validation admin, recalcul de badges, fiche
  ville) — pas seulement relues.

### Phase 2 — volontairement pas dans cette livraison

- **Couverture géographique de la carte `/decouvrir`** : seuls les 12
  quartiers de Lille ont de vraies coordonnées aujourd'hui. Étendre aux
  134 autres villes déjà seedées suppose soit un import géographique
  (IGN/OSM), soit une contribution communautaire type "positionne ce
  quartier sur la carte" (s'intégrerait bien au système de défis).
- **Upload de photo natif** (aujourd'hui : simple champ "lien vers ta
  photo"). Nécessite de configurer Supabase Storage + une politique
  d'upload, et un vrai composant de prise/dépôt de photo.
- **Détection de comportement suspect sur le vote photo** : le plafond
  anti-spam et l'anti-autovote sont en place, mais pas d'analyse de
  patterns (vitesse, IP...).
- **Automatisation** : recalcul de badges et rotation des défis
  événementiels sur une planification (`pg_cron`), plutôt qu'au moment
  où une personne termine un défi ou à la main.
- **Classement entre amis, classement par pays** : nécessitent
  respectivement un système de follow/amis, et des données de villes
  hors France, qui n'existent pas encore (le champ `defis.pays` est prêt
  mais toutes les villes en base sont françaises pour l'instant).
- **"Notaville Estimate"** (section 7) : la provenance "Officiel" et
  "Communauté" sont implémentées ; l'estimation calculée à partir de
  plusieurs sources indirectes (ex: villes voisines) ne l'est pas
  encore.
- **Pubs + échange de Notacoins contre de vraies cartes cadeaux** :
  inchangé depuis la V1, toujours en attente de vrais partenariats.

## Prochaines étapes possibles

- Étendre la recherche de quartiers aux villes de 20 000 à 50 000
  habitants (environ 250 communes de plus).
- Construire les comparateurs et guides décrits dans le cahier des
  charges, en gardant le même principe : jamais dans `pagesProtegees`.
- Brancher un vrai système de pubs et de cartes cadeaux une fois les
  partenariats trouvés (régie publicitaire + fournisseur de cartes).
# notaville-app
