// ✍️ Agent Copywriter (`agent-copywriter`)
// Textes de vente en français adaptés au marché ivoirien / ouest-africain.
// Retourne 3 variantes. Modèle : Haiku (rapide et économique). 1 crédit.

import { json, erreur, preflight } from '../_shared/http.ts'
import {
  clientAdmin,
  utilisateurDepuisRequete,
  debiterCredits,
  crediterCredits,
} from '../_shared/clients.ts'
import { appelerClaudeJSON, modeleSimple } from '../_shared/anthropic.ts'
import { COUT_CREDITS, COUT_API_FCFA } from '../_shared/credits.ts'

const TYPES_TEXTE: Record<string, string> = {
  description_vente: 'une description de vente complète du produit',
  legende: 'une légende courte pour un post Instagram/Facebook',
  statut_whatsapp: 'un texte court et percutant pour un statut WhatsApp',
  accroches_pub: "des accroches publicitaires percutantes (1 phrase chacune)",
  reponses_objections:
    'des réponses aux objections classiques des clients (trop cher, pas confiance, je vais réfléchir)',
}

const SYSTEME = `Tu es l'Agent Copywriter de CreatorX AI : expert en textes de vente pour le marché
ivoirien et ouest-africain francophone.

Règles d'écriture :
- Ton chaleureux et direct, comme on parle à Abidjan (sans excès de nouchi)
- Émojis avec modération (2-4 par texte maximum)
- Prix toujours en FCFA
- Toujours un appel à l'action WhatsApp ("Écris-moi sur WhatsApp", "Commande vite en message")
- Phrases courtes, faciles à lire sur téléphone
- Créer l'urgence sans mentir (stock limité seulement si plausible)

Réponds UNIQUEMENT en JSON : {"variantes": ["texte 1", "texte 2", "texte 3"]}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  const admin = clientAdmin()
  let userId: string | null = null
  let debite = false
  try {
    const utilisateur = await utilisateurDepuisRequete(req)
    if (!utilisateur) return erreur('Connecte-toi pour continuer.', 401)
    userId = utilisateur.id

    const { produit_id, type_texte } = await req.json()
    if (!TYPES_TEXTE[type_texte]) return erreur('Type de texte inconnu.', 400)

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

    // Débit AVANT la génération (atomique, échoue si solde insuffisant)
    await debiterCredits(admin, utilisateur.id, COUT_CREDITS.texte)
    debite = true

    const contexte = produit.analyse_marketing
      ? `\nAnalyse marketing du produit : ${JSON.stringify(produit.analyse_marketing)}`
      : ''

    const resultat = await appelerClaudeJSON<{ variantes: string[] }>({
      modele: modeleSimple(),
      systeme: SYSTEME,
      message: `Écris 3 variantes de ${TYPES_TEXTE[type_texte]}.\nProduit : ${produit.nom}\nDescription : ${produit.description}\nPrix : ${produit.prix_fcfa} FCFA${contexte}`,
      maxTokens: 1500,
    })

    const { data: generation } = await admin
      .from('generations')
      .insert({
        user_id: utilisateur.id,
        produit_id,
        agent: 'copywriter',
        type: 'texte',
        prompt_utilise: type_texte,
        resultat_texte: JSON.stringify(resultat.variantes),
        credits_consommes: COUT_CREDITS.texte,
        cout_api_estime_fcfa: COUT_API_FCFA.claude_haiku,
      })
      .select()
      .single()

    return json({ variantes: resultat.variantes, generation_id: generation?.id })
  } catch (e) {
    // Remboursement si la génération a échoué après le débit
    if (debite && userId) await crediterCredits(admin, userId, COUT_CREDITS.texte)
    if (e instanceof Error && e.message === 'SOLDE_INSUFFISANT') {
      return erreur("Ton solde de crédits est insuffisant. Recharge pour continuer.", 402)
    }
    console.error('agent-copywriter:', e)
    return erreur('La génération du texte a échoué. Tes crédits ont été rendus.', 500)
  }
})
