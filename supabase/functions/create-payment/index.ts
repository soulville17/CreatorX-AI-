// 💳 Edge Function `create-payment`
// Crée une transaction CinetPay (sandbox par défaut) pour :
//  - type "credits"  : achat d'un pack de crédits
//  - type "campagne" : paiement du budget d'une campagne
// Retourne l'URL de paiement (Wave / Orange Money / MTN / Moov).
// La confirmation ne se fait JAMAIS ici : uniquement via le webhook.

import { json, erreur, preflight } from '../_shared/http.ts'
import { clientAdmin, utilisateurDepuisRequete } from '../_shared/clients.ts'

const CINETPAY_URL = 'https://api-checkout.cinetpay.com/v2/payment'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  try {
    const utilisateur = await utilisateurDepuisRequete(req)
    if (!utilisateur) return erreur('Connecte-toi pour continuer.', 401)

    const apiKey = Deno.env.get('CINETPAY_API_KEY')
    const siteId = Deno.env.get('CINETPAY_SITE_ID')
    if (!apiKey || !siteId) {
      return erreur('Le paiement est en cours de configuration. Réessaie bientôt.', 503)
    }

    const { type, pack_id, campagne_id } = await req.json()
    const admin = clientAdmin()

    let montant = 0
    let description = ''
    let packId: string | null = null

    if (type === 'credits') {
      const { data: pack } = await admin
        .from('packs_credits')
        .select('*')
        .eq('id', pack_id)
        .maybeSingle()
      if (!pack) return erreur('Pack introuvable.', 404)
      montant = pack.prix_fcfa
      description = `CreatorX AI — Pack ${pack.nom} (${pack.credits} crédits)`
      packId = pack.id
    } else if (type === 'campagne') {
      const { data: campagne } = await admin
        .from('campagnes')
        .select('*')
        .eq('id', campagne_id)
        .eq('user_id', utilisateur.id)
        .maybeSingle()
      if (!campagne) return erreur('Campagne introuvable.', 404)
      if (campagne.statut !== 'brouillon') {
        return erreur('Cette campagne est déjà payée ou en cours.', 400)
      }
      montant = campagne.budget_client_fcfa
      description = `CreatorX AI — Campagne publicitaire (${campagne.duree_jours} jours)`
    } else {
      return erreur('Type de paiement inconnu.', 400)
    }

    // Référence unique — sert d'identifiant de transaction CinetPay et d'idempotence
    const reference = `CX-${crypto.randomUUID()}`
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

    const reponse = await fetch(CINETPAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: reference,
        amount: montant,
        currency: 'XOF',
        description,
        channels: 'MOBILE_MONEY', // Wave / Orange Money / MTN / Moov
        notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/cinetpay-webhook`,
        return_url: `${siteUrl}/paiement/retour?ref=${reference}`,
        lang: 'fr',
        metadata: JSON.stringify({ user_id: utilisateur.id, type }),
      }),
    })

    const data = await reponse.json()
    if (data.code !== '201' || !data.data?.payment_url) {
      console.error('Erreur CinetPay:', JSON.stringify(data))
      return erreur("Le service de paiement n'a pas répondu. Réessaie dans un instant.", 502)
    }

    // Enregistrement du paiement en attente (statut "initie")
    await admin.from('paiements').insert({
      user_id: utilisateur.id,
      type,
      montant_fcfa: montant,
      reference_cinetpay: reference,
      statut: 'initie',
      campagne_id: type === 'campagne' ? campagne_id : null,
      pack_credits: packId,
    })

    return json({ url_paiement: data.data.payment_url, reference })
  } catch (e) {
    console.error('create-payment:', e)
    return erreur('La création du paiement a échoué. Réessaie.', 500)
  }
})
