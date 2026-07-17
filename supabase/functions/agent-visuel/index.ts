// 🖼️ Agent Visuel (`agent-visuel`)
// Génère un visuel publicitaire via fal.ai FLUX.
// qualite = "brouillon" (FLUX schnell, économique) ou "final" (FLUX Pro).
// 3 crédits par visuel. Débit avant génération, remboursement si échec.

import { json, erreur, preflight } from '../_shared/http.ts'
import {
  clientAdmin,
  utilisateurDepuisRequete,
  debiterCredits,
  crediterCredits,
} from '../_shared/clients.ts'
import { appelerClaude, modeleSimple } from '../_shared/anthropic.ts'
import { genererImage, modeleImageBrouillon, modeleImageFinal } from '../_shared/fal.ts'
import { sauvegarderDepuisUrl } from '../_shared/storage.ts'
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

    const { produit_id, style = 'moderne', qualite = 'final', format = 'portrait' } =
      await req.json()

    const { data: produit } = await admin
      .from('produits')
      .select('*')
      .eq('id', produit_id)
      .eq('user_id', utilisateur.id)
      .maybeSingle()
    if (!produit) return erreur('Produit introuvable.', 404)
    if (produit.statut_moderation !== 'approuve') {
      return erreur("Ce produit n'est pas encore approuvé.", 400)
    }

    await debiterCredits(admin, utilisateur.id, COUT_CREDITS.visuel)
    debite = true

    // Claude rédige un prompt d'image professionnel à partir du produit
    const promptImage = await appelerClaude({
      modele: modeleSimple(),
      systeme:
        "Tu écris des prompts en anglais pour un générateur d'images publicitaires. Réponds uniquement avec le prompt, sans commentaire.",
      message: `Écris un prompt (max 80 mots) pour un visuel publicitaire premium de ce produit, style ${style}, ambiance marché africain moderne, produit mis en valeur, éclairage professionnel, sans texte incrusté.\nProduit : ${produit.nom}. Description : ${produit.description}.`,
      maxTokens: 300,
    })

    const modele = qualite === 'brouillon' ? modeleImageBrouillon() : modeleImageFinal()
    const urlTemporaire = await genererImage({
      modele,
      prompt: promptImage,
      format: format === 'carre' ? 'square' : 'portrait_16_9',
    })

    // Rapatriement dans notre Storage (les URLs fal.ai expirent)
    const chemin = `${utilisateur.id}/visuels/${crypto.randomUUID()}.jpg`
    const urlPublique = await sauvegarderDepuisUrl(admin, urlTemporaire, chemin, 'image/jpeg')

    const coutApi =
      (qualite === 'brouillon' ? COUT_API_FCFA.flux_schnell : COUT_API_FCFA.flux_pro) +
      COUT_API_FCFA.claude_haiku

    const { data: generation } = await admin
      .from('generations')
      .insert({
        user_id: utilisateur.id,
        produit_id,
        agent: 'visuel',
        type: 'visuel',
        prompt_utilise: promptImage,
        resultat_url: urlPublique,
        credits_consommes: COUT_CREDITS.visuel,
        cout_api_estime_fcfa: coutApi,
      })
      .select()
      .single()

    return json({ url: urlPublique, generation_id: generation?.id })
  } catch (e) {
    if (debite && userId) await crediterCredits(admin, userId, COUT_CREDITS.visuel)
    if (e instanceof Error && e.message === 'SOLDE_INSUFFISANT') {
      return erreur("Ton solde de crédits est insuffisant. Recharge pour continuer.", 402)
    }
    console.error('agent-visuel:', e)
    return erreur('La création du visuel a échoué. Tes crédits ont été rendus.', 500)
  }
})
