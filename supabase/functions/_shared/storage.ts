// Sauvegarde des contenus générés (images, vidéos, MP3) dans Supabase Storage.
// Les URLs fal.ai / ElevenLabs sont temporaires : on rapatrie toujours le fichier.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Télécharge un fichier distant et l'enregistre dans le bucket `generations`.
 * Retourne l'URL publique permanente.
 */
export async function sauvegarderDepuisUrl(
  admin: SupabaseClient,
  urlSource: string,
  chemin: string,
  contentType: string
): Promise<string> {
  const reponse = await fetch(urlSource)
  if (!reponse.ok) throw new Error('Impossible de récupérer le fichier généré')
  const donnees = new Uint8Array(await reponse.arrayBuffer())
  return sauvegarderOctets(admin, donnees, chemin, contentType)
}

/** Enregistre des octets dans le bucket `generations` et retourne l'URL publique */
export async function sauvegarderOctets(
  admin: SupabaseClient,
  donnees: Uint8Array,
  chemin: string,
  contentType: string
): Promise<string> {
  const { error } = await admin.storage
    .from('generations')
    .upload(chemin, donnees, { contentType, upsert: true })
  if (error) throw new Error("L'enregistrement du fichier a échoué")
  const { data } = admin.storage.from('generations').getPublicUrl(chemin)
  return data.publicUrl
}
