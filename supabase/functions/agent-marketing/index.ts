// 🎯 Agent Marketing (`agent-marketing`)
// Appelé après la modération d'un produit. Analyse via Claude : positionnement,
// arguments de vente pour le marché ouest-africain, fourchette de prix, angles
// publicitaires, profil de l'acheteur type. Stocké dans produits.analyse_marketing
// et réutilisé comme contexte par tous les autres agents. Gratuit pour le client.

import { json, erreur, preflight } from '../_shared/http.ts'
import { clientAdmin, utilisateurDepuisRequete } from '../_shared/clients.ts'
import { appelerClaudeJSON, modeleComplexe } from '../_shared/anthropic.ts'
import { COUT_API_FCFA } from '../_shared/credits.ts'

interface AnalyseMarketing {
  positionnement: string
  arguments_vente: string[]
  fourchette_prix_marche: string
  angles_publicitaires: string[]
  profil_acheteur: string
}

const SYSTEME = `Tu es l'Agent Marketing de CreatorX AI. Tu analyses des produits vendus par des PME
et vendeuses en ligne en Côte d'Ivoire et en Afrique de l'Ouest francophone.

Ton analyse doit être concrète et adaptée au marché local (pouvoir d'achat, habitudes
d'achat via WhatsApp et réseaux sociaux, villes comme Abidjan, Bouaké, Yamoussoukro...).

Réponds UNIQUEMENT en JSON :
{
  "positionnement": "1-2 phrases simples sur comment positionner ce produit",
  "arguments_vente": ["3 à 5 arguments clés qui font acheter ICI"],
  "fourchette_prix_marche": "fourchette de prix habituelle du marché en FCFA + avis sur le prix du client",
  "angles_publicitaires": ["3 à 4 angles de pub recommandés"],
  "profil_acheteur": "portrait simple de l'acheteur type (âge, situation, motivation)"
}
Langage TRÈS simple, comme si tu parlais à une vendeuse. Pas de jargon marketing.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  try {
    const utilisateur = await utilisateurDepuisRequete(req)
    if (!utilisateur) return erreur('Connecte-toi pour continuer.', 401)

    const { produit_id } = await req.json()
    const admin = clientAdmin()

    const { data: produit } = await admin
      .from('produits')
      .select('*')
      .eq('id', produit_id)
      .eq('user_id', utilisateur.id)
      .maybeSingle()
    if (!produit) return erreur('Produit introuvable.', 404)
    if (produit.statut_moderation !== 'approuve') {
      return erreur("Ce produit n'a pas encore été approuvé.", 400)
    }
    // Si l'analyse existe déjà, on la retourne sans repayer un appel API
    if (produit.analyse_marketing) {
      return json({ analyse: produit.analyse_marketing })
    }

    const analyse = await appelerClaudeJSON<AnalyseMarketing>({
      modele: modeleComplexe(),
      systeme: SYSTEME,
      message: `Produit :\n- Nom : ${produit.nom}\n- Description : ${produit.description}\n- Prix affiché : ${produit.prix_fcfa} FCFA`,
      images: (produit.photos ?? []).slice(0, 2),
      maxTokens: 1200,
    })

    await admin
      .from('produits')
      .update({ analyse_marketing: analyse })
      .eq('id', produit_id)

    // Journalisation du coût API (analyse gratuite pour le client : 0 crédit)
    await admin.from('generations').insert({
      user_id: utilisateur.id,
      produit_id,
      agent: 'marketing',
      type: 'texte',
      prompt_utilise: 'Analyse marketing automatique du produit',
      resultat_texte: JSON.stringify(analyse),
      credits_consommes: 0,
      cout_api_estime_fcfa: COUT_API_FCFA.claude_sonnet,
    })

    return json({ analyse })
  } catch (e) {
    console.error('agent-marketing:', e)
    return erreur("L'analyse du produit a échoué. Réessaie dans un instant.", 500)
  }
})
