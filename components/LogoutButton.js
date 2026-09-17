'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient, desactiverModeDemo } from '@/lib/demo/client'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function seDeconnecter() {
    if (isDemoModeClient()) {
      desactiverModeDemo()
    } else {
      await supabase.auth.signOut()
    }
    router.refresh()
    router.push('/')
  }

  return (
    <button
      onClick={seDeconnecter}
      className="text-sm text-text-soft hover:text-text transition"
    >
      Se déconnecter
    </button>
  )
}
