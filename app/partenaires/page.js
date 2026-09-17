'use client'

// Page publique, sans compte requis (comme /villes et /comparer) : un
// commerçant doit pouvoir la trouver et remplir le formulaire sans
// s'inscrire à Notaville. Pas d'espace partenaire pour l'instant --
// juste une vitrine + un formulaire de contact (supabase/14_demandes_partenariat.sql).
// Retirée de la navigation (Navbar.js / NavMobileMenu.js) pour
// désencombrer le menu -- la page elle-même reste active, accessible
// par lien direct (ex. depuis /reductions).
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'
import CitySearch from '@/components/CitySearch'
import Icone from '@/components/Icone'
import { TYPES_COMMERCE } from '@/lib/commerces'

const ATOUTS = [
  {
    icone: 'compass',
    titre: 'Visibilité locale et touristique',
    texte:
      "Chaque ville a ses propres défis (« Ta meilleure adresse gourmande à Lille », « Une sortie culturelle à... ») : les habitants ET les visiteurs qui les relèvent tombent sur ton établissement.",
  },
  {
    icone: 'cadeau',
    titre: 'Des bons plans qui se voient',
    texte:
      "Une offre partenaire (réduction, avantage...) rejoint la catégorie « Offres partenaires » du catalogue de défis, visible par toute la communauté Notaville de ta ville.",
  },
  {
    icone: 'landmark',
    titre: 'Le patrimoine local mis en avant',
    texte:
      "Notaville n'est pas qu'un outil de notation : c'est aussi un guide touristique participatif, où les habitants font découvrir leur ville sous une forme ludique.",
  },
]

export default function PartenairesPage() {
  const supabase = createClient()
  const [nomContact, setNomContact] = useState('')
  const [nomCommerce, setNomCommerce] = useState('')
  const [typeCommerce, setTypeCommerce] = useState('restaurant')
  const [ville, setVille] = useState(null)
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [message, setMessage] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState('')

  async function soumettre(e) {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')

    if (isDemoModeClient()) {
      // Mode démo : rien n'est envoyé nulle part, comme le reste du
      // mode démo (pas de projet Supabase branché).
      await new Promise((r) => setTimeout(r, 400))
      setEnvoi(false)
      setEnvoye(true)
      return
    }

    const { error } = await supabase.from('demandes_partenariat').insert({
      nom_contact: nomContact,
      nom_commerce: nomCommerce,
      type_commerce: typeCommerce,
      ville_code_insee: ville?.code_insee ?? null,
      ville_nom: ville?.nom ?? null,
      email,
      telephone: telephone || null,
      message,
    })

    setEnvoi(false)
    if (error) {
      setErreur("La demande n'a pas pu être envoyée. Réessaie dans un instant.")
      return
    }
    setEnvoye(true)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <span className="inline-block rounded-full border border-card-edge px-3 py-1 text-xs font-semibold uppercase tracking-wide text-mint-ink">
        Commerçants &amp; acteurs locaux
      </span>
      <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
        Deviens <span className="gradient-text">partenaire Notaville</span>
      </h1>
      <p className="mt-4 max-w-xl text-text-soft">
        Notaville n&apos;est pas qu&apos;un outil pour noter sa ville : c&apos;est un guide touristique
        participatif, qui met en avant le patrimoine et les bonnes adresses sous une forme ludique. Être
        partenaire, c&apos;est apparaître là où les habitants et les visiteurs cherchent déjà.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {ATOUTS.map((a) => (
          <div key={a.titre} className="rounded-2xl border border-card-edge bg-card p-4">
            <Icone nom={a.icone} className="h-6 w-6 text-amber-ink" strokeWidth={1.5} />
            <p className="mt-2 font-display text-sm font-bold">{a.titre}</p>
            <p className="mt-1 text-xs text-text-soft">{a.texte}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-4 text-sm">
        <p>
          <strong>Bientôt :</strong> au-delà des commerces locaux, on prépare des partenariats avec des
          plateformes de séjour (type Booking) pour proposer directement des idées de week-ends sur les
          villes les mieux notées par la communauté. Si ça t&apos;intéresse, dis-le dans le message ci-dessous.
        </p>
      </div>

      {envoye ? (
        <div className="mt-10 rounded-2xl border border-mint/40 bg-mint/10 p-6 text-center">
          <p className="font-display text-lg font-bold text-mint-ink">Demande envoyée, merci !</p>
          <p className="mt-2 text-sm text-text-soft">
            On revient vers toi par email pour la suite.
            {isDemoModeClient() && ' (démo — rien n\'a été réellement enregistré)'}
          </p>
        </div>
      ) : (
        <form onSubmit={soumettre} className="mt-10 flex flex-col gap-3 rounded-2xl border border-card-edge bg-card p-5">
          <h2 className="font-display text-lg font-bold">Parle-nous de ton établissement</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={nomContact}
              onChange={(e) => setNomContact(e.target.value)}
              placeholder="Ton nom"
              required
              className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
            />
            <input
              value={nomCommerce}
              onChange={(e) => setNomCommerce(e.target.value)}
              placeholder="Nom du commerce"
              required
              className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={typeCommerce}
              onChange={(e) => setTypeCommerce(e.target.value)}
              className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
            >
              {TYPES_COMMERCE.map((t) => (
                <option key={t.valeur} value={t.valeur}>{t.label}</option>
              ))}
            </select>
            <CitySearch onSelect={setVille} placeholder="Ville du commerce" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
            />
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Téléphone (facultatif)"
              className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
            />
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="En quelques mots : ton établissement, ce que tu proposerais (réduction, avantage...)"
            rows={3}
            className="w-full rounded-2xl border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
          />

          {erreur && <p className="text-sm text-coral-ink">{erreur}</p>}

          <button type="submit" disabled={envoi || !ville} className="btn-primary mt-1 w-full justify-center disabled:opacity-50">
            {envoi ? 'Envoi...' : 'Envoyer ma demande'}
          </button>
          {!ville && <p className="text-center text-xs text-text-soft">Choisis une ville dans la liste pour continuer.</p>}
        </form>
      )}
    </div>
  )
}
