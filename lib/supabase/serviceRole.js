import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Client Supabase "service_role" -- contourne RLS, ne doit JAMAIS être
// importé depuis un composant client ni exposé au navigateur. Réservé
// aux routes serveur qui reçoivent un appel serveur-à-serveur externe
// sans session utilisateur (ex. postback AdGem) et qui doivent donc
// s'authentifier autrement (ici : vérification de signature HMAC dans
// la route elle-même, voir app/api/adgem/postback/route.js).
//
// SUPABASE_SERVICE_ROLE_KEY vit uniquement dans .env.local (jamais
// préfixée NEXT_PUBLIC_, jamais commitée, jamais collée dans un chat) --
// à copier depuis Supabase > Project Settings > API > service_role.
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local')
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
