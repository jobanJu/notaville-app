'use client'

import { createClient } from '@/lib/supabase/client'
import { isDemoModeClient } from '@/lib/demo/client'

// Crédite des Notacoins pour un gain de jeu -- voir
// supabase/23_notacoins_jeux.sql pour les 3 raisons valides
// (jeu_bonne_reponse, jeu_capture_lieu, jeu_ville_mystere_gagnee) et
// leurs montants/plafonds. Sans effet en mode démo ou si personne n'est
// connecté (jouer sans compte reste permis, comme le veut /jeux --
// simplement sans gain persistant). Erreurs volontairement avalées :
// un jeu ne doit jamais planter à cause d'un souci réseau sur le
// crédit de Notacoins, ce n'est jamais bloquant pour la partie en cours.
export async function crediterNotacoinsJeu(raison) {
  if (isDemoModeClient()) return
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase.rpc('crediter_notacoins_jeu', { p_raison: raison })
  } catch {
    // Pas grave : le jeu reste jouable même si le crédit échoue.
  }
}
