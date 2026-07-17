// 🔄 Agent Optimisation (`agent-optimisation`)
// À partir de l'historique et des analyses d'une campagne, propose des ajustements
// concrets : changer l'accroche, élargir/réduire le ciblage, redistribuer le budget,
// tester un autre visuel. Affiché au client ET à l'admin (application manuelle
// dans Ads Manager en phase 1). Stocké dans campagnes.recommandations_optimisation.

import { json, erreur, preflight } from '../_shared/http.ts'
import { clientAdmin, utilisateurDepuisRequete } from '../_shared/clients.ts'
import { appelerClaudeJSON, modeleComplexe } from '../_shared/anthropic.ts'
import { COUT_API_FCFA } from '../_shared/credits.ts'

interface Recommandations {
  diagnostic: string
  recommandations: {
    action: string
    pourquoi: string
    pour_admin: string // instruction précise à appliquer dans Ads Manager
  }[]
}

const SYSTEME = `Tu es l'Agent Optimisation de CreatorX AI. Tu améliores les campagnes Meta
Click-to-WhatsApp de PME ivoiriennes.

À partir du brief, des stats quotidiennes et des signaux détectés, propose 2 à 4
ajustements CONCRETS parmi : changer l'accroche, élargir ou réduire le ciblage
(villes, âges, centres d'intérêt), redistribuer le budget, tester un autre visuel.

Pour chaque recommandation :
- "action" : formulation simple pour le client (tutoiement)
- "pourquoi" : explication en une phrase
- "pour_admin" : instruction précise et technique à appliquer dans Meta Ads Manager

Réponds UNIQUEMENT en JSON :
{"diagnostic":"1-2 phrases sur l'état de la campagne","recommandations":[{"action":"...","pourquoi":"...","pour_admin":"..."}]}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  try {
    const utilisateur = await utilisateurDepuisRequete(req)
    if (!utilisateur) return erreur('Connecte-toi pour continuer.', 401)

    const { campagne_id } = await req.json()
    const admin = clientAdmin()

    // Accessible au propriétaire de la campagne et à l'admin
    const { data: profil } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', utilisateur.id)
      .maybeSingle()

    let requete = admin.from('campagnes').select('*, produits(*)').eq('id', campagne_id)
    if (!profil?.is_admin) requete = requete.eq('user_id', utilisateur.id)
    const { data: campagne } = await requete.maybeSingle()
    if (!campagne) return erreur('Campagne introuvable.', 404)

    const stats = campagne.stats_quotidiennes ?? []
    if (!Array.isArray(stats) || stats.length === 0) {
      return erreur("Pas encore de statistiques : reviens après le premier jour de diffusion.", 400)
    }

    const resultat = await appelerClaudeJSON<Recommandations>({
      modele: modeleComplexe(),
      systeme: SYSTEME,
      message: `Produit : ${campagne.produits.nom} — ${campagne.produits.prix_fcfa} FCFA
Brief de la campagne : ${JSON.stringify(campagne.brief_genere ?? {})}
Budget client : ${campagne.budget_client_fcfa} FCFA sur ${campagne.duree_jours} jours
Stats quotidiennes (avec résumés et signaux) : ${JSON.stringify(stats)}`,
      maxTokens: 1500,
    })

    await admin
      .from('campagnes')
      .update({
        recommandations_optimisation: {
          ...resultat,
          genere_le: new Date().toISOString(),
        },
      })
      .eq('id', campagne_id)

    await admin.from('generations').insert({
      user_id: campagne.user_id,
      produit_id: campagne.produit_id,
      agent: 'optimisation',
      type: 'texte',
      prompt_utilise: `Optimisation campagne ${campagne_id}`,
      resultat_texte: JSON.stringify(resultat),
      credits_consommes: 0,
      cout_api_estime_fcfa: COUT_API_FCFA.claude_sonnet,
    })

    return json(resultat)
  } catch (e) {
    console.error('agent-optimisation:', e)
    return erreur("La génération des recommandations a échoué. Réessaie.", 500)
  }
})
