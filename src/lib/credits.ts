// Barème des crédits — calibré sur les coûts API réels.
// Doit rester synchronisé avec supabase/functions/_shared/credits.ts (côté serveur).

export const COUT_CREDITS = {
  texte: 1, // 1 génération de texte (3 variantes) = 1 crédit
  visuel: 3, // 1 visuel publicitaire = 3 crédits
  voix: 2, // 1 voix off = 2 crédits
  video: 20, // 1 vidéo 15 s (voix incluse en option) = 20 crédits
  declinaison: 3, // 1 déclinaison réseaux sociaux complète = 3 crédits
} as const

// Bonus offert à l'inscription
export const CREDITS_BIENVENUE = 5

// Nombre maximum de régénérations gratuites par vidéo
export const MAX_REGENERATIONS_VIDEO = 2

// Budgets de campagne proposés (FCFA) — budget libre possible à partir de 10 000
export const BUDGETS_CAMPAGNE = [10000, 25000, 50000]
export const BUDGET_CAMPAGNE_MIN = 10000

// Part du budget client réellement envoyée à Meta (le reste couvre CinetPay + service)
export const PART_BUDGET_META = 0.65

/** Formate un montant en FCFA : 15000 → "15 000 FCFA" */
export function formaterFCFA(montant: number): string {
  return `${montant.toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`
}
