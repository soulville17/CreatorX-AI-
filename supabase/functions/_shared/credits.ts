// Barème des crédits côté SERVEUR — source de vérité pour les débits.
// (Le fichier src/lib/credits.ts côté client sert uniquement à l'affichage.)

export const COUT_CREDITS = {
  texte: 1,
  visuel: 3,
  voix: 2,
  video: 20,
  declinaison: 3,
} as const

export const MAX_REGENERATIONS_VIDEO = 2

// Coûts API estimés en FCFA, loggés dans generations.cout_api_estime_fcfa
// pour le tableau de rentabilité de l'admin.
export const COUT_API_FCFA = {
  claude_haiku: 8, // génération de texte simple
  claude_sonnet: 15, // brief ou analyse complexe
  flux_schnell: 2, // brouillon d'image
  flux_pro: 30, // image finale
  video_kling_15s: 900, // ~0,10 $/s × 15 s
  video_wan_15s: 450, // ~0,05 $/s × 15 s
  elevenlabs_voix: 60, // voix off ~30 s
} as const
