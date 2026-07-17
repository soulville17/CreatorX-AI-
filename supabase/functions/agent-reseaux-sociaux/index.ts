// 📱 Agent Réseaux sociaux (`agent-reseaux-sociaux`)
// À partir d'une génération existante (visuel ou vidéo), produit les déclinaisons
// par plateforme : TikTok, Instagram (post + story), Facebook, YouTube Shorts,
// WhatsApp (statut + message de diffusion). 3 crédits par déclinaison complète.
//
// Les textes sont générés par Claude ; les recadrages sont décrits par plateforme
// (le fichier source 9:16 est fourni, l'interface propose les formats adaptés).

import { json, erreur, preflight } from '../_shared/http.ts'
import {
  clientAdmin,
  utilisateurDepuisRequete,
  debiterCredits,
  crediterCredits,
} from '../_shared/clients.ts'
import { appelerClaudeJSON, modeleSimple } from '../_shared/anthropic.ts'
import { COUT_CREDITS, COUT_API_FCFA } from '../_shared/credits.ts'

interface Declinaisons {
  tiktok: { legende: string; hashtags: string[] }
  instagram: { legende_post: string; texte_story: string }
  facebook: { texte_post: string }
  youtube_shorts: { titre: string; description: string }
  whatsapp: { statut: string; message_diffusion: string }
}

const SYSTEME = `Tu es l'Agent Réseaux sociaux de CreatorX AI. Tu adaptes un contenu publicitaire
pour chaque plateforme, pour une PME de Côte d'Ivoire.

Règles :
- TikTok : légende courte + 4-6 hashtags qui marchent en Côte d'Ivoire (#abidjan, #223, #civ...)
- Instagram : légende de post soignée + texte court pour story
- Facebook : texte plus long, storytelling léger, appel à l'action WhatsApp
- YouTube Shorts : titre accrocheur (max 90 caractères) + description
- WhatsApp : texte de statut très court + message de diffusion aux clients fidèles
- Prix en FCFA, ton chaleureux ivoirien, émojis avec modération

Réponds UNIQUEMENT en JSON :
{"tiktok":{"legende":"...","hashtags":["..."]},"instagram":{"legende_post":"...","texte_story":"..."},"facebook":{"texte_post":"..."},"youtube_shorts":{"titre":"...","description":"..."},"whatsapp":{"statut":"...","message_diffusion":"..."}}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  const admin = clientAdmin()
  let userId: string | null = null
  let debite = false
  try {
    const utilisateur = await utilisateurDepuisRequete(req)
    if (!utilisateur) return erreur('Connecte-toi pour continuer.', 401)
    userId = utilisateur.id

    const { generation_id } = await req.json()

    // La génération source (visuel ou vidéo) doit appartenir à l'utilisateur
    const { data: source } = await admin
      .from('generations')
      .select('*, produits(*)')
      .eq('id', generation_id)
      .eq('user_id', utilisateur.id)
      .maybeSingle()
    if (!source) return erreur('Contenu introuvable. Génère d’abord un visuel ou une vidéo.', 404)
    if (!['visuel', 'video'].includes(source.type)) {
      return erreur('Choisis un visuel ou une vidéo à décliner.', 400)
    }

    const produit = source.produits
    await debiterCredits(admin, utilisateur.id, COUT_CREDITS.declinaison)
    debite = true

    const declinaisons = await appelerClaudeJSON<Declinaisons>({
      modele: modeleSimple(),
      systeme: SYSTEME,
      message: `Produit : ${produit.nom} — ${produit.description} — ${produit.prix_fcfa} FCFA.
Contenu source : ${source.type} publicitaire (accroche : ${source.metadonnees?.accroche ?? 'non précisée'}).
Analyse marketing : ${JSON.stringify(produit.analyse_marketing ?? {})}`,
      maxTokens: 1800,
    })

    // Formats recommandés par plateforme (recadrage à partir du 9:16 source)
    const formats = {
      tiktok: '9:16',
      instagram_post: '1:1',
      instagram_story: '9:16',
      facebook: '4:5',
      youtube_shorts: '9:16',
      whatsapp_statut: '9:16',
    }

    const { data: generation } = await admin
      .from('generations')
      .insert({
        user_id: utilisateur.id,
        produit_id: source.produit_id,
        agent: 'reseaux_sociaux',
        type: 'declinaison',
        prompt_utilise: `Déclinaison de la génération ${generation_id}`,
        resultat_url: source.resultat_url,
        resultat_texte: JSON.stringify(declinaisons),
        credits_consommes: COUT_CREDITS.declinaison,
        cout_api_estime_fcfa: COUT_API_FCFA.claude_haiku,
        metadonnees: { source_generation_id: generation_id, formats },
      })
      .select()
      .single()

    return json({ declinaisons, formats, generation_id: generation?.id })
  } catch (e) {
    if (debite && userId) await crediterCredits(admin, userId, COUT_CREDITS.declinaison)
    if (e instanceof Error && e.message === 'SOLDE_INSUFFISANT') {
      return erreur("Ton solde de crédits est insuffisant. Recharge pour continuer.", 402)
    }
    console.error('agent-reseaux-sociaux:', e)
    return erreur('La déclinaison a échoué. Tes crédits ont été rendus.', 500)
  }
})
