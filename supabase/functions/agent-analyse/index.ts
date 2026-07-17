// 📊 Agent Analyse (`agent-analyse`)
// Transforme les stats quotidiennes d'une campagne (saisies par l'admin) en un
// résumé en langage humain pour le client + détecte les signaux d'alerte
// (coût par contact qui monte, audience saturée). Gratuit pour le client.
//
// Appelée par l'admin après la saisie des stats du jour.

import { json, erreur, preflight } from '../_shared/http.ts'
import { clientAdmin, utilisateurDepuisRequete } from '../_shared/clients.ts'
import { appelerClaudeJSON, modeleSimple } from '../_shared/anthropic.ts'
import { COUT_API_FCFA } from '../_shared/credits.ts'

interface StatJour {
  date: string
  portee: number
  clics: number
  conversations: number
  depense_fcfa: number
  resume_client?: string
  signaux?: string[]
}

const SYSTEME = `Tu es l'Agent Analyse de CreatorX AI. Tu expliques les résultats d'une campagne
publicitaire à une vendeuse ivoirienne qui n'a jamais fait de marketing.

Ton résumé : 2-3 phrases MAXIMUM, langage parlé simple, tutoiement, chiffres arrondis.
Exemple de ton attendu : "Ta pub a touché 12 400 personnes aujourd'hui, 87 t'ont écrit
sur WhatsApp. Chaque contact te coûte environ 290 FCFA, c'est un bon prix !"

Signaux à détecter (compare avec les jours précédents) :
- coût par conversation qui augmente nettement
- portée qui stagne (audience saturée)
- très peu de clics par rapport à la portée (pub peu attirante)

Réponds UNIQUEMENT en JSON : {"resume_client":"...","signaux":["..."]} (signaux vide si tout va bien)`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  try {
    const utilisateur = await utilisateurDepuisRequete(req)
    if (!utilisateur) return erreur('Connecte-toi pour continuer.', 401)

    const admin = clientAdmin()
    // Seul l'admin saisit les stats et déclenche l'analyse
    const { data: profil } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', utilisateur.id)
      .maybeSingle()
    if (!profil?.is_admin) return erreur('Accès réservé à l’administrateur.', 403)

    const { campagne_id, stat } = (await req.json()) as {
      campagne_id: string
      stat: StatJour
    }
    if (!stat?.date) return erreur('Statistiques du jour incomplètes.', 400)

    const { data: campagne } = await admin
      .from('campagnes')
      .select('*, produits(nom)')
      .eq('id', campagne_id)
      .maybeSingle()
    if (!campagne) return erreur('Campagne introuvable.', 404)

    const historique: StatJour[] = (campagne.stats_quotidiennes as StatJour[]) ?? []

    const analyse = await appelerClaudeJSON<{ resume_client: string; signaux: string[] }>({
      modele: modeleSimple(),
      systeme: SYSTEME,
      message: `Produit : ${campagne.produits.nom}. Budget client : ${campagne.budget_client_fcfa} FCFA sur ${campagne.duree_jours} jours.
Stats du jour (${stat.date}) : portée ${stat.portee}, clics ${stat.clics}, conversations WhatsApp ${stat.conversations}, dépense ${stat.depense_fcfa} FCFA.
Historique des jours précédents : ${JSON.stringify(historique.map((s) => ({ date: s.date, portee: s.portee, clics: s.clics, conversations: s.conversations, depense_fcfa: s.depense_fcfa })))}`,
      maxTokens: 600,
    })

    // Ajout (ou remplacement) de la stat du jour, enrichie du résumé
    const statEnrichie: StatJour = { ...stat, ...analyse }
    const nouvelles = [...historique.filter((s) => s.date !== stat.date), statEnrichie].sort(
      (a, b) => a.date.localeCompare(b.date)
    )

    await admin
      .from('campagnes')
      .update({ stats_quotidiennes: nouvelles })
      .eq('id', campagne_id)

    // Journalisation du coût API (imputée au propriétaire de la campagne)
    await admin.from('generations').insert({
      user_id: campagne.user_id,
      produit_id: campagne.produit_id,
      agent: 'analyse',
      type: 'texte',
      prompt_utilise: `Analyse du ${stat.date} — campagne ${campagne_id}`,
      resultat_texte: JSON.stringify(analyse),
      credits_consommes: 0,
      cout_api_estime_fcfa: COUT_API_FCFA.claude_haiku,
    })

    return json({ stat: statEnrichie })
  } catch (e) {
    console.error('agent-analyse:', e)
    return erreur("L'analyse des statistiques a échoué. Réessaie.", 500)
  }
})
