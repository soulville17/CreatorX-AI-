// 🎬 Agent Vidéo (`agent-video`)
// Vidéo publicitaire 15 s, format vertical 9:16, via fal.ai (Kling par défaut,
// Wan en mode économique — variable VIDEO_MODEL).
// File d'attente : action "lancer" soumet la vidéo, action "statut" interroge
// l'avancement ("Ta vidéo est en préparation, ~2 min").
// 20 crédits débités AVANT le lancement. Maximum 2 régénérations gratuites.

import { json, erreur, preflight } from '../_shared/http.ts'
import {
  clientAdmin,
  utilisateurDepuisRequete,
  debiterCredits,
  crediterCredits,
} from '../_shared/clients.ts'
import { soumettreVideo, statutVideo, modeleVideo } from '../_shared/fal.ts'
import { genererVoix, type GenreVoix, type TonVoix } from '../_shared/elevenlabs.ts'
import { sauvegarderDepuisUrl, sauvegarderOctets } from '../_shared/storage.ts'
import { COUT_CREDITS, COUT_API_FCFA, MAX_REGENERATIONS_VIDEO } from '../_shared/credits.ts'

const STYLES: Record<string, string> = {
  dynamique: 'rythme rapide, mouvements de caméra énergiques, ambiance urbaine vivante',
  elegant: 'mouvements lents et fluides, lumière douce et premium, ambiance raffinée',
  festif: 'ambiance de fête colorée, joie, énergie communicative',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  const admin = clientAdmin()
  try {
    const utilisateur = await utilisateurDepuisRequete(req)
    if (!utilisateur) return erreur('Connecte-toi pour continuer.', 401)

    const corps = await req.json()

    // ---------- ACTION "statut" : interroger la file d'attente ----------
    if (corps.action === 'statut') {
      const { data: generation } = await admin
        .from('generations')
        .select('*')
        .eq('id', corps.generation_id)
        .eq('user_id', utilisateur.id)
        .maybeSingle()
      if (!generation) return erreur('Vidéo introuvable.', 404)
      if (generation.statut === 'termine') {
        return json({ statut: 'termine', url: generation.resultat_url, metadonnees: generation.metadonnees })
      }
      if (generation.statut === 'echec') return json({ statut: 'echec' })

      const meta = generation.metadonnees as { fal_modele: string; fal_request_id: string; voix_url?: string }
      const etat = await statutVideo(meta.fal_modele, meta.fal_request_id)

      if (etat.statut === 'termine' && etat.url) {
        // Rapatrie la vidéo dans notre Storage (URL fal.ai temporaire)
        const chemin = `${utilisateur.id}/videos/${generation.id}.mp4`
        const urlPublique = await sauvegarderDepuisUrl(admin, etat.url, chemin, 'video/mp4')
        await admin
          .from('generations')
          .update({ statut: 'termine', resultat_url: urlPublique })
          .eq('id', generation.id)
        return json({ statut: 'termine', url: urlPublique, metadonnees: meta })
      }
      if (etat.statut === 'echec') {
        // Échec du fournisseur → remboursement automatique
        await admin.from('generations').update({ statut: 'echec' }).eq('id', generation.id)
        await crediterCredits(admin, utilisateur.id, generation.credits_consommes)
        return json({ statut: 'echec', rembourse: true })
      }
      return json({ statut: etat.statut, message: 'Ta vidéo est en préparation, ~2 min ⏳' })
    }

    // ---------- ACTION "lancer" (défaut) : soumettre une vidéo ----------
    const {
      produit_id,
      accroche,
      style = 'dynamique',
      avec_voix = false,
      texte_voix = '',
      genre_voix = 'femme',
      ton_voix = 'energique',
      regeneration_de = null, // id de la génération d'origine si régénération
    } = corps

    if (!accroche) return erreur("Choisis d'abord une accroche pour ta vidéo.", 400)

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
    if (!produit.photos?.length) {
      return erreur("Ajoute au moins une photo au produit pour créer une vidéo.", 400)
    }

    // Régénération : gratuite dans la limite de MAX_REGENERATIONS_VIDEO
    let gratuit = false
    if (regeneration_de) {
      const { count } = await admin
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', utilisateur.id)
        .contains('metadonnees', { regeneration_de })
      gratuit = (count ?? 0) < MAX_REGENERATIONS_VIDEO
    }

    // Contrôle des coûts : débit de 20 crédits AVANT tout appel fournisseur
    let debite = false
    if (!gratuit) {
      await debiterCredits(admin, utilisateur.id, COUT_CREDITS.video)
      debite = true
    }

    try {
      // Voix off optionnelle, générée d'abord (rapide)
      let voixUrl: string | null = null
      if (avec_voix && texte_voix) {
        const audio = await genererVoix({
          texte: texte_voix.slice(0, 600),
          genre: genre_voix as GenreVoix,
          ton: ton_voix as TonVoix,
        })
        const cheminVoix = `${utilisateur.id}/voix/${crypto.randomUUID()}.mp3`
        voixUrl = await sauvegarderOctets(admin, audio, cheminVoix, 'audio/mpeg')
      }

      const prompt = `Publicité produit verticale de 15 secondes : ${produit.nom}. ${STYLES[style] ?? STYLES.dynamique}. Texte incrusté à l'écran : "${accroche}" puis le prix "${produit.prix_fcfa} FCFA". Produit toujours net et mis en valeur, rendu professionnel.`

      const { requestId, modele } = await soumettreVideo({
        imageUrl: produit.photos[0],
        prompt,
      })

      const { nom: nomModele } = modeleVideo()
      const coutApi =
        (nomModele === 'wan' ? COUT_API_FCFA.video_wan_15s : COUT_API_FCFA.video_kling_15s) +
        (voixUrl ? COUT_API_FCFA.elevenlabs_voix : 0)

      const { data: generation } = await admin
        .from('generations')
        .insert({
          user_id: utilisateur.id,
          produit_id,
          agent: 'video',
          type: 'video',
          prompt_utilise: prompt,
          statut: 'en_attente',
          credits_consommes: gratuit ? 0 : COUT_CREDITS.video,
          cout_api_estime_fcfa: coutApi,
          metadonnees: {
            fal_modele: modele,
            fal_request_id: requestId,
            accroche,
            style,
            voix_url: voixUrl,
            regeneration_de: regeneration_de ?? undefined,
          },
        })
        .select()
        .single()

      return json({
        generation_id: generation?.id,
        statut: 'en_attente',
        gratuit,
        message: 'Ta vidéo est en préparation, ~2 min ⏳',
      })
    } catch (e) {
      // Échec de soumission → remboursement immédiat
      if (debite) await crediterCredits(admin, utilisateur.id, COUT_CREDITS.video)
      throw e
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'SOLDE_INSUFFISANT') {
      return erreur(
        'Il te faut 20 crédits pour une vidéo. Recharge ton solde pour continuer.',
        402
      )
    }
    console.error('agent-video:', e)
    return erreur('Le lancement de la vidéo a échoué. Tes crédits ont été rendus.', 500)
  }
})
