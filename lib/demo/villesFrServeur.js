// Équivalent lib/demo/villesFr.js pour les Server Components (pas de
// window/fetch relatif côté serveur) : lit directement le fichier JSON
// des 34 969 communes sur disque, avec un cache mémoire par instance de
// serveur pour ne pas relire les ~2 Mo à chaque requête.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

let cachePromesse = null

async function chargerVillesFrServeur() {
  if (!cachePromesse) {
    cachePromesse = readFile(path.join(process.cwd(), 'public', 'data', 'villes-fr.json'), 'utf-8').then(
      (contenu) => JSON.parse(contenu)
    )
  }
  return cachePromesse
}

// Renvoie { code_insee, nom, departement, region, population } ou null
// si le code INSEE n'existe pas dans le référentiel.
export async function trouverVilleFrParCode(codeInsee) {
  const villes = await chargerVillesFrServeur()
  const ligne = villes.find((v) => v[0] === codeInsee)
  if (!ligne) return null
  const [code_insee, nom, departement, region, population] = ligne
  return { code_insee, nom, departement, region, population }
}
