// Le mode démo (compte de test Test1/1234) tient dans un simple cookie
// non-sensible, lisible aussi bien côté serveur que côté client — il ne
// remplace jamais le vrai Supabase, il permet juste de cliquer dans
// l'interface sans base connectée.
import { cookies } from 'next/headers'
import { DEMO_COOKIE } from './constants'

export { DEMO_COOKIE }

export async function isDemoMode() {
  const store = await cookies()
  return store.get(DEMO_COOKIE)?.value === '1'
}
