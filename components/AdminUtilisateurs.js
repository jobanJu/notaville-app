'use client'

import { useState } from 'react'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AdminUtilisateurs() {
  const supabase = createClient()
  const [recherche, setRecherche] = useState('')
  const [resultats, setResultats] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [maj, setMaj] = useState(null) // id du profil en cours de mise à jour
  const [erreur, setErreur] = useState(null)

  async function chercher(e) {
    e.preventDefault()
    setErreur(null)
    if (!recherche.trim()) return
    setEnCours(true)
    const { data, error } = await supabase.rpc('admin_chercher_profils', { p_recherche: recherche.trim() })
    setEnCours(false)
    if (error) {
      setErreur("La recherche a échoué.")
      return
    }
    setResultats(data ?? [])
  }

  async function basculerRole(profil, cle) {
    setErreur(null)
    setMaj(profil.id)
    const estAdmin = cle === 'est_admin' ? !profil.est_admin : profil.est_admin
    const estModerateur = cle === 'est_moderateur' ? !profil.est_moderateur : profil.est_moderateur

    const { error } = await supabase.rpc('admin_definir_role', {
      p_user_id: profil.id,
      p_est_admin: estAdmin,
      p_est_moderateur: estModerateur,
    })
    setMaj(null)
    if (error) {
      setErreur("La mise à jour du rôle a échoué.")
      return
    }
    setResultats((liste) =>
      liste.map((p) => (p.id === profil.id ? { ...p, est_admin: estAdmin, est_moderateur: estModerateur } : p))
    )
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      <form onSubmit={chercher} className="flex gap-2">
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Chercher un pseudo..."
          className="flex-1 rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
        />
        <button type="submit" disabled={enCours} className="btn-primary text-sm">
          {enCours ? 'Recherche...' : 'Chercher'}
        </button>
      </form>

      {erreur && <p className="text-sm text-coral-ink">{erreur}</p>}

      {resultats && resultats.length === 0 && (
        <p className="text-sm text-text-soft">Aucun compte ne correspond à cette recherche.</p>
      )}

      {resultats && resultats.length > 0 && (
        <ul className="flex flex-col gap-2">
          {resultats.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-card-edge bg-card p-4"
            >
              <p className="font-semibold">{p.pseudo}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={maj === p.id}
                  onClick={() => basculerRole(p, 'est_moderateur')}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                    p.est_moderateur
                      ? 'border-mint bg-mint/10 text-mint-ink'
                      : 'border-card-edge text-text-soft hover:border-amber'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Modérateur
                </button>
                <button
                  type="button"
                  disabled={maj === p.id}
                  onClick={() => basculerRole(p, 'est_admin')}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                    p.est_admin
                      ? 'border-amber bg-amber/10 text-amber-ink'
                      : 'border-card-edge text-text-soft hover:border-amber'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Administrateur
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
