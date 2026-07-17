import { createClient } from '@supabase/supabase-js'

// Client Supabase côté navigateur.
// Utilise UNIQUEMENT la clé publique "anon" : la sécurité repose sur le RLS.
// Aucune clé API de fournisseur IA ne transite par le client.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // Message clair pour la configuration initiale
  console.error(
    'Configuration manquante : renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans ton fichier .env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Appelle une Edge Function Supabase avec le jeton de session de l'utilisateur.
 * Toutes les générations IA passent par ici (jamais de clé API côté client).
 */
export async function appelerFonction<T = unknown>(
  nom: string,
  corps: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nom, { body: corps })
  if (error) {
    // On essaie d'extraire le message d'erreur en français renvoyé par la fonction
    let message = "Une erreur s'est produite. Réessaie dans un instant."
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx) {
        const json = await ctx.json()
        if (json?.erreur) message = json.erreur
      }
    } catch {
      /* on garde le message générique */
    }
    throw new Error(message)
  }
  return data as T
}
