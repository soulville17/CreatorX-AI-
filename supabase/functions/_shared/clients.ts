// Clients Supabase côté serveur.
// - `clientAdmin` : service_role, contourne le RLS (réservé aux opérations serveur).
// - `utilisateurDepuisRequete` : identifie l'utilisateur à partir de son jeton.

import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

export function clientAdmin(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

/** Retourne l'utilisateur authentifié, ou null si le jeton est absent/invalide */
export async function utilisateurDepuisRequete(req: Request): Promise<User | null> {
  const jeton = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jeton) return null
  const admin = clientAdmin()
  const { data, error } = await admin.auth.getUser(jeton)
  if (error) return null
  return data.user
}

/**
 * Débite des crédits de façon atomique via la fonction SQL `debit_credits`.
 * Lance une erreur "SOLDE_INSUFFISANT" si le solde ne suffit pas.
 */
export async function debiterCredits(
  admin: SupabaseClient,
  userId: string,
  montant: number
): Promise<number> {
  const { data, error } = await admin.rpc('debit_credits', {
    p_user_id: userId,
    p_montant: montant,
  })
  if (error) {
    if (error.message.includes('SOLDE_INSUFFISANT')) {
      throw new Error('SOLDE_INSUFFISANT')
    }
    throw error
  }
  return data as number
}

/** Recrédite des crédits (échec de génération, remboursement) */
export async function crediterCredits(
  admin: SupabaseClient,
  userId: string,
  montant: number
): Promise<void> {
  await admin.rpc('credit_credits', { p_user_id: userId, p_montant: montant })
}
