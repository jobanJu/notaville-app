import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo/session'
import { demoProfil, demoConversations } from '@/lib/demo/data'
import Messagerie from '@/components/Messagerie'

// Messagerie privée (DM entre utilisateurs) + canal de contact
// modération, distinct du mur public par ville (voir
// supabase/33_messagerie.sql). Page protégée (lib/supabase/middleware.js).
export default async function MessagesPage() {
  const demo = await isDemoMode()

  let conversations = []
  let userId = null

  if (demo) {
    conversations = demoConversations
    userId = 'demo'
  } else {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
    const { data } = await supabase.rpc('mes_conversations')
    conversations = data ?? []
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold">Messages</h1>
      <p className="mt-1 text-sm text-text-soft">
        Tes conversations privées, et un canal direct pour contacter la modération.
      </p>

      <div className="mt-6">
        <Messagerie conversationsInitiales={conversations} userId={userId} demo={demo} />
      </div>
    </div>
  )
}
