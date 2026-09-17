import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Reçoit le clic sur le lien magique envoyé par e-mail, échange le code
// contre une session, puis redirige vers l'onboarding (ou la découverte
// si la personne a déjà choisi sa ville d'origine).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    if (data?.user) {
      const { data: profil } = await supabase
        .from('profiles')
        .select('ville_origine_code')
        .eq('id', data.user.id)
        .single()

      const destination = profil?.ville_origine_code ? '/decouvrir' : '/onboarding'
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
