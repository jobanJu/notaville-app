import crypto from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/serviceRole'

// Postback AdGem : AdGem appelle cette URL en POST, en JSON, à chaque
// conversion (utilisateur qui termine une offre). Format réel constaté
// dans le dashboard AdGem (formulaire de propriété -- choisir "Méthode
// POST" et coller cette URL dans "URL de publication") :
//   { "request_id": "...", "timestamp": ..., "data": { "player_id": ...,
//     "amount": ..., "payout": ..., "conversion_id": ..., ... } }
// -- les champs utiles sont imbriqués dans `data`, pas à la racine.
//
// Deux choses à vérifier avant de créditer quoi que ce soit :
//
//   1. La signature : AdGem envoie un header `Signature` = HMAC-SHA256
//      du corps brut de la requête, avec la clé de postback ("clef
//      retour") comme secret. On recalcule ce HMAC nous-mêmes et on
//      compare -- si ça ne correspond pas, l'appel ne vient pas
//      vraiment d'AdGem (ou le corps a été altéré en route), donc 401.
//
//   2. `player_id` : c'est l'identifiant que NOUS avons transmis à
//      AdGem au moment d'ouvrir l'offerwall (paramètre subid/playerid
//      de l'URL de l'offerwall côté client -- reste à câbler côté
//      front quand l'offerwall AdGem sera intégré à l'app : il faut lui
//      passer l'id utilisateur Notaville, sinon ce postback ne saura
//      jamais quel compte créditer). Doit correspondre à un profil
//      existant, sinon la conversion est enregistrée nulle part et on
//      répond 400 (AdGem ne renverra alors plus ce postback : sans
//      player_id valide il n'y a de toute façon personne à créditer).
//
// ADGEM_POSTBACK_KEY vit uniquement dans .env.local (jamais commitée,
// jamais dans le code, jamais collée dans un chat -- voir la note de
// sécurité laissée dans .env.local.example). La "clef retour" que tu as
// collée dans notre conversation doit être considérée comme
// potentiellement exposée : le plus sûr est de la régénérer depuis le
// dashboard AdGem avant la mise en prod.
export async function POST(request) {
  const postbackKey = process.env.ADGEM_POSTBACK_KEY
  if (!postbackKey) {
    console.error('[adgem/postback] ADGEM_POSTBACK_KEY manquante dans .env.local')
    return new Response('Configuration serveur manquante', { status: 500 })
  }

  const corpsBrut = await request.text()
  const signatureRecue = request.headers.get('signature') ?? request.headers.get('Signature')

  if (!signatureRecue) {
    return new Response('Signature manquante', { status: 401 })
  }

  const signatureAttendue = crypto.createHmac('sha256', postbackKey).update(corpsBrut).digest('hex')

  const bufA = Buffer.from(signatureRecue)
  const bufB = Buffer.from(signatureAttendue)
  const signatureValide =
    bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)

  if (!signatureValide) {
    console.error('[adgem/postback] signature invalide')
    return new Response('Signature invalide', { status: 401 })
  }

  let enveloppe
  try {
    enveloppe = JSON.parse(corpsBrut)
  } catch {
    return new Response('JSON invalide', { status: 400 })
  }

  // Format réel constaté dans le dashboard AdGem (formulaire de
  // propriété, section "Référence de publication") : les champs utiles
  // sont imbriqués dans un objet `data`, avec `request_id` et
  // `timestamp` au niveau racine -- PAS à plat comme le suggérait la
  // doc générique postbacks-v3. Exemple reçu :
  //   { "request_id": "...", "timestamp": ..., "data": { "player_id": ..., "amount": ..., "payout": ..., ... } }
  const donnees = enveloppe.data ?? enveloppe

  const playerId = donnees.player_id
  const conversionId = String(donnees.conversion_id ?? '')
  // "amount" (doc AdGem) = quantité de monnaie virtuelle déjà exprimée
  // dans l'unité configurée côté dashboard AdGem pour cette app -- on
  // suppose ici qu'elle correspond directement à des Notacoins (1
  // amount AdGem = 1 Notacoin). Si le dashboard AdGem est configuré
  // différemment, ajuster la conversion ci-dessous en conséquence.
  const montant = Math.round(Number(donnees.amount))

  if (!playerId || !conversionId || !Number.isFinite(montant) || montant <= 0) {
    console.error('[adgem/postback] payload incomplet ou invalide', {
      hasPlayerId: Boolean(playerId),
      conversionId,
      amount: donnees.amount,
    })
    return new Response('Payload invalide', { status: 400 })
  }

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.rpc('crediter_notacoins_adgem', {
      p_user_id: playerId,
      p_montant: montant,
      p_conversion_id: conversionId,
      p_offer_id: donnees.offer_id != null ? String(donnees.offer_id) : null,
      p_campaign_id: donnees.campaign_id != null ? String(donnees.campaign_id) : null,
      p_conversion_type: donnees.conversion_type ? String(donnees.conversion_type) : null,
      p_payout_usd: donnees.payout != null ? Number(donnees.payout) : null,
    })

    if (error) {
      console.error('[adgem/postback] erreur crediter_notacoins_adgem', error.message)
      return new Response('Erreur serveur', { status: 500 })
    }

    // data === false : conversion déjà traitée (retry AdGem), pas une
    // erreur -- on répond quand même 200 pour qu'AdGem arrête de réessayer.
    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[adgem/postback] exception', err)
    return new Response('Erreur serveur', { status: 500 })
  }
}
