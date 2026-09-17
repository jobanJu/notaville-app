import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { DEMO_COOKIE } from '@/lib/demo/constants'

// Rafraîchit la session Supabase à chaque requête et protège les pages
// qui nécessitent d'être connecté.
export async function updateSession(request) {
  // Mode démo (compte de test Test1/1234, voir /login) : on ne touche
  // jamais au vrai Supabase dans ce cas — il n'y a peut-être même pas de
  // projet configuré — et on laisse passer les pages protégées.
  if (request.cookies.get(DEMO_COOKIE)?.value === '1') {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // /villes n'est volontairement PAS dans cette liste : les pages villes
  // et statistiques doivent rester accessibles sans compte (cahier des
  // charges, section 14).
  const pagesProtegees = ['/decouvrir', '/avis', '/defis', '/duels', '/profil', '/onboarding', '/admin']
  const cheminProtege = pagesProtegees.some((p) => request.nextUrl.pathname.startsWith(p))

  if (!user && cheminProtege) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}
