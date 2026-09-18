'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BORNES_DONNEE, erreurBorneDonnee } from '@/lib/donnees'
import { NIVEAUX_PRIX, TYPES_LIEU } from '@/lib/lieux'
import Icone from '@/components/Icone'

const LABEL_STATUT = {
  en_attente: { texte: 'En attente de vérification', classe: 'text-amber-ink' },
  validee: { texte: 'Validée', classe: 'text-mint-ink' },
  rejetee: { texte: 'Rejetée', classe: 'text-coral-ink' },
}

export default function DefiActions({
  defiId,
  typeParticipation,
  cleRecompense,
  donneeCle,
  etapes,
  palierCible,
  participationInitiale,
  contributionsInitiales,
  quiz,
  quartiers = [],
  demo = false,
  demoQuiz = null,
}) {
  const supabase = createClient()
  const [participation, setParticipation] = useState(participationInitiale)
  const [contributions, setContributions] = useState(contributionsInitiales)
  const [texte, setTexte] = useState('')
  const [valeurDonnee, setValeurDonnee] = useState('')
  const [donneeErreur, setDonneeErreur] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [reponseChoisie, setReponseChoisie] = useState(null)
  const [lieuNom, setLieuNom] = useState('')
  const [lieuType, setLieuType] = useState('restaurant')
  const [lieuQuartierId, setLieuQuartierId] = useState(quartiers[0]?.id ?? '')
  const [lieuDescription, setLieuDescription] = useState('')
  const [lieuNiveauPrix, setLieuNiveauPrix] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState('')

  const totalEtapes = typeParticipation === 'multi_etapes' ? (etapes.length || palierCible || 1) : 1
  const termine = participation?.statut === 'terminee'

  async function demarrer() {
    if (demo) {
      setParticipation({ id: 'demo-participation', etape_courante: 0, statut: 'en_cours' })
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('participations')
      .insert({ user_id: user.id, defi_id: defiId })
      .select()
      .single()

    if (!error) setParticipation(data)
  }

  function choisirPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function soumettre(e) {
    e.preventDefault()

    if (typeParticipation === 'contribution_donnee') {
      const erreur = erreurBorneDonnee(donneeCle, valeurDonnee)
      if (erreur) {
        setDonneeErreur(erreur)
        return
      }
      setDonneeErreur(null)
    }

    setEnvoi(true)
    setMessage('')

    if (demo) {
      // Rien n'est envoyé nulle part : tout reste dans l'état du
      // composant, et disparaît en rechargeant la page.
      let statutSimule = 'en_attente'
      if (typeParticipation === 'quiz') {
        statutSimule = demoQuiz && reponseChoisie === demoQuiz.bonneReponse ? 'validee' : 'rejetee'
      }
      const contributionSimulee = {
        id: `demo-contrib-${contributions.length + 1}`,
        statut: statutSimule,
        motif_rejet: statutSimule === 'rejetee' && typeParticipation === 'quiz' ? 'Mauvaise réponse.' : null,
      }
      setContributions((c) => [contributionSimulee, ...c])
      setTexte('')
      setValeurDonnee('')
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      setPhotoFile(null)
      setPhotoPreview(null)
      setLieuNom('')
      setLieuDescription('')

      if (participation) {
        const prochaineEtape = participation.etape_courante + 1
        const estTerminee = prochaineEtape >= totalEtapes
        setParticipation({ ...participation, etape_courante: prochaineEtape, statut: estTerminee ? 'terminee' : 'en_cours' })
      }

      if (typeParticipation === 'quiz') {
        setMessage(statutSimule === 'validee' ? 'Bonne réponse ! Notacoins crédités. (démo)' : 'Mauvaise réponse, pas de Notacoins cette fois. (démo)')
        setReponseChoisie(null)
      } else {
        setMessage('Contribution envoyée. (démo — rien n\'est réellement sauvegardé)')
      }
      setEnvoi(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: profil } = await supabase
      .from('profiles')
      .select('ville_origine_code')
      .eq('id', user.id)
      .single()

    let photoUrl = null
    if (typeParticipation === 'photo') {
      if (!photoFile) {
        setMessage('Ajoute une photo avant d\'envoyer.')
        setEnvoi(false)
        return
      }
      const chemin = `${user.id}/${Date.now()}-${photoFile.name}`
      const { error: erreurUpload } = await supabase.storage.from('defis-photos').upload(chemin, photoFile)
      if (erreurUpload) {
        setMessage("La photo n'a pas pu être envoyée. Réessaie.")
        setEnvoi(false)
        return
      }
      const { data: urlPublique } = supabase.storage.from('defis-photos').getPublicUrl(chemin)
      photoUrl = urlPublique.publicUrl
    }

    const payload = {
      user_id: user.id,
      defi_id: defiId,
      participation_id: participation?.id ?? null,
      type_contribution:
        typeParticipation === 'photo'
          ? 'photo'
          : typeParticipation === 'contribution_donnee'
            ? 'donnee_statistique'
            : typeParticipation === 'quiz'
              ? 'quiz'
              : typeParticipation === 'lieu'
                ? 'lieu'
                : 'texte',
      cle_recompense: cleRecompense,
      contenu:
        typeParticipation === 'quiz'
          ? { reponse_choisie: reponseChoisie }
          : typeParticipation === 'lieu'
            ? { nom: lieuNom, type: lieuType, quartier_id: lieuQuartierId, description: lieuDescription, niveau_prix: lieuNiveauPrix || null }
            : { texte },
    }
    if (typeParticipation === 'photo') payload.photo_url = photoUrl
    if (typeParticipation === 'contribution_donnee') {
      payload.donnee_cle = donneeCle
      payload.donnee_valeur = Number(valeurDonnee)
      payload.ville_code_insee = profil?.ville_origine_code ?? null
    }

    const { data: contribution, error } = await supabase.from('contributions').insert(payload).select().single()

    if (error) {
      setMessage("La contribution n'a pas pu être envoyée.")
      setEnvoi(false)
      return
    }

    setContributions((c) => [contribution, ...c])
    setTexte('')
    setValeurDonnee('')
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    setLieuNom('')
    setLieuDescription('')

    if (participation) {
      const prochaineEtape = participation.etape_courante + 1
      const estTerminee = prochaineEtape >= totalEtapes
      const { data: participationMaj } = await supabase
        .from('participations')
        .update({
          etape_courante: prochaineEtape,
          statut: estTerminee ? 'terminee' : 'en_cours',
          terminee_le: estTerminee ? new Date().toISOString() : null,
        })
        .eq('id', participation.id)
        .select()
        .single()

      setParticipation(participationMaj)
      if (estTerminee) {
        await supabase.rpc('recalculer_badges', { p_user_id: user.id })
      }
    }

    if (typeParticipation === 'quiz') {
      setMessage(contribution.statut === 'validee' ? 'Bonne réponse ! Notacoins crédités.' : 'Mauvaise réponse, pas de Notacoins cette fois.')
      setReponseChoisie(null)
    } else {
      setMessage('Contribution envoyée. Elle sera vérifiée avant de créditer tes Notacoins.')
    }
    setEnvoi(false)
  }

  return (
    <div className="mt-6">
      {!participation && (
        <button onClick={demarrer} className="btn-primary w-full justify-center">
          Commencer ce défi
        </button>
      )}

      {participation && !termine && (
        <form onSubmit={soumettre} className="rounded-2xl border border-card-edge bg-card p-4">
          {typeParticipation === 'multi_etapes' && etapes[participation.etape_courante] && (
            <p className="mb-3 text-sm font-semibold">
              Étape {participation.etape_courante + 1}/{totalEtapes} —{' '}
              {etapes[participation.etape_courante].titre}
            </p>
          )}

          {typeParticipation === 'quiz' && quiz ? (
            <div>
              <p className="mb-2 text-sm font-semibold">{quiz.question}</p>
              <div className="flex flex-col gap-2">
                {quiz.choix.map((choix, i) => (
                  <label
                    key={i}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      reponseChoisie === i ? 'border-amber' : 'border-card-edge'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reponse-quiz"
                      checked={reponseChoisie === i}
                      onChange={() => setReponseChoisie(i)}
                      className="accent-amber"
                    />
                    {choix}
                  </label>
                ))}
              </div>
            </div>
          ) : typeParticipation === 'photo' ? (
            <div className="flex flex-col gap-2">
              {photoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Aperçu de ta photo" className="h-44 w-full rounded-xl object-cover" />
              )}
              <label className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-dashed border-card-edge bg-bg-soft px-4 py-2.5 text-sm text-text-soft hover:border-amber">
                {!photoFile && <Icone nom="camera" className="h-4 w-4" />}
                {photoFile ? photoFile.name : 'Choisir une photo'}
                <input type="file" accept="image/*" onChange={choisirPhoto} required className="hidden" />
              </label>
              {demo && photoPreview && (
                <p className="text-[11px] text-text-soft">
                  Aperçu uniquement — en démo, rien n&apos;est envoyé sur un serveur.
                </p>
              )}
            </div>
          ) : typeParticipation === 'contribution_donnee' ? (
            <div>
              <input
                type="number"
                step="0.01"
                min={BORNES_DONNEE[donneeCle]?.min}
                max={BORNES_DONNEE[donneeCle]?.max}
                value={valeurDonnee}
                onChange={(e) => {
                  setValeurDonnee(e.target.value)
                  if (donneeErreur) setDonneeErreur(null)
                }}
                placeholder={BORNES_DONNEE[donneeCle] ? `Valeur en ${BORNES_DONNEE[donneeCle].unite}` : 'Valeur'}
                required
                className={`w-full rounded-full border bg-bg-soft px-4 py-2.5 text-sm outline-none ${
                  donneeErreur ? 'border-coral' : 'border-card-edge focus:border-amber'
                }`}
              />
              {BORNES_DONNEE[donneeCle] && (
                <p className="mt-1.5 px-2 text-[11px] text-text-soft">
                  Entre {BORNES_DONNEE[donneeCle].min} et {BORNES_DONNEE[donneeCle].max} {BORNES_DONNEE[donneeCle].unite}
                </p>
              )}
              {donneeErreur && <p className="mt-1 px-2 text-xs text-coral-ink">{donneeErreur}</p>}
            </div>
          ) : typeParticipation === 'lieu' ? (
            <div className="flex flex-col gap-2">
              <input
                value={lieuNom}
                onChange={(e) => setLieuNom(e.target.value)}
                placeholder="Nom du lieu"
                required
                className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
              />
              <select
                value={lieuType}
                onChange={(e) => setLieuType(e.target.value)}
                className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
              >
                {TYPES_LIEU.map((t) => (
                  <option key={t.valeur} value={t.valeur}>{t.label}</option>
                ))}
              </select>
              <select
                value={lieuQuartierId}
                onChange={(e) => setLieuQuartierId(e.target.value)}
                required
                className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
              >
                {quartiers.length === 0 && <option value="">Aucun quartier disponible</option>}
                {quartiers.map((q) => (
                  <option key={q.id} value={q.id}>{q.nom}</option>
                ))}
              </select>
              <textarea
                value={lieuDescription}
                onChange={(e) => setLieuDescription(e.target.value)}
                placeholder="Courte description (facultatif)"
                rows={2}
                className="w-full rounded-2xl border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
              />
              <select
                value={lieuNiveauPrix}
                onChange={(e) => setLieuNiveauPrix(e.target.value)}
                className="w-full rounded-full border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
              >
                <option value="">Prix (facultatif)</option>
                {NIVEAUX_PRIX.map((p) => (
                  <option key={p.valeur} value={p.valeur}>{p.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Décris ta contribution en quelques mots"
              required
              rows={3}
              className="w-full rounded-2xl border border-card-edge bg-bg-soft px-4 py-2.5 text-sm outline-none focus:border-amber"
            />
          )}

          <button
            type="submit"
            disabled={
              envoi ||
              (typeParticipation === 'quiz' && reponseChoisie === null) ||
              (typeParticipation === 'lieu' && (!lieuNom || !lieuQuartierId)) ||
              (typeParticipation === 'photo' && !photoFile)
            }
            className="btn-primary mt-3 w-full justify-center disabled:opacity-50"
          >
            {envoi ? 'Envoi...' : typeParticipation === 'quiz' ? 'Valider ma réponse' : 'Envoyer'}
          </button>
        </form>
      )}

      {termine && <p className="rounded-2xl border border-mint/40 bg-mint/10 p-4 text-sm text-mint-ink">Défi terminé, merci !</p>}

      {message && <p className="mt-3 text-sm text-text-soft">{message}</p>}

      {contributions.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">Mes contributions</p>
          <ul className="mt-2 flex flex-col gap-2">
            {contributions.map((c) => (
              <li key={c.id} className="rounded-xl border border-card-edge px-3 py-2 text-xs">
                <span className={LABEL_STATUT[c.statut]?.classe}>{LABEL_STATUT[c.statut]?.texte}</span>
                {c.statut === 'rejetee' && (
                  <p className="mt-1 text-text-soft">
                    Les contributions manifestement fausses, incohérentes ou frauduleuses peuvent
                    entraîner l&apos;annulation des Notacoins associés.
                    {c.motif_rejet ? ` (${c.motif_rejet})` : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
