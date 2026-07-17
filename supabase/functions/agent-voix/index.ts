// 🎙️ Agent Voix IA (`agent-voix`)
// Voix off françaises naturelles via ElevenLabs. Sortie MP3 dans Storage.
// Utilisable seul (2 crédits) ou appelé par l'Agent Vidéo.

import { json, erreur, preflight } from '../_shared/http.ts'
import {
  clientAdmin,
  utilisateurDepuisRequete,
  debiterCredits,
  crediterCredits,
} from '../_shared/clients.ts'
import { genererVoix } from '../_shared/elevenlabs.ts'
import { sauvegarderOctets } from '../_shared/storage.ts'
import { COUT_CREDITS, COUT_API_FCFA } from '../_shared/credits.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  const admin = clientAdmin()
  let userId: string | null = null
  let debite = false
  try {
    const utilisateur = await utilisateurDepuisRequete(req)
    if (!utilisateur) return erreur('Connecte-toi pour continuer.', 401)
    userId = utilisateur.id

    const { produit_id, texte, genre = 'femme', ton = 'chaleureux' } = await req.json()
    if (!texte || texte.length < 5) return erreur('Écris ou choisis un texte à lire.', 400)
    if (texte.length > 600) return erreur('Le texte est trop long (600 caractères max).', 400)

    // Débit AVANT génération — remboursé automatiquement en cas d'échec
    await debiterCredits(admin, utilisateur.id, COUT_CREDITS.voix)
    debite = true

    const audio = await genererVoix({ texte, genre, ton })
    const chemin = `${utilisateur.id}/voix/${crypto.randomUUID()}.mp3`
    const urlPublique = await sauvegarderOctets(admin, audio, chemin, 'audio/mpeg')

    const { data: generation } = await admin
      .from('generations')
      .insert({
        user_id: utilisateur.id,
        produit_id: produit_id ?? null,
        agent: 'voix',
        type: 'voix',
        prompt_utilise: `${genre} / ${ton} : ${texte.slice(0, 200)}`,
        resultat_url: urlPublique,
        credits_consommes: COUT_CREDITS.voix,
        cout_api_estime_fcfa: COUT_API_FCFA.elevenlabs_voix,
      })
      .select()
      .single()

    return json({ url: urlPublique, generation_id: generation?.id })
  } catch (e) {
    if (debite && userId) await crediterCredits(admin, userId, COUT_CREDITS.voix)
    if (e instanceof Error && e.message === 'SOLDE_INSUFFISANT') {
      return erreur("Ton solde de crédits est insuffisant. Recharge pour continuer.", 402)
    }
    console.error('agent-voix:', e)
    return erreur('La création de la voix a échoué. Tes crédits ont été rendus.', 500)
  }
})
