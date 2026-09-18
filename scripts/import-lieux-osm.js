#!/usr/bin/env node
'use strict'

// ============================================================
// Import national de lieux depuis OpenStreetMap (Overpass API).
//
// Remplit la table `lieux` pour toute la France : restaurants, bars,
// cafés, musées, monuments, attractions touristiques, lieux de culte,
// loisirs, hôtels -- avec un plafond configurable par commune et par
// catégorie (voir MAX_PAR_VILLE_ET_CATEGORIE ci-dessous), pour couvrir
// tout le pays sans faire exploser le volume.
//
// Source : OpenStreetMap, gratuite, sans clé, licence ODbL (attribution
// obligatoire -- déjà ajoutée sur les fiches lieu concernées, voir
// `source: 'osm'`).
//
// LANCEMENT (depuis la racine du projet, terminal Mac) :
//   node scripts/import-lieux-osm.js
//
// TEST RAPIDE avant de lancer les 101 départements (recommandé --
// permet de vérifier en moins d'une minute que l'accès à Overpass, la
// clé Supabase et la résolution des communes fonctionnent bien) :
//   node scripts/import-lieux-osm.js --test
// (ne traite que le Nord (59) et la catégorie "restaurant")
//
// Options avancées :
//   --departement=59        limite à un seul département
//   --categorie=restaurant  limite à une seule catégorie
//
// Ça tourne plusieurs heures pour toute la France (le script interroge
// poliment l'API publique Overpass, avec des pauses entre requêtes pour
// ne pas se faire bannir). Il peut être interrompu (Ctrl+C) et relancé
// sans tout refaire : la progression est sauvegardée dans
// scripts/.import-lieux-progres.json (départements+catégories déjà
// traités), et les lieux déjà importés sont mis à jour plutôt que
// dupliqués (upsert sur l'identifiant OSM).
//
// PRÉREQUIS :
//   1. Avoir exécuté supabase/26_lieux_nationaux.sql dans Supabase.
//   2. Ajouter la clé "service_role" de ton projet Supabase (Project
//      Settings -> API -> Project API keys -> service_role, PAS la clé
//      "anon") dans .env.local :
//        SUPABASE_SERVICE_ROLE_KEY=colle-la-clé-ici
//      Cette clé donne un accès total à la base (elle contourne les
//      règles de sécurité RLS) -- c'est nécessaire pour écrire des
//      dizaines de milliers de lignes d'un coup, mais elle ne doit
//      JAMAIS être utilisée côté site (elle reste seulement dans
//      .env.local, qui n'est jamais commité sur GitHub -- vérifie que
//      .gitignore contient bien ".env*.local" si tu as un doute).
// ============================================================

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// ---------- Configuration ----------

// Combien de lieux garder au maximum par commune et par catégorie --
// évite qu'une grande ville n'en ramène des milliers alors qu'une seule
// page /decouvrir n'en affiche qu'une poignée. Modifiable ici.
const MAX_PAR_VILLE_ET_CATEGORIE = 30

// Délai entre deux requêtes Overpass (politesse envers un service
// public gratuit -- un délai trop court fait bannir l'IP).
const DELAI_ENTRE_REQUETES_MS = 3000

// Plusieurs miroirs Overpass : si l'un est surchargé/indisponible, on
// bascule sur le suivant plutôt que d'échouer.
const MIROIRS_OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
]

const FICHIER_PROGRES = path.join(__dirname, '.import-lieux-progres.json')
const FICHIER_NON_RATTACHES = path.join(__dirname, '.import-lieux-non-rattaches.csv')

// Catégories importées, avec leur(s) requête(s) Overpass (filtre par
// tags) et leur correspondance vers lieux.type (voir lib/lieux.js pour
// la liste complète affichée dans l'appli). `filtres` est une LISTE :
// chaque filtre devient sa propre ligne `nwr[...](area.dept);` dans la
// requête (union OSM), pour combiner par exemple leisure=* ET
// amenity=cinema/theatre dans une même catégorie -- un seul
// `nwr["a"]["b"]` ferait un ET entre les deux tags, pas un OU entre
// deux familles de lieux différentes.
const CATEGORIES = [
  { type: 'restaurant', filtres: ['["amenity"~"^(restaurant|fast_food)$"]'] },
  { type: 'bar', filtres: ['["amenity"~"^(bar|pub)$"]'] },
  { type: 'cafe', filtres: ['["amenity"="cafe"]'] },
  { type: 'musee', filtres: ['["tourism"="museum"]'] },
  { type: 'monument', filtres: ['["historic"~"^(monument|memorial|castle|ruins|fort|citywalls)$"]'] },
  { type: 'attraction', filtres: ['["tourism"~"^(attraction|viewpoint|artwork|gallery|zoo|theme_park)$"]'] },
  { type: 'lieu_culte', filtres: ['["amenity"="place_of_worship"]'] },
  { type: 'parc', filtres: ['["leisure"~"^(park|garden)$"]'] },
  { type: 'loisir', filtres: ['["leisure"~"^(sports_centre|fitness_centre|water_park|bowling_alley|miniature_golf|amusement_arcade)$"]', '["amenity"~"^(cinema|theatre)$"]'] },
  { type: 'hotel', filtres: ['["tourism"="hotel"]'] },
]

// Départements français (métropole 01-95, Corse 2A/2B, DOM 971-976).
// `ref:INSEE` sur la relation de département OSM = ce code. Les
// collectivités d'outre-mer plus isolées (975 Saint-Pierre-et-Miquelon,
// 977/978 Saint-Barthélemy/Saint-Martin, Polynésie, Nouvelle-Calédonie,
// Wallis-et-Futuna...) ne sont pas incluses ici (peu de population,
// découpage administratif OSM différent) -- à ajouter à la main si
// besoin, en vérifiant d'abord que la zone existe bien dans OSM avec
// admin_level=6 et le bon ref:INSEE.
const DEPARTEMENTS = [
  ...Array.from({ length: 95 }, (_, i) => String(i + 1).padStart(2, '0')).filter((d) => d !== '20'),
  '2A', '2B',
  '971', '972', '973', '974', '976',
]

// ---------- Chargement de .env.local (sans dépendance dotenv) ----------
function chargerEnvLocal() {
  const chemin = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(chemin)) return
  const lignes = fs.readFileSync(chemin, 'utf8').split('\n')
  for (const ligne of lignes) {
    const propre = ligne.trim()
    if (!propre || propre.startsWith('#')) continue
    const idx = propre.indexOf('=')
    if (idx === -1) continue
    const cle = propre.slice(0, idx).trim()
    let valeur = propre.slice(idx + 1).trim()
    if ((valeur.startsWith('"') && valeur.endsWith('"')) || (valeur.startsWith("'") && valeur.endsWith("'"))) {
      valeur = valeur.slice(1, -1)
    }
    if (!(cle in process.env)) process.env[cle] = valeur
  }
}
chargerEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Il manque NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY dans .env.local.\n" +
    "Voir l'en-tête de ce fichier pour comment récupérer la clé service_role."
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ---------- Villes de France (même fichier que l'appli) ----------
function chargerVilles() {
  const chemin = path.join(__dirname, '..', 'public', 'data', 'villes-fr.json')
  const rows = JSON.parse(fs.readFileSync(chemin, 'utf8'))
  return rows.map(([code_insee, nom, departement, region, population]) => ({
    code_insee,
    nom,
    departement,
    region,
    population,
  }))
}

function normaliser(texte) {
  return (texte ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Les grandes villes divisées en arrondissements dans OSM (addr:city =
// "Paris 15e Arrondissement" etc.) doivent se rattacher au code commune
// global déjà utilisé partout ailleurs dans l'appli (villesCoords.js),
// pas à un arrondissement qui n'existe pas dans nos données.
const VILLES_ARRONDISSEMENTS = [
  { motif: /^paris\b/, code_insee: '75056' },
  { motif: /^lyon\b/, code_insee: '69123' },
  { motif: /^marseille\b/, code_insee: '13055' },
]

// Préfixe départemental d'un code INSEE : 2 caractères pour la
// métropole (y compris "2A"/"2B" pour la Corse), 3 chiffres pour
// l'outre-mer (97x/98x) -- un code commune outre-mer est numérique sur
// 5 chiffres comme en métropole, donc la longueur seule ne suffit pas à
// les distinguer (piège trouvé en testant : "97302" Cayenne donnait le
// préfixe "97" au lieu de "973", et ne matchait donc jamais aucun
// département de la liste DEPARTEMENTS).
function prefixeDepartemental(code_insee) {
  if (/^(97|98)/.test(code_insee)) return code_insee.slice(0, 3)
  return code_insee.slice(0, 2)
}

// Construit un index nom-normalisé -> [villes] limité à un département,
// pour résoudre "addr:city" en code_insee sans ambiguïté inter-région.
function indexVillesParDepartement(villes) {
  const index = new Map() // clé départementale (préfixe code_insee) -> Map(nomNormalisé -> ville)
  for (const v of villes) {
    const prefixe = prefixeDepartemental(v.code_insee)
    if (!index.has(prefixe)) index.set(prefixe, new Map())
    index.get(prefixe).set(normaliser(v.nom), v)
  }
  return index
}

function resoudreCommune(addrCity, prefixeDepartement, indexParDept) {
  if (!addrCity) return null
  const norm = normaliser(addrCity)
  for (const arr of VILLES_ARRONDISSEMENTS) {
    if (arr.motif.test(norm)) return arr.code_insee
  }
  const carte = indexParDept.get(prefixeDepartement)
  if (!carte) return null
  if (carte.has(norm)) return carte.get(norm).code_insee
  // Repli : certaines communes OSM ajoutent un complément ("Lille Centre")
  // -- on tente un match par préfixe si un seul candidat correspond.
  const candidats = [...carte.entries()].filter(([nom]) => nom.startsWith(norm) || norm.startsWith(nom))
  if (candidats.length === 1) return candidats[0][1].code_insee
  return null
}

// ---------- Overpass ----------
function construireRequete(dept, filtres) {
  const lignes = filtres.map((f) => `      nwr${f}(area.dept);`).join('\n')
  return `
    [out:json][timeout:180];
    area["boundary"="administrative"]["admin_level"="6"]["ref:INSEE"="${dept}"]->.dept;
    (
${lignes}
    );
    out center tags;
  `
}

async function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function interrogerOverpass(requete, tentative = 0) {
  const miroir = MIROIRS_OVERPASS[tentative % MIROIRS_OVERPASS.length]
  try {
    const res = await fetch(miroir, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Les miroirs Overpass demandent (et parfois exigent) un
        // User-Agent descriptif -- un client anonyme/générique se fait
        // parfois rejeter (406/403) par certains d'entre eux même hors
        // limite de débit réelle.
        'User-Agent': 'NotavilleImportLieux/1.0 (import ponctuel de lieux publics OSM pour notaville-app.vercel.app)',
        // curl envoie par défaut "Accept: */*", mais le fetch de Node
        // (undici) n'ajoute aucun en-tête Accept -- et au moins un des
        // miroirs (répond 406 "Not Acceptable" à une requête qui n'en a
        // pas, alors que curl passe sans problème avec la même requête
        // exacte. On l'ajoute explicitement pour imiter curl.
        Accept: '*/*',
      },
      body: 'data=' + encodeURIComponent(requete),
    })
    if (res.status === 429 || res.status === 504) {
      if (tentative >= 5) throw new Error(`Overpass indisponible après ${tentative} tentatives (HTTP ${res.status})`)
      const attente = 10000 * (tentative + 1)
      console.log(`   Overpass occupé (${res.status}), nouvelle tentative dans ${attente / 1000}s...`)
      await attendre(attente)
      return interrogerOverpass(requete, tentative + 1)
    }
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    if (tentative >= 5) throw err
    const attente = 8000 * (tentative + 1)
    const etiquette = err.message.startsWith('Overpass HTTP') ? 'Erreur HTTP' : 'Erreur réseau'
    console.log(`   ${etiquette} (${err.message}), nouvelle tentative dans ${attente / 1000}s...`)
    await attendre(attente)
    return interrogerOverpass(requete, tentative + 1)
  }
}

// Score grossier de "complétude" d'une fiche OSM, pour choisir lesquels
// garder quand une commune dépasse le plafond (aucune note n'existe côté
// OSM, donc on privilégie les fiches les plus renseignées).
function scoreCompletude(tags) {
  let score = 0
  if (tags.website) score += 2
  if (tags.phone || tags['contact:phone']) score += 1
  if (tags.opening_hours) score += 1
  if (tags.description) score += 2
  if (tags['addr:housenumber'] && tags['addr:street']) score += 2
  return score
}

function construireAdresse(tags) {
  const parties = []
  if (tags['addr:housenumber']) parties.push(tags['addr:housenumber'])
  if (tags['addr:street']) parties.push(tags['addr:street'])
  return parties.length ? parties.join(' ') : null
}

function construireDescription(tags) {
  if (tags.description) return tags.description.slice(0, 500)
  if (tags.cuisine) return `Cuisine : ${tags.cuisine.replace(/;/g, ', ')}`
  return null
}

// ---------- Progression (reprise après interruption) ----------
function chargerProgres() {
  if (!fs.existsSync(FICHIER_PROGRES)) return { fait: [] }
  try {
    return JSON.parse(fs.readFileSync(FICHIER_PROGRES, 'utf8'))
  } catch {
    return { fait: [] }
  }
}

function sauvegarderProgres(progres) {
  fs.writeFileSync(FICHIER_PROGRES, JSON.stringify(progres, null, 2))
}

// ---------- Insertion Supabase ----------
async function upsererLieux(lignes) {
  if (lignes.length === 0) return { inserees: 0 }
  const TAILLE_LOT = 500
  let total = 0
  for (let i = 0; i < lignes.length; i += TAILLE_LOT) {
    const lot = lignes.slice(i, i + TAILLE_LOT)
    const { error } = await supabase.from('lieux').upsert(lot, { onConflict: 'osm_id' })
    if (error) {
      console.error('   Erreur Supabase (lot ignoré) :', error.message)
      continue
    }
    total += lot.length
  }
  return { inserees: total }
}

// ---------- Boucle principale ----------
async function main() {
  console.log('Chargement des 34 969 communes...')
  const villes = chargerVilles()
  const indexParDept = indexVillesParDepartement(villes)

  const progres = chargerProgres()
  const dejaFait = new Set(progres.fait)

  const nonRattaches = new Map() // addr:city introuvable -> nb d'occurrences
  let totalImportes = 0
  let totalIgnoresSansNom = 0
  let totalIgnoresSansCommune = 0

  // ---- Options en ligne de commande ----
  const args = process.argv.slice(2)
  const estTest = args.includes('--test')
  const argDept = args.find((a) => a.startsWith('--departement='))?.split('=')[1]
  const argCat = args.find((a) => a.startsWith('--categorie='))?.split('=')[1]

  const departements = estTest ? ['59'] : argDept ? [argDept] : DEPARTEMENTS
  const categories = estTest ? [CATEGORIES.find((c) => c.type === 'restaurant')] : argCat ? CATEGORIES.filter((c) => c.type === argCat) : CATEGORIES

  if (departements.some((d) => !DEPARTEMENTS.includes(d))) {
    console.error(`Département inconnu : ${argDept}. Valeurs possibles : ${DEPARTEMENTS.join(', ')}`)
    process.exit(1)
  }
  if (categories.some((c) => !c)) {
    console.error(`Catégorie inconnue : ${argCat}. Valeurs possibles : ${CATEGORIES.map((c) => c.type).join(', ')}`)
    process.exit(1)
  }
  if (estTest) {
    console.log('MODE TEST : département 59 (Nord), catégorie "restaurant" uniquement.\n')
  }

  const combinaisons = []
  for (const dept of departements) {
    for (const cat of categories) combinaisons.push({ dept, cat })
  }

  console.log(`${departements.length} département(s) x ${categories.length} catégorie(s) = ${combinaisons.length} requêtes à faire.`)
  console.log(`Plafond : ${MAX_PAR_VILLE_ET_CATEGORIE} lieux par commune et par catégorie.\n`)

  for (let i = 0; i < combinaisons.length; i++) {
    const { dept, cat } = combinaisons[i]
    const cle = `${dept}:${cat.type}`
    if (dejaFait.has(cle)) continue

    process.stdout.write(`[${i + 1}/${combinaisons.length}] Département ${dept} — ${cat.type}... `)

    let data
    try {
      data = await interrogerOverpass(construireRequete(dept, cat.filtres))
    } catch (err) {
      console.log(`ÉCHEC (${err.message}), passage au suivant.`)
      continue
    }

    const elements = data.elements ?? []
    const parCommune = new Map() // code_insee -> [lieu, ...]

    for (const el of elements) {
      const tags = el.tags ?? {}
      const nom = tags.name
      if (!nom) {
        totalIgnoresSansNom++
        continue
      }
      const lat = el.lat ?? el.center?.lat
      const lon = el.lon ?? el.center?.lon
      const codeInsee = resoudreCommune(tags['addr:city'], dept, indexParDept)
      if (!codeInsee) {
        totalIgnoresSansCommune++
        if (tags['addr:city']) {
          nonRattaches.set(tags['addr:city'], (nonRattaches.get(tags['addr:city']) ?? 0) + 1)
        }
        continue
      }
      const clefGroupe = codeInsee
      if (!parCommune.has(clefGroupe)) parCommune.set(clefGroupe, [])
      parCommune.get(clefGroupe).push({
        osm_id: `${el.type[0]}${el.id}`,
        ville_code_insee: codeInsee,
        nom: nom.slice(0, 200),
        type: cat.type,
        description: construireDescription(tags),
        adresse: construireAdresse(tags),
        latitude: lat ?? null,
        longitude: lon ?? null,
        source: 'osm',
        actif: true,
        _score: scoreCompletude(tags),
      })
    }

    const lignesAInserer = []
    for (const [, lieuxCommune] of parCommune) {
      lieuxCommune.sort((a, b) => b._score - a._score)
      for (const l of lieuxCommune.slice(0, MAX_PAR_VILLE_ET_CATEGORIE)) {
        delete l._score
        lignesAInserer.push(l)
      }
    }

    const { inserees } = await upsererLieux(lignesAInserer)
    totalImportes += inserees
    console.log(`${inserees} lieux (sur ${elements.length} trouvés par OSM).`)

    dejaFait.add(cle)
    progres.fait = [...dejaFait]
    sauvegarderProgres(progres)

    await attendre(DELAI_ENTRE_REQUETES_MS)
  }

  // Journal des addr:city qui n'ont pas pu être rattachées à une commune
  // connue (utile pour améliorer la résolution plus tard).
  if (nonRattaches.size > 0) {
    const lignes = [...nonRattaches.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([ville, n]) => `${n},"${ville.replace(/"/g, '""')}"`)
    fs.writeFileSync(FICHIER_NON_RATTACHES, 'occurrences,addr_city\n' + lignes.join('\n'))
  }

  console.log('\n============================================================')
  console.log(`Terminé. ${totalImportes} lieux importés/mis à jour au total.`)
  console.log(`Ignorés (pas de nom) : ${totalIgnoresSansNom}`)
  console.log(`Ignorés (commune non identifiée) : ${totalIgnoresSansCommune}`)
  if (nonRattaches.size > 0) {
    console.log(`Détail des communes non identifiées : ${FICHIER_NON_RATTACHES}`)
  }
  console.log('============================================================')
}

main().catch((err) => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})
