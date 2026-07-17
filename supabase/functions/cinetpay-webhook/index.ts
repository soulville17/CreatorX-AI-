// 💳 Edge Function `cinetpay-webhook`
// Notification de paiement CinetPay. Sécurité :
//  1. Vérification de la signature HMAC (en-tête x-token) si CINETPAY_SECRET_KEY est définie.
//  2. TOUJOURS re-vérification du statut réel via l'API /payment/check
//     (on ne fait jamais confiance au corps de la notification seul).
// Idempotent : un paiement déjà "confirme" n'est jamais re-crédité.

import { json, erreur } from '../_shared/http.ts'
import { clientAdmin, crediterCredits } from '../_shared/clients.ts'

const CHECK_URL = 'https://api-checkout.cinetpay.com/v2/payment/check'

/** Vérifie la signature HMAC-SHA256 envoyée par CinetPay dans l'en-tête x-token */
async function signatureValide(req: Request, corpsBrut: string): Promise<boolean> {
  const secret = Deno.env.get('CINETPAY_SECRET_KEY')
  if (!secret) return true // sandbox sans secret configuré : on s'appuie sur payment/check
  const tokenRecu = req.headers.get('x-token')
  if (!tokenRecu) return false

  const cle = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(corpsBrut))
  const hex = Array.from(new Uint8Array(signature))
    .map((o) => o.toString(16).padStart(2, '0'))
    .join('')
  return hex === tokenRecu.toLowerCase()
}

Deno.serve(async (req) => {
  try {
    const corpsBrut = await req.text()
    // CinetPay envoie du JSON ou du x-www-form-urlencoded selon le mode
    let reference: string | null = null
    try {
      const jsonCorps = JSON.parse(corpsBrut)
      reference = jsonCorps.cpm_trans_id ?? jsonCorps.transaction_id ?? null
    } catch {
      reference = new URLSearchParams(corpsBrut).get('cpm_trans_id')
    }
    if (!reference) return erreur('Notification incomplète.', 400)

    if (!(await signatureValide(req, corpsBrut))) {
      console.error('cinetpay-webhook: signature invalide pour', reference)
      return erreur('Signature invalide.', 401)
    }

    const admin = clientAdmin()
    const { data: paiement } = await admin
      .from('paiements')
      .select('*')
      .eq('reference_cinetpay', reference)
      .maybeSingle()
    if (!paiement) return erreur('Paiement inconnu.', 404)

    // Idempotence : déjà traité → on répond OK sans rien refaire
    if (paiement.statut === 'confirme') return json({ ok: true, deja_traite: true })

    // Re-vérification du statut réel auprès de CinetPay
    const verif = await fetch(CHECK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: Deno.env.get('CINETPAY_API_KEY'),
        site_id: Deno.env.get('CINETPAY_SITE_ID'),
        transaction_id: reference,
      }),
    })
    const etat = await verif.json()
    const accepte = etat.code === '00' && etat.data?.status === 'ACCEPTED'
    const refuse = etat.data?.status === 'REFUSED' || etat.code === '627'

    if (!accepte) {
      if (refuse) {
        await admin
          .from('paiements')
          .update({ statut: 'echoue' })
          .eq('id', paiement.id)
          .eq('statut', 'initie')
      }
      // Paiement encore en attente ou refusé : rien à créditer
      return json({ ok: true, statut: refuse ? 'echoue' : 'en_attente' })
    }

    // Verrou d'idempotence : seule la transition initie → confirme déclenche les effets
    const { data: verrouille } = await admin
      .from('paiements')
      .update({ statut: 'confirme' })
      .eq('id', paiement.id)
      .eq('statut', 'initie')
      .select()
      .maybeSingle()
    if (!verrouille) return json({ ok: true, deja_traite: true })

    if (paiement.type === 'credits' && paiement.pack_credits) {
      // Crédit du solde de l'utilisateur
      const { data: pack } = await admin
        .from('packs_credits')
        .select('credits')
        .eq('id', paiement.pack_credits)
        .maybeSingle()
      if (pack) await crediterCredits(admin, paiement.user_id, pack.credits)
    } else if (paiement.type === 'campagne' && paiement.campagne_id) {
      // La campagne passe en "payee" → apparaît dans la file de l'admin
      await admin
        .from('campagnes')
        .update({ statut: 'payee' })
        .eq('id', paiement.campagne_id)
        .eq('statut', 'brouillon')
    }

    return json({ ok: true, statut: 'confirme' })
  } catch (e) {
    console.error('cinetpay-webhook:', e)
    return erreur('Erreur de traitement de la notification.', 500)
  }
})
