'use client'

import { useState } from 'react'
import { Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Grille de photos postées par les habitants/visiteurs pour une ville
// (contributions.type_contribution = 'photo', voir photos_ville() côté
// SQL, migration 27), + un bouton pour en poster une librement, sans
// passer par un défi -- contrairement aux photos de défis
// (components/DefiActions.js), déjà existantes mais réservées à un défi
// en cours.
export default function PhotosVille({ photos, codeInsee, nomVille, connecte, demo = false }) {
  const [fichier, setFichier] = useState(null)
  const [apercu, setApercu] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const supabase = createClient()

  function choisirFichier(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFichier(f)
    if (apercu) URL.revokeObjectURL(apercu)
    setApercu(URL.createObjectURL(f))
  }

  async function envoyer() {
    if (!fichier) return
    setEnvoi(true)
    setMessage('')

    if (demo) {
      setMessage('Photo envoyée ! (démo — rien n\'est réellement sauvegardé)')
      setFichier(null)
      setApercu(null)
      setEnvoi(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Connecte-toi pour poster une photo.')
      setEnvoi(false)
      return
    }

    const chemin = `${user.id}/${Date.now()}-${fichier.name}`
    const { error: erreurUpload } = await supabase.storage.from('defis-photos').upload(chemin, fichier)
    if (erreurUpload) {
      setMessage("La photo n'a pas pu être envoyée. Réessaie.")
      setEnvoi(false)
      return
    }
    const { data: urlPublique } = supabase.storage.from('defis-photos').getPublicUrl(chemin)

    const { error } = await supabase.from('contributions').insert({
      user_id: user.id,
      defi_id: null,
      participation_id: null,
      type_contribution: 'photo',
      photo_url: urlPublique.publicUrl,
      ville_code_insee: codeInsee,
      cle_recompense: 'photo_ville_libre',
      contenu: {},
    })

    if (error) {
      setMessage("La photo n'a pas pu être enregistrée.")
      setEnvoi(false)
      return
    }

    setMessage('Photo envoyée ! Elle apparaîtra ici une fois validée. + Notacoins')
    setFichier(null)
    if (apercu) URL.revokeObjectURL(apercu)
    setApercu(null)
    setEnvoi(false)
  }

  return (
    <div>
      {(!photos || photos.length === 0) ? (
        <p className="mt-3 text-sm text-text-soft">
          Pas encore de photo pour {nomVille}. Sois le premier à en poster une !
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <figure key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-bg-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo_url} alt={`Photo de ${nomVille} par ${p.pseudo}`} className="h-full w-full object-cover" loading="lazy" />
              <figcaption className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-[10px] text-white">
                {p.pseudo}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {connecte && (
        <div className="mt-4">
          {!ouvert ? (
            <button
              type="button"
              onClick={() => setOuvert(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-card-edge px-4 py-2.5 text-sm hover:border-amber"
            >
              <Camera className="h-4 w-4" />
              Poster une photo de {nomVille}
            </button>
          ) : (
            <div className="rounded-2xl border border-card-edge bg-card p-4">
              {apercu && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={apercu} alt="Aperçu" className="mb-3 h-40 w-full rounded-xl object-cover" />
              )}
              <input type="file" accept="image/*" onChange={choisirFichier} className="text-sm" />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={!fichier || envoi}
                  onClick={envoyer}
                  className="btn-primary flex-1 justify-center disabled:opacity-50"
                >
                  {envoi ? 'Envoi...' : 'Envoyer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOuvert(false)
                    setFichier(null)
                    if (apercu) URL.revokeObjectURL(apercu)
                    setApercu(null)
                  }}
                  className="rounded-full border border-card-edge px-4 text-sm hover:border-amber"
                >
                  Annuler
                </button>
              </div>
              {message && <p className="mt-2 text-sm text-text-soft">{message}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
