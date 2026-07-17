// Utilitaires HTTP communs à toutes les Edge Functions.
// Réponses JSON + CORS, messages d'erreur en français simple.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

/** Réponse JSON avec les en-têtes CORS */
export function json(donnees: unknown, statut = 200): Response {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Réponse d'erreur en français simple (jamais de jargon technique) */
export function erreur(message: string, statut = 400): Response {
  return json({ erreur: message }, statut)
}

/** Réponse à la requête pré-vol CORS */
export function preflight(): Response {
  return new Response('ok', { headers: corsHeaders })
}
