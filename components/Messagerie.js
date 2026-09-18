'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Icone from '@/components/Icone'

function formatHeure(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Messagerie({ conversationsInitiales, userId, demo = false }) {
  const [conversations, setConversations] = useState(conversationsInitiales)
  const [conversationOuverte, setConversationOuverte] = useState(null)
  const [messages, setMessages] = useState([])
  const [texte, setTexte] = useState('')
  const [chargementMessages, setChargementMessages] = useState(false)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    if (!conversationOuverte) return
    if (demo) {
      setMessages(conversationOuverte.messages ?? [])
      return
    }
    let annule = false
    setChargementMessages(true)
    supabase
      .from('messages_prives')
      .select('id, expediteur_id, contenu, created_at')
      .eq('conversation_id', conversationOuverte.id)
      .order('created_at')
      .then(({ data }) => {
        if (!annule) {
          setMessages(data ?? [])
          setChargementMessages(false)
        }
      })
    // Marque comme lus les messages reçus (pas les nôtres).
    supabase
      .from('messages_prives')
      .update({ lu: true })
      .eq('conversation_id', conversationOuverte.id)
      .neq('expediteur_id', userId)
      .then(() => {})
    return () => {
      annule = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationOuverte?.id])

  async function ouvrirModeration() {
    setErreur(null)
    if (demo) {
      const conv = conversations.find((c) => c.type === 'moderation') ?? {
        id: 'demo-mod',
        type: 'moderation',
        autre_pseudo: 'Modération Notaville',
        messages: [],
      }
      setConversationOuverte(conv)
      return
    }
    try {
      const { data: id, error } = await supabase.rpc('contacter_moderation')
      if (error) throw error
      const { data } = await supabase.rpc('mes_conversations')
      setConversations(data ?? [])
      setConversationOuverte((data ?? []).find((c) => c.id === id) ?? { id, type: 'moderation', autre_pseudo: 'Modération Notaville' })
    } catch (e) {
      setErreur(e.message ?? 'Impossible de contacter la modération pour le moment.')
    }
  }

  async function envoyer(e) {
    e.preventDefault()
    const contenu = texte.trim()
    if (!contenu || !conversationOuverte) return
    setEnvoiEnCours(true)
    setErreur(null)
    try {
      if (demo) {
        setMessages((prev) => [
          ...prev,
          { id: `local-${Date.now()}`, expediteur_id: userId, contenu, created_at: new Date().toISOString() },
        ])
        setTexte('')
        return
      }
      const { error } = await supabase
        .from('messages_prives')
        .insert({ conversation_id: conversationOuverte.id, expediteur_id: userId, contenu })
      if (error) throw error
      setMessages((prev) => [
        ...prev,
        { id: `optimiste-${Date.now()}`, expediteur_id: userId, contenu, created_at: new Date().toISOString() },
      ])
      setTexte('')
    } catch (e) {
      setErreur(e.message ?? "Impossible d'envoyer ce message.")
    } finally {
      setEnvoiEnCours(false)
    }
  }

  if (conversationOuverte) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setConversationOuverte(null)}
          className="flex items-center gap-1.5 text-sm text-text-soft hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux messages
        </button>

        <div className="flex items-center gap-2 rounded-2xl border border-card-edge bg-card p-3">
          {conversationOuverte.type === 'moderation' && <ShieldCheck className="h-4 w-4 text-amber-ink" />}
          <p className="font-semibold">{conversationOuverte.autre_pseudo}</p>
        </div>

        <div className="flex min-h-[280px] flex-col gap-2 rounded-2xl border border-card-edge bg-card p-4">
          {chargementMessages ? (
            <p className="text-center text-sm text-text-soft">Chargement...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-text-soft">
              {conversationOuverte.type === 'moderation'
                ? 'Explique ta demande, un modérateur te répondra ici.'
                : 'Aucun message pour l\'instant -- lance la conversation !'}
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.expediteur_id === userId
                    ? 'ml-auto bg-amber text-bg'
                    : 'mr-auto border border-card-edge bg-bg'
                }`}
              >
                <p>{m.contenu}</p>
                <p className={`mt-1 text-[10px] ${m.expediteur_id === userId ? 'text-bg/70' : 'text-text-soft'}`}>
                  {formatHeure(m.created_at)}
                </p>
              </div>
            ))
          )}
        </div>

        {erreur && <p className="rounded-xl border border-red-300 bg-red-50 p-2 text-xs text-red-700">{erreur}</p>}

        <form onSubmit={envoyer} className="flex items-center gap-2">
          <input
            type="text"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            maxLength={2000}
            placeholder="Écris un message..."
            className="flex-1 rounded-full border border-card-edge bg-bg px-4 py-2.5 text-sm outline-none focus:border-amber"
          />
          <button
            type="submit"
            disabled={envoiEnCours || !texte.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber text-bg disabled:opacity-50"
            aria-label="Envoyer"
          >
            <Icone nom="envoyer" className="h-4 w-4" />
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={ouvrirModeration}
        className="flex items-center justify-center gap-2 rounded-full border border-amber/50 bg-amber/10 px-4 py-2.5 text-sm font-semibold text-amber-ink hover:border-amber"
      >
        <ShieldCheck className="h-4 w-4" />
        Contacter la modération
      </button>

      {erreur && <p className="rounded-xl border border-red-300 bg-red-50 p-2 text-xs text-red-700">{erreur}</p>}

      {conversations.length === 0 ? (
        <p className="mt-2 text-center text-sm text-text-soft">Aucun message pour l&apos;instant.</p>
      ) : (
        conversations
          .filter((c) => c.autre_pseudo)
          .map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setConversationOuverte(c)}
              className="flex items-center justify-between rounded-2xl border border-card-edge bg-card p-4 text-left hover:border-amber"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {c.type === 'moderation' && <ShieldCheck className="h-3.5 w-3.5 text-amber-ink" />}
                  <p className="truncate font-semibold">{c.autre_pseudo}</p>
                </div>
                <p className="mt-0.5 truncate text-xs text-text-soft">{c.dernier_message ?? 'Nouvelle conversation'}</p>
              </div>
              {c.non_lus > 0 && (
                <span className="ml-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber px-1.5 text-[10px] font-bold text-bg">
                  {c.non_lus}
                </span>
              )}
            </button>
          ))
      )}
    </div>
  )
}
