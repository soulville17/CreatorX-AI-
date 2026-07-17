// Agent invisible : Modération (`moderate-product`)
// Appelé automatiquement à la création de tout produit.
// Claude avec vision : refuse contrefaçons, produits "miracle" ou éclaircissants
// interdits par Meta, contenu adulte, armes, médicaments.
// En cas de doute → file de modération manuelle admin (statut reste en_attente).

import { json, erreur, preflight } from '../_shared/http.ts'
import { clientAdmin, utilisateurDepuisRequete } from '../_shared/clients.ts'
import { appelerClaudeJSON, modeleSimple } from '../_shared/anthropic.ts'

interface VerdictModeration {
  verdict: 'approuve' | 'rejete' | 'doute'
  raison: string
}

const SYSTEME = `Tu es le modérateur de CreatorX AI, une plateforme publicitaire pour PME en Côte d'Ivoire.
Tu examines un produit (nom, description, prix, photos) et tu décides s'il peut être publié.

REFUSE ("rejete") :
- contrefaçons évidentes (fausses marques de luxe, logos imités)
- produits de santé "miracle" (perte de poids magique, agrandissements, cures miracles)
- produits éclaircissants pour la peau (interdits par Meta)
- contenu adulte ou suggestif
- armes, munitions, objets dangereux
- médicaments et compléments nécessitant une ordonnance
- alcool fort, tabac, drogues

APPROUVE ("approuve") : tout commerce légitime (mode, cosmétiques ordinaires, nourriture,
services, immobilier, véhicules, formations...).

DOUTE ("doute") : si tu n'es pas sûr, ne devine pas.

Réponds UNIQUEMENT en JSON : {"verdict": "approuve" | "rejete" | "doute", "raison": "..."}
La raison doit être en français très simple, compréhensible par une vendeuse, sans jargon.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  try {
    const utilisateur = await utilisateurDepuisRequete(req)
    if (!utilisateur) return erreur('Connecte-toi pour continuer.', 401)

    const { produit_id } = await req.json()
    if (!produit_id) return erreur('Produit introuvable.', 400)

    const admin = clientAdmin()
    const { data: produit } = await admin
      .from('produits')
      .select('*')
      .eq('id', produit_id)
      .eq('user_id', utilisateur.id)
      .maybeSingle()
    if (!produit) return erreur('Produit introuvable.', 404)

    const verdict = await appelerClaudeJSON<VerdictModeration>({
      modele: modeleSimple(),
      systeme: SYSTEME,
      message: `Produit à modérer :\n- Nom : ${produit.nom}\n- Description : ${produit.description}\n- Prix : ${produit.prix_fcfa} FCFA\nLes photos du produit sont jointes.`,
      images: (produit.photos ?? []).slice(0, 3),
      maxTokens: 512,
    })

    // "doute" → reste en_attente : file de modération manuelle de l'admin
    const statut =
      verdict.verdict === 'approuve'
        ? 'approuve'
        : verdict.verdict === 'rejete'
          ? 'rejete'
          : 'en_attente'

    await admin
      .from('produits')
      .update({
        statut_moderation: statut,
        raison_rejet: verdict.verdict === 'rejete' ? verdict.raison : null,
      })
      .eq('id', produit_id)

    return json({ statut, raison: verdict.raison })
  } catch (e) {
    console.error('moderate-product:', e)
    return erreur('La vérification du produit a échoué. Réessaie.', 500)
  }
})
