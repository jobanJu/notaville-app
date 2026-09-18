'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BoutonSignaler from '@/components/BoutonSignaler'

// Mur de discussion public d'une ville ("groupe de Lillois" etc.) --
// ouvert à tous en lecture, tout compte connecté peut poster (voir
// messages_ville() côté SQL, migration 29). Pas d'étape "rejoindre" :
// décision produit, pour rester simple et cohérent avec avis/photos.
export default function MurVille({ messages, codeInsee, nomVille, connecte, demo = false }) {
  const [liste, setListe] = useState(messages ?? [])
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const supabase = createClient()

  async function envoyer(e) {
    e.preventDefault()
    const contenu = texte.trim()
    if (!contenu) return
    setEnvoi(true)
    setErreur(null)

    if (demo) {
      setListe((l) => [{ id: `demo-${Date.now()}`, pseudo: 'Toi', contenu, created_at: new Date().toISOString() }, ...l])
      setTexte('')
      setEnvoi(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: profil } = await supabase.from('profiles').select('pseudo').eq('id', user.id).single()

    const { data, error } = await supabase
      .from('messages_ville')
      .insert({ ville_code_insee: codeInsee, user_id: user.id, contenu })
      .select('id, contenu, created_at')
      .single()

    if (error) {
      setErreur("Le message n'a pas pu être envoyé.")
      setEnvoi(false)
      return
    }

    setListe((l) => [{ ...data, pseudo: profil?.pseudo ?? 'Toi' }, ...l])
    setTexte('')
    setEnvoi(false)
  }

  return (
    <div>
      {connecte && (
        <form onSubmit={envoyer} className="mt-3 flex flex-col gap-2">
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={`Un message pour les habitants et visiteurs de ${nomVille}...`}
            className="w-full rounded-2xl border border-card-edge bg-bg-soft px-4 py-3 text-sm outline-none focus:border-amber"
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-text-soft">{texte.length}/500</p>
            <button type="submit" disabled={!texte.trim() || envoi} className="btn-primary text-sm disabled:opacity-50">
              {envoi ? 'Envoi...' : 'Publier'}
            </button>
          </div>
          {erreur && <p className="text-sm text-coral-ink">{erreur}</p>}
        </form>
      )}

      {liste.length === 0 ? (
        <p className="mt-3 text-sm text-text-soft">
          Personne n&apos;a encore écrit sur le mur de {nomVille}. Lance la discussion !
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {liste.map((m) => (
            <div key={m.id} className="rounded-2xl border border-card-edge bg-card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{m.pseudo}</p>
                <p className="text-[11px] text-text-soft">{new Date(m.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <p className="mt-1 text-sm">{m.contenu}</p>
              <div className="mt-1.5">
                <BoutonSignaler cibleType="message_ville" cibleId={m.id} demo={demo} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
