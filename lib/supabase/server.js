import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Client Supabase pour les composants serveur (Server Components, Server Actions, Route Handlers).
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Appelé depuis un Server Component : le middleware gère déjà
            // le rafraîchissement de session, on peut ignorer l'erreur.
          }
        },
      },
    }
  )
}
