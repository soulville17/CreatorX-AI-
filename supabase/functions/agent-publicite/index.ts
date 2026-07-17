// 📢 Agent Publicité (`agent-publicite`)
// Produit un brief JSON structuré pour une campagne Click-to-WhatsApp :
// ciblage (villes CI/UEMOA, genre, âges, centres d'intérêt Meta réels en anglais),
// textes, budget quotidien Meta (65% du budget client / durée) et checklist de
// lancement manuel pour l'admin. Stocké dans campagnes.brief_genere.
// Phase 2 : metaAdsService branchera la Meta Marketing API.

import { json, erreur, preflight } from '../_shared/http.ts'
import { clientAdmin, utilisateurDepuisRequete } from '../_shared/clients.ts'
import { appelerClaudeJSON, modeleComplexe } from '../_shared/anthropic.ts'
import { COUT_API_FCFA } from '../_shared/credits.ts'
import type { BriefCampagne } from '../_shared/metaAdsService.ts'

const PART_BUDGET_META = 0.65

const SYSTEME = `Tu es l'Agent Publicité de CreatorX AI. Tu prépares des briefs de campagnes
Meta (Facebook/Instagram) au format Click-to-WhatsApp pour des PME de Côte d'Ivoire.

Règles :
- Villes : Côte d'Ivoire et zone UEMOA uniquement (Abidjan, Bouaké, Yamoussoukro, San-Pedro, Daloa, ...)
- interets_meta : centres d'intérêt Meta RÉELS, en ANGLAIS, utilisables tels quels dans Ads Manager
  (ex. "Online shopping", "Fashion accessories", "Hair care")
- texte_principal : texte de la pub en français simple, appel à l'action WhatsApp
- accroches : 3 accroches courtes et percutantes
- checklist_lancement : étapes numérotées TRÈS précises pour lancer la campagne à la main dans
  Meta Ads Manager (objectif Engagement > Messages WhatsApp, budget, ciblage, placement, création)

Réponds UNIQUEMENT en JSON :
{"ciblage":{"villes":["..."],"genre":"tous|femmes|hommes","age_min":18,"age_max":55,"interets_meta":["..."]},
"texte_principal":"...","accroches":["...","...","..."],"checklist_lancement":["1. ...","2. ..."]}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  try {
    const utilisateur = await utilisateurDepuisRequete(req)
    if (!utilisateur) return erreur('Connecte-toi pour continuer.', 401)

    const { campagne_id } = await req.json()
    const admin = clientAdmin()

    const { data: campagne } = await admin
      .from('campagnes')
      .select('*, produits(*)')
      .eq('id', campagne_id)
      .eq('user_id', utilisateur.id)
      .maybeSingle()
    if (!campagne) return erreur('Campagne introuvable.', 404)

    const produit = campagne.produits
    if (produit.statut_moderation !== 'approuve') {
      return erreur("Ce produit n'est pas approuvé : impossible de lancer une campagne.", 400)
    }

    const budgetMeta = Math.round(campagne.budget_client_fcfa * PART_BUDGET_META)
    const budgetQuotidien = Math.round(budgetMeta / campagne.duree_jours)

    const propositions = await appelerClaudeJSON<{
      ciblage: BriefCampagne['ciblage']
      texte_principal: string
      accroches: string[]
      checklist_lancement: string[]
    }>({
      modele: modeleComplexe(),
      systeme: SYSTEME,
      message: `Produit : ${produit.nom} — ${produit.description} — ${produit.prix_fcfa} FCFA
Analyse marketing : ${JSON.stringify(produit.analyse_marketing ?? {})}
Souhaits du client : villes ${JSON.stringify(campagne.ciblage_villes)}, genre ${campagne.ciblage_genre}, âges ${campagne.ciblage_age_min}-${campagne.ciblage_age_max}
Budget client : ${campagne.budget_client_fcfa} FCFA sur ${campagne.duree_jours} jours
Budget Meta réel : ${budgetMeta} FCFA (soit ${budgetQuotidien} FCFA/jour)`,
      maxTokens: 2000,
    })

    const brief: BriefCampagne = {
      produit: produit.nom,
      format: 'Click-to-WhatsApp',
      ciblage: propositions.ciblage,
      texte_principal: propositions.texte_principal,
      accroches: propositions.accroches,
      budget_quotidien_meta_fcfa: budgetQuotidien,
      duree_jours: campagne.duree_jours,
      checklist_lancement: propositions.checklist_lancement,
    }

    await admin
      .from('campagnes')
      .update({
        brief_genere: brief,
        budget_meta_fcfa: budgetMeta,
        ciblage_villes: propositions.ciblage.villes,
        ciblage_genre: propositions.ciblage.genre,
        ciblage_age_min: propositions.ciblage.age_min,
        ciblage_age_max: propositions.ciblage.age_max,
        ciblage_interets: propositions.ciblage.interets_meta,
      })
      .eq('id', campagne_id)

    // Journalisation du coût API (le brief est inclus dans la campagne, 0 crédit)
    await admin.from('generations').insert({
      user_id: utilisateur.id,
      produit_id: campagne.produit_id,
      agent: 'publicite',
      type: 'texte',
      prompt_utilise: `Brief de campagne ${campagne_id}`,
      resultat_texte: JSON.stringify(brief),
      credits_consommes: 0,
      cout_api_estime_fcfa: COUT_API_FCFA.claude_sonnet,
    })

    return json({ brief })
  } catch (e) {
    console.error('agent-publicite:', e)
    return erreur('La préparation de ta campagne a échoué. Réessaie.', 500)
  }
})
